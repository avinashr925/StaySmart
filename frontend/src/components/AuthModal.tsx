"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Mail, Lock, User, Shield, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode }: AuthModalProps) {
  const { login, signup, googleLogin } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Guest" | "Host">("Guest");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync state with open triggers
  React.useEffect(() => {
    setMode(initialMode);
    setError("");
  }, [initialMode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signup(name, email, password, role);
        toast.success("Welcome to StaySmart! Registered successfully.");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
      toast.error(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSubmitting(true);
    try {
      // Simulate Google Login by generating a mock ID token
      // In production, this would be signed by Google Identity Services.
      // We package a standard JWT header, payload, and signature format base64 string.
      const mockPayload = {
        email: email || "googleuser@gmail.com",
        name: name || "Google Guest User",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
        sub: `google-oauth2|${Math.floor(Math.random() * 1000000000)}`,
      };

      const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify(mockPayload));
      const mockIdToken = `${header}.${payload}.mockSignature`;

      await googleLogin(mockIdToken);
      toast.success("Google OAuth Login successful!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Google Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl z-50"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="font-outfit text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {mode === "login" ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {mode === "login" ? "Welcome back to StaySmart" : "Start looking for your next dream stay"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === "signup" && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Are you listing your home?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("Guest")}
                      className={`py-2 rounded-xl border text-sm font-semibold transition ${
                        role === "Guest"
                          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      I'm a Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("Host")}
                      className={`py-2 rounded-xl border text-sm font-semibold transition ${
                        role === "Host"
                          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      I'm a Host
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="jane.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 mt-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-sm transition disabled:opacity-50"
            >
              {submitting ? "Processing..." : mode === "login" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          {/* Social Auth Separator */}
          <div className="relative flex items-center justify-center my-6">
            <span className="absolute w-full border-t border-zinc-200 dark:border-zinc-800" />
            <span className="relative px-3 text-xs text-zinc-400 bg-white dark:bg-zinc-900">Or continue with</span>
          </div>

          {/* Google Auth Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full py-2.5 flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold transition"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.62 0 3.08.56 4.22 1.66l3.15-3.15C17.43 1.68 14.93 1 12 1 7.37 1 3.4 3.66 1.48 7.52l3.77 2.92C6.18 7.39 8.87 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.46h6.45c-.28 1.46-1.1 2.69-2.33 3.52l3.62 2.81c2.12-1.95 3.75-4.83 3.75-8.43z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 14.52A7.18 7.18 0 0 1 4.8 12c0-.88.16-1.72.45-2.52L1.48 6.56C.54 8.2.01 10.04.01 12c0 1.96.53 3.8 1.47 5.44l3.77-2.92z"
              />
              <path
                fill="#34A853"
                d="M12 18.96c-3.13 0-5.82-2.35-6.75-5.36L1.48 16.52C3.4 20.38 7.37 23 12 23c2.99 0 5.86-1.01 7.9-2.77l-3.62-2.81c-1.14.77-2.6 1.54-4.28 1.54z"
              />
            </svg>
            <span>Google Workspace</span>
          </button>

          {/* Toggle Login/Signup Mode Link */}
          <div className="text-center text-xs text-zinc-500 mt-6">
            {mode === "login" ? (
              <span>
                Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-rose-500 hover:underline font-semibold">
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-rose-500 hover:underline font-semibold">
                  Sign In
                </button>
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
