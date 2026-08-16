"use client";

import React, { useState, useRef, useEffect } from "react";
import { aiApi } from "@/services/api";
import { MessageSquare, X, Send, Sparkles, User, ShieldAlert, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface IMessage {
  role: "user" | "model";
  text: string;
}

const SUGGESTIONS = [
  "What can you help me with?",
  "Find me a beach stay.",
  "Suggest a 3-day itinerary for Goa."
];

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<IMessage[]>([
    {
      role: "model",
      text: "Hello! I am StaySmart AI, your personal vacation planner. 🌟 I can help you search properties, plan travel itineraries, or check local prices. Try asking one of the suggestions below!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, loading]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || loading) return;

    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setLoading(true);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);

    try {
      // Map history format: { role: 'user'|'model', parts: text }
      const apiHistory = messages.map((m) => ({
        role: m.role,
        parts: m.text,
      }));

      const res = await aiApi.chat(textToSend, apiHistory);
      if (res.status === "success" && res.data.response) {
        setMessages((prev) => [...prev, { role: "model", text: res.data.response }]);
        if (res.data.isFallback) {
          setIsFallbackMode(true);
        } else {
          setIsFallbackMode(false);
        }
      } else {
        throw new Error(res.message || "Failed to fetch response");
      }
    } catch (err: any) {
      console.error("AI assistant endpoint failure:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Sorry, I'm having trouble connecting to the AI assistant right now. Please try again.",
        },
      ]);
      toast.error("AI chat failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "model",
        text: "Hello! I am StaySmart AI, your personal vacation planner. 🌟 I can help you search properties, plan travel itineraries, or check local prices. Try asking one of the suggestions below!",
      },
    ]);
    setIsFallbackMode(false);
    toast.success("Chat history cleared!");
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            className="w-[340px] sm:w-[400px] h-[550px] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col mb-4 transition-colors"
            role="dialog"
            aria-label="AI Assistant"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
                <div>
                  <h3 className="font-outfit font-bold text-sm">StaySmart AI Assistant</h3>
                  <span className="text-[10px] opacity-80">Powered by Gemini Pro</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearChat}
                  title="Clear Conversation"
                  className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                  aria-label="Clear Chat History"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                  aria-label="Close Assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Fallback Warning Banner */}
            {isFallbackMode && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium shrink-0">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 shrink-0" />
                <span>Gemini API Key unconfigured. Operating in Local Fallback Mode.</span>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin flex flex-col">
              {messages.length === 1 && !loading ? (
                /* Premium Starter Splash UI */
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-5 select-none my-auto flex-1">
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-3xl animate-pulse shadow-sm border border-indigo-100/50 dark:border-indigo-900/30">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center justify-center gap-1.5">
                      ✨ What can I help you with?
                    </h3>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1 max-w-[240px] mx-auto leading-relaxed">
                      Ask StaySmart AI to locate properties, plan vacation itineraries, or analyze regional prices.
                    </p>
                  </div>
                  
                  <div className="w-full space-y-2 max-w-[280px]">
                    <button
                      onClick={() => handleSend(undefined, "Help me find a beautiful vacation stay in Goa.")}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/20 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-left flex items-center gap-3 transition cursor-pointer shadow-xs"
                    >
                      <span className="text-sm">🏠</span>
                      <div>
                        <div className="font-bold text-[10px] text-zinc-800 dark:text-zinc-200">Find a stay</div>
                        <div className="text-[9px] text-zinc-450 dark:text-zinc-500 font-normal mt-0.5">Beach houses, cottages, and cabins</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSend(undefined, "Suggest a 3-day itinerary for a Goa vacation.")}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/20 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-left flex items-center gap-3 transition cursor-pointer shadow-xs"
                    >
                      <span className="text-sm">🗺️</span>
                      <div>
                        <div className="font-bold text-[10px] text-zinc-800 dark:text-zinc-200">Plan a trip</div>
                        <div className="text-[9px] text-zinc-450 dark:text-zinc-500 font-normal mt-0.5">Get custom daily trip schedules</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSend(undefined, "Compare prices of vacation stays in Mumbai.")}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/20 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-left flex items-center gap-3 transition cursor-pointer shadow-xs"
                    >
                      <span className="text-sm">💰</span>
                      <div>
                        <div className="font-bold text-[10px] text-zinc-800 dark:text-zinc-200">Compare prices</div>
                        <div className="text-[9px] text-zinc-450 dark:text-zinc-500 font-normal mt-0.5">Analyze and estimate property rates</div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          msg.role === "user"
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                            : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      </div>
                      <div
                        className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm border ${
                          msg.role === "user"
                            ? "bg-rose-500 text-white border-transparent"
                            : "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex items-center gap-2.5">
                      <div className="bg-indigo-100 dark:bg-indigo-950 p-1.5 rounded-lg text-indigo-500">
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 rounded-2xl text-xs text-zinc-400 border border-zinc-100 dark:border-zinc-800 flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 items-end bg-white dark:bg-zinc-900 shrink-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything... (Shift+Enter for newline)"
                className="flex-1 px-4 py-2.5 text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none max-h-24 min-h-[38px] scrollbar-thin"
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="p-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 transition cursor-pointer"
                aria-label="Send Message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group focus:outline-none cursor-pointer"
        aria-label="Ask AI Assistant"
        id="ai-assistant-trigger"
      >
        <MessageSquare className="h-6 w-6 group-hover:rotate-6 transition-transform" />
      </button>
    </div>
  );
}
