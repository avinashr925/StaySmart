"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, AlertCircle, Sparkles, Eye, EyeOff, CheckSquare, Square, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const router = useRouter();

  // Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const isGoogleConfigured = googleClientId && googleClientId !== "GOOGLE_CLIENT_ID_PLACEHOLDER";

  useEffect(() => {
    if (!isGoogleConfigured) return;

    const initGsi = () => {
      const g = (window as any).google;
      if (g) {
        if ((window as any).__googleGsiInitializedClientId === googleClientId) {
          g.accounts.id.renderButton(
            document.getElementById("google-gsi-btn"),
            { theme: "outline", size: "large", text: "continue_with", width: 220 }
          );
        } else {
          g.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          (window as any).__googleGsiInitializedClientId = googleClientId;
          g.accounts.id.renderButton(
            document.getElementById("google-gsi-btn"),
            { theme: "outline", size: "large", text: "continue_with", width: 220 }
          );
        }
      }
    };

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      if ((window as any).google) {
        initGsi();
      } else {
        existingScript.addEventListener("load", initGsi);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.body.appendChild(script);
  }, [isGoogleConfigured, googleClientId]);

  const handleGoogleCredentialResponse = async (response: any) => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(response.credential);
      toast.success("Google Login successful!");
      router.push("/dashboard/guest");
    } catch (err: any) {
      setError(err.message || "Google Authentication failed.");
      toast.error(err.message || "Google Auth Error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      toast.success("Welcome back!");
      router.push("/dashboard/guest");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
      toast.error(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="max-w-md w-full backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Workspace Login
            </div>
            <h2 className="font-outfit text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome Back
            </h2>
            <p className="text-xs text-zinc-500">Access your property intelligence dashboard</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-2.5 p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 rounded-2xl border border-red-200/40 dark:border-red-800/40"
              >
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-[10px] text-rose-500 hover:underline font-bold transition"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1 select-none">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="text-zinc-400 hover:text-rose-500 transition"
              >
                {rememberMe ? (
                  <CheckSquare className="w-4.5 h-4.5 text-rose-500" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
              </button>
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className="text-xs text-zinc-500 cursor-pointer"
              >
                Remember Me (Keep logged in for 30 days)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? "Signing In..." : "Sign In"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Social login divider */}
          <div className="relative flex items-center justify-center my-4">
            <span className="absolute w-full border-t border-zinc-200 dark:border-zinc-800" />
            <span className="relative px-3 text-[10px] text-zinc-400 bg-white dark:bg-zinc-900 font-bold uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Google GSI Auth Portal */}
          <div className="w-full">
            {isGoogleConfigured ? (
              <div className="relative w-full py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer select-none">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-6.16-4.53z" fill="#FBBC05" fillOpacity="1" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Continue with Google</span>
                {/* The actual Google GSI button layered on top invisible */}
                <div id="google-gsi-btn" className="absolute inset-0 opacity-0 overflow-hidden [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:scale-150 cursor-pointer" />
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3.5 text-[10px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 leading-tight">
                <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>Google OAuth is unconfigured. Define <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in environment variables to enable.</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-zinc-500 pt-2">
            Don't have an account yet?{" "}
            <a href="/signup" className="text-rose-500 hover:underline font-bold transition">
              Sign Up
            </a>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
