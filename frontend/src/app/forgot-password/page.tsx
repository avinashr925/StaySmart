"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { authApi } from "@/services/api";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      if (res.status === "success") {
        setSuccess(true);
        toast.success("Password reset link sent to your email.");
        
      } else {
        setError(res.message || "Failed to trigger recovery link.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your email address.");
      toast.error("Recovery failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6 animate-duration-200"
        >
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-bold font-outfit text-zinc-900 dark:text-zinc-50">Recovery Email Sent</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Check your email for the password reset link and follow the instructions.
              </p>
              <a
                href="/login"
                className="text-xs text-rose-500 hover:underline font-bold block"
              >
                Back to Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="font-outfit text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Recover Password
                </h2>
                <p className="text-xs text-zinc-500">We will send a secure password reset link to your email</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="jane.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>

              <div className="text-center text-xs">
                <a href="/login" className="text-rose-500 hover:underline font-bold">
                  Back to Login
                </a>
              </div>
            </form>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
