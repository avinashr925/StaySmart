"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, AlertCircle, Sparkles, CheckCircle, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const router = useRouter();

  // Registration Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"Guest" | "Host" | "PropertyManager">("Guest");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
            { theme: "outline", size: "large", text: "signup_with", width: 380 }
          );
        } else {
          g.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          (window as any).__googleGsiInitializedClientId = googleClientId;
          g.accounts.id.renderButton(
            document.getElementById("google-gsi-btn"),
            { theme: "outline", size: "large", text: "signup_with", width: 380 }
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
    setSubmitting(true);
    try {
      await googleLogin(response.credential);
      toast.success("Successfully logged in with Google!");
      router.push("/dashboard/guest");
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google.");
      toast.error(err.message || "Google Sign-In failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Live Availability States
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  // Debounce check for username
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await fetch(`${API_URL}/auth/check-username`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          setUsernameAvailable(data.available);
        }
      } catch (err) {
        console.error("Username check failed", err);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  // Debounce check for email
  useEffect(() => {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!email || !emailRegex.test(email)) {
      setEmailAvailable(null);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setEmailChecking(true);
      try {
        const res = await fetch(`${API_URL}/auth/check-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          setEmailAvailable(data.available);
        }
      } catch (err) {
        console.error("Email check failed", err);
      } finally {
        setEmailChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [email]);

  // Strict Password Strength Rules
  const passwordRules = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "At least one uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
    { label: "At least one lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
    { label: "At least one numeric digit (0-9)", test: (p: string) => /[0-9]/.test(p) },
    { label: "At least one special symbol (#, $, %, etc.)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return 0;
    return passwordRules.filter((rule) => rule.test(pass)).length;
  };

  const strengthScore = calculatePasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Excellent"];

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (strengthScore < 5) {
      setError("Please satisfy all password complexity rules");
      toast.error("Weak password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords mismatch");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Terms and Conditions");
      toast.error("Accept Terms to proceed");
      return;
    }

    if (usernameAvailable === false) {
      setError("Username is already taken");
      toast.error("Choose another username");
      return;
    }

    if (emailAvailable === false) {
      setError("Email is already registered");
      toast.error("Email already in use");
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        firstName,
        lastName,
        username,
        email,
        password,
        role,
      });

      setSuccess(true);
      toast.success("Account Created Successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Signup failed");
      toast.error(err.message || "Signup error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4 py-8"
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="font-outfit text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Account Created Successfully
                </h2>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  Your credentials have been safely registered. Redirecting you to the login screen...
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow hover:opacity-90 transition"
                >
                  Go to Login Now
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="signup-form-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h2 className="font-outfit text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Create Account
                  </h2>
                  <p className="text-xs text-zinc-500">Start planning your vacation rentals today</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full h-11 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full h-11 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Username (with live validation checking) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        required
                        placeholder="janedoe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-11 pl-10 pr-16 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {usernameChecking && (
                          <span className="text-[10px] text-zinc-400">checking...</span>
                        )}
                        {!usernameChecking && usernameAvailable === true && (
                          <span className="text-[10px] text-emerald-500 font-bold">available</span>
                        )}
                        {!usernameChecking && usernameAvailable === false && (
                          <span className="text-[10px] text-rose-500 font-bold">taken</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email (with live validation checking) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="email"
                        required
                        placeholder="jane.doe@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-10 pr-16 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {emailChecking && (
                          <span className="text-[10px] text-zinc-400">checking...</span>
                        )}
                        {!emailChecking && emailAvailable === true && (
                          <span className="text-[10px] text-emerald-500 font-bold">available</span>
                        )}
                        {!emailChecking && emailAvailable === false && (
                          <span className="text-[10px] text-rose-500 font-bold">taken</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password strength checklist */}
                  {password && (
                    <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase">
                        <span>Password Strength</span>
                        <span className="text-rose-500">{strengthLabels[strengthScore] || "Very Weak"}</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-full transition-colors duration-300 ${
                              idx < strengthScore ? "bg-rose-500" : "bg-zinc-200 dark:bg-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                      <ul className="text-[10px] font-semibold text-zinc-500 space-y-1 mt-2">
                        {passwordRules.map((rule, idx) => {
                          const passed = rule.test(password);
                          return (
                            <li key={idx} className="flex items-center gap-1.5">
                              <span className={passed ? "text-emerald-500 font-bold" : "text-zinc-300"}>
                                {passed ? "✓" : "○"}
                              </span>
                              <span className={passed ? "text-zinc-700 dark:text-zinc-300" : ""}>{rule.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Role Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Are you listing your home?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("Guest")}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                          role === "Guest"
                            ? "border-rose-500 bg-rose-50/20 text-rose-600"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                        }`}
                      >
                        I'm a Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("Host")}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                          role === "Host"
                            ? "border-rose-500 bg-rose-50/20 text-rose-600"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                        }`}
                      >
                        I'm a Host
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-rose-500 focus:ring-rose-500 h-3.5 w-3.5 mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-zinc-500 select-none cursor-pointer leading-tight">
                      I accept StaySmart's Terms of Service and double-booking collision protection rules.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 mt-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow transition disabled:opacity-50"
                  >
                    {submitting ? "Signing Up..." : "Create Account"}
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

                <div className="text-center text-xs text-zinc-500">
                  Already have an account?{" "}
                  <a href="/login" className="text-rose-500 hover:underline font-bold">
                    Sign In
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
