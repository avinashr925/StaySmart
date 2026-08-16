import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Vibe */}
          <div className="col-span-1 md:col-span-1">
            <span className="font-outfit text-xl font-bold text-rose-500 tracking-tight">StaySmart</span>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              AI-enhanced vacation rentals. Finding the perfect stay has never been this smart, sleek, and intuitive.
            </p>
          </div>

          {/* Stays category */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3">Popular Features</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Beachfront Properties</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Luxury Villas</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Cabins & Nature</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Apartments in Cities</Link>
              </li>
            </ul>
          </div>

          {/* AI Features */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3">AI Intelligence</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Semantic Search</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">AI Travel Assistant</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Smart Price Prediction</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Personal Stays Recommender</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-rose-500 transition">About StaySmart</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Become a Host</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Developer APIs</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose-500 transition">Careers</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Lower bar */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} StaySmart, Inc. Built for Internship Evaluation.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link href="/" className="hover:underline">Privacy Policy</Link>
            <Link href="/" className="hover:underline">Terms of Service</Link>
            <Link href="/" className="hover:underline">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
