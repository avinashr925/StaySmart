"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { messagesApi, listingsApi, bookingsApi } from "@/services/api";
import { io, Socket } from "socket.io-client";
import { Send, User as UserIcon, MessageSquare, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "@/components/Avatar";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";

interface IConversation {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  listing?: {
    _id: string;
    title: string;
    images: string[];
  };
  lastMessage: string;
  lastMessageTime: string | null;
  isUnread: boolean;
}

interface IMessage {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar: string;
  };
  receiver: {
    _id: string;
    name: string;
  };
  message: string;
  attachments?: string[];
  createdAt: string;
}

function MessagesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hostId = searchParams.get("hostId");
  const listingId = searchParams.get("listingId");
  const initialSearchHandled = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to continue.");
      router.push("/login");
    }
  }, [user, authLoading]);
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Booking Context states
  const [chatBooking, setChatBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const QUICK_REPLIES = [
    "Hello! Is this property available for my selected dates?",
    "What are the check-in and check-out times?",
    "Is parking available on site?",
    "Thank you so much! Looking forward to my stay.",
  ];

  const [showQuickReplies, setShowQuickReplies] = useState(true);

  // Auto-collapse when user types
  useEffect(() => {
    if (newMessage.trim() !== "") {
      setShowQuickReplies(false);
    }
  }, [newMessage]);

  const handleQuickReplyClick = (replyText: string) => {
    setNewMessage(replyText);
  };

  useEffect(() => {
    if (selectedConv?.listing?._id && selectedConv?.user?._id) {
      setLoadingBooking(true);
      bookingsApi.getChatContext(selectedConv.listing._id, selectedConv.user._id)
        .then((res) => {
          if (res.status === "success") {
            setChatBooking(res.data.booking);
          } else {
            setChatBooking(null);
          }
        })
        .catch(() => setChatBooking(null))
        .finally(() => setLoadingBooking(false));
    } else {
      setChatBooking(null);
    }
  }, [selectedConv]);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // 1) Initialize WebSockets
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("accessToken");
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.emit("join", user.id);

    // Socket message events
    socket.on("newMessage", (msg: IMessage) => {
      // If message is from currently selected user and matches the selected listing, append to logs
      const msgListingId = (msg as any).listing?._id || (msg as any).listing;
      const selectedListingId = selectedConv?.listing?._id;
      const matchesSelectedChat = selectedConv && 
        (msg.sender._id === selectedConv.user._id || msg.receiver._id === selectedConv.user._id) &&
        (msgListingId === selectedListingId);

      if (matchesSelectedChat) {
        setMessages((prev) => [...prev, msg]);
        messagesApi.markAsRead(selectedConv.user._id);
      }
      
      // Refresh conversations list
      loadConversations();
    });

    // Sockets typing state events
    socket.on("typing", ({ senderId }: { senderId: string }) => {
      if (selectedConv && senderId === selectedConv.user._id) {
        setPartnerTyping(true);
      }
    });

    socket.on("stopTyping", ({ senderId }: { senderId: string }) => {
      if (selectedConv && senderId === selectedConv.user._id) {
        setPartnerTyping(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, selectedConv]);

  // 2) Load conversations list
  const loadConversations = async () => {
    try {
      const res = await messagesApi.getConversations();
      if (res.status === "success") {
        const convs = res.data.conversations;
        setConversations(convs);
        await initChat(convs);
      }
    } catch (err) {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const initChat = async (convs: IConversation[]) => {
    if (initialSearchHandled.current) return;
    initialSearchHandled.current = true;

    if (!hostId || !listingId) return;

    const match = convs.find(
      (c) => c.user._id === hostId && c.listing?._id === listingId
    );

    if (match) {
      setSelectedConv(match);
    } else {
      try {
        const listRes = await listingsApi.getOne(listingId);
        if (listRes.status === "success" && listRes.data?.listing) {
          const l = listRes.data.listing;
          const tempConv: IConversation = {
            user: {
              _id: hostId,
              name: l.owner.name || "Host",
              email: l.owner.email || "",
              avatar: l.owner.avatar || "",
              role: "Host",
            },
            listing: {
              _id: l._id,
              title: l.title,
              images: l.images || [],
            },
            lastMessage: "Start a new conversation thread...",
            lastMessageTime: null,
            isUnread: false,
          };
          setConversations((prev) => [tempConv, ...prev]);
          setSelectedConv(tempConv);
        }
      } catch (err) {
        console.error("Failed to load temporary listing information for chat", err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // 3) Load selected user's chat logs
  useEffect(() => {
    if (!user || !selectedConv) return;

    const fetchHistory = async () => {
      try {
        const res = await messagesApi.getHistory(selectedConv.user._id, selectedConv.listing?._id);
        if (res.status === "success") {
          setMessages(res.data.messages);
          await messagesApi.markAsRead(selectedConv.user._id);
        }
      } catch (err) {
        toast.error("Failed to load message log");
      }
    };

    fetchHistory();
    setPartnerTyping(false);
  }, [selectedConv, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedConv) return;
    const file = e.target.files[0];
    
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("attachment", file);

    setUploadingAttachment(true);
    const uploadToastId = toast.loading("Uploading attachment...");
    try {
      const res = await messagesApi.uploadAttachment(formData);
      if (res.status === "success" && res.data?.url) {
        toast.success("Attachment uploaded successfully!", { id: uploadToastId });
        
        // Auto-send message with the attachment url
        const sendRes = await messagesApi.sendMessage({
          receiverId: selectedConv.user._id,
          message: `Shared an attachment: ${res.data.fileName || file.name}`,
          attachments: [res.data.url],
          listingId: selectedConv.listing?._id,
        });

        if (sendRes.status === "success") {
          setMessages((prev) => [...prev, sendRes.data.message]);
          loadConversations();
        } else {
          toast.error("Failed to send attachment message.");
        }
      } else {
        toast.error(res.message || "Failed to upload attachment.", { id: uploadToastId });
      }
    } catch (err: any) {
      toast.error("Error uploading file attachment.", { id: uploadToastId });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 4) Send message trigger
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !user) return;

    // Stop typing immediately
    if (socketRef.current) {
      socketRef.current.emit("stopTyping", { senderId: user.id, receiverId: selectedConv.user._id });
    }
    setIsTyping(false);

    try {
      const res = await messagesApi.sendMessage({
        receiverId: selectedConv.user._id,
        message: newMessage.trim(),
        listingId: selectedConv.listing?._id,
      });
      if (res.status === "success") {
        setMessages((prev) => [...prev, res.data.message]);
        setNewMessage("");
        loadConversations();
      }
    } catch (err) {
      toast.error("Message delivery failed");
    }
  };

  // 5) Handle user typing key strokes
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!socketRef.current || !selectedConv || !user) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit("typing", { senderId: user.id, receiverId: selectedConv.user._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stopTyping", { senderId: user.id, receiverId: selectedConv.user._id });
      setIsTyping(false);
    }, 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold font-outfit mb-2">Access Restrained</h2>
          <p className="text-zinc-500 max-w-sm mb-4">Please log in to view and exchange messages with Hosts/Guests.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />
      
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
        {/* Conversations List Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold font-outfit text-lg">Inbox Threads</h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {loading ? (
              <div className="p-6 text-center text-zinc-400">Syncing chat histories...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-zinc-300" />
                <p>No active conversations yet.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={`${conv.user._id}_${conv.listing?._id || "none"}`}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                    selectedConv?.user._id === conv.user._id
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  }`}
                >
                  <UserAvatar user={conv.user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate dark:text-zinc-200">{conv.user.name}</span>
                      {conv.isUnread && (
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs truncate mt-0.5">{conv.lastMessage}</p>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      {conv.user.role}
                    </span>
                    {conv.listing && (
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5 truncate uppercase">
                        {conv.listing.title}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Thread Panel */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900">
                <UserAvatar user={selectedConv.user} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm dark:text-zinc-200">{selectedConv.user.name}</h4>
                    <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium">
                      {selectedConv.user.role}
                    </span>
                  </div>
                  {selectedConv.listing && (
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase mt-0.5">
                      Regarding: {selectedConv.listing.title}
                    </p>
                  )}
                </div>
              </div>

              {/* Active Booking Context Card */}
              {chatBooking && (
                <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border-b border-indigo-100 dark:border-indigo-900/40 p-3 px-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-outfit text-zinc-700 dark:text-zinc-300">Active Booking:</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {new Date(chatBooking.startDate).toLocaleDateString()} - {new Date(chatBooking.endDate).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                      chatBooking.status === "Confirmed" 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                    }`}>
                      {chatBooking.status}
                    </span>
                    <span className="font-bold text-indigo-650 dark:text-indigo-400">₹{chatBooking.totalPrice.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => router.push(`/listings/${selectedConv.listing?._id}`)}
                    className="font-bold text-indigo-600 hover:text-indigo-850 hover:underline transition cursor-pointer"
                  >
                    View Listing
                  </button>
                </div>
              )}

              {/* Chat Message Logs */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/30 dark:bg-zinc-900/30">
                {messages.map((msg) => {
                  const isOwn = msg.sender._id === user.id;
                  return (
                    <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        {!isOwn && (
                          <UserAvatar user={msg.sender} size="sm" />
                        )}
                        <div>
                          <div
                            className={`p-3 rounded-2xl text-sm shadow-sm ${
                              isOwn
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-100 dark:border-zinc-800"
                            }`}
                          >
                            <div>{msg.message}</div>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/20 dark:border-zinc-700/40 space-y-1 text-xs">
                                {msg.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block font-semibold underline truncate max-w-xs opacity-90 hover:opacity-100"
                                  >
                                    📎 File: {att.split('/').pop() || `Attachment ${idx + 1}`}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] text-zinc-400 block mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Partner Typing Bubble */}
                {partnerTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 items-center">
                      <UserAvatar user={selectedConv.user} size="sm" />
                      <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-1">
                        <span>typing</span>
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Polished Quick Replies Panel */}
              <div className="border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 shrink-0">
                <div className="px-4 py-1.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850/50">
                  <span className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1">
                    ✨ Quick replies
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className="text-[9px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-bold transition cursor-pointer"
                  >
                    {showQuickReplies ? "Hide" : "Show"}
                  </button>
                </div>
                
                {showQuickReplies && (
                  <div className="p-2 flex gap-2 overflow-x-auto scrollbar-thin">
                    {QUICK_REPLIES.map((replyText, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => handleQuickReplyClick(replyText)}
                        className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 text-[10px] font-medium rounded-full border border-zinc-200 dark:border-zinc-700/60 transition hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/20 dark:hover:border-indigo-850 cursor-pointer shadow-xs"
                      >
                        {replyText}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Input Footer */}
              <form onSubmit={handleSend} className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAttachmentUpload}
                  className="hidden"
                  accept="image/*,application/pdf,text/*"
                  disabled={uploadingAttachment}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/80 flex items-center justify-center disabled:opacity-50"
                  title="Attach File"
                >
                  📎
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={handleTyping}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none outline-none px-4 py-2.5 rounded-full text-sm dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-full flex-shrink-0 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
              <MessageSquare className="w-16 h-16 text-zinc-300 dark:text-zinc-800 mb-4" />
              <h3 className="font-bold text-lg dark:text-zinc-300">No Chat Selected</h3>
              <p className="text-sm text-zinc-500 max-w-xs mt-1">Select an active conversation to begin swapping messages instantly.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
