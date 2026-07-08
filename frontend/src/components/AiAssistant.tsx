"use client";

import React, { useState, useRef, useEffect } from "react";
import { aiApi } from "@/services/api";
import { MessageSquare, X, Send, Sparkles, User, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface IMessage {
  role: "user" | "model";
  text: string;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<IMessage[]>([
    {
      role: "model",
      text: "Hello! I am StaySmart AI, your personal vacation planner. 🌟 I can help you search properties, plan travel itineraries, or check local prices. Try asking: 'Recommend some nice beachfront cottages in Malibu'!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      // Map history format: { role: 'user'|'model', parts: text }
      const apiHistory = messages.map((m) => ({
        role: m.role,
        parts: m.text,
      }));

      const res = await aiApi.chat(userText, apiHistory);
      if (res.status === "success" && res.data.response) {
        setMessages((prev) => [...prev, { role: "model", text: res.data.response }]);
      } else {
        throw new Error(res.message || "Failed to fetch response");
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "I apologize, but I encountered an error. Please check your network connection or ensure the backend AI service is online.",
        },
      ]);
      toast.error("AI chat failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            className="w-80 sm:w-96 h-[500px] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col mb-4 transition-colors"
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
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      msg.role === "user"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                        : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  </div>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm border ${
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
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 dark:bg-indigo-950 p-1.5 rounded-lg text-indigo-500">
                    <Sparkles className="h-3 w-3 animate-spin" />
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-850 px-4 py-2.5 rounded-2xl text-xs text-zinc-400 border border-zinc-100 dark:border-zinc-800 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="p-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 transition"
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
        className="p-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group focus:outline-none"
        aria-label="Ask AI Assistant"
      >
        <MessageSquare className="h-6 w-6 group-hover:rotate-6 transition-transform" />
      </button>
    </div>
  );
}
