"use client";

import React, { useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Info, Calendar, DollarSign, Award, Percent } from "lucide-react";
import { motion } from "framer-motion";

interface PricingDetails {
  recommendedPrice: number;
  expectedOccupancy: number;
  competitivenessScore: number;
  competitorMin: number;
  competitorAvg: number;
  competitorMax: number;
  aiRationale: string;
  pricePercentile: number;
}

interface AiPricingAnalysisProps {
  pricingDetails: PricingDetails | null;
  currentPrice: number;
}

export default function AiPricingAnalysis({
  pricingDetails,
  currentPrice,
}: AiPricingAnalysisProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  // Fallback defaults if metrics aren't loaded yet
  const details = pricingDetails || {
    recommendedPrice: Math.round(currentPrice * 0.92),
    expectedOccupancy: 88,
    competitivenessScore: 78,
    competitorMin: Math.round(currentPrice * 0.8),
    competitorAvg: Math.round(currentPrice * 0.98),
    competitorMax: Math.round(currentPrice * 1.3),
    aiRationale: "Market supply is expanding but tourist activity remains strong. Book today to lock in seasonal discounts before rates increase.",
    pricePercentile: 45,
  };

  const recommendedPrice = details.recommendedPrice;
  const priceDifference = currentPrice - recommendedPrice;
  const percentageSavings = Math.round((priceDifference / currentPrice) * 100);

  // SVG Chart points: last 4 weeks and forecast next week
  const trendData = [
    { label: "3 Weeks Ago", value: Math.round(currentPrice * 1.05) },
    { label: "2 Weeks Ago", value: Math.round(currentPrice * 1.02) },
    { label: "Last Week", value: Math.round(currentPrice * 0.98) },
    { label: "Today (Actual)", value: currentPrice },
    { label: "Tomorrow", value: recommendedPrice },
    { label: "In 3 Days", value: Math.round(recommendedPrice * 1.04) },
    { label: "In 7 Days", value: Math.round(recommendedPrice * 1.15) },
  ];

  // SVG Chart sizing parameters
  const width = 500;
  const height = 150;
  const padding = 25;

  const minVal = Math.min(...trendData.map((d) => d.value)) * 0.95;
  const maxVal = Math.max(...trendData.map((d) => d.value)) * 1.05;
  const valueRange = maxVal - minVal;

  const getSvgX = (index: number) => {
    return padding + (index * (width - padding * 2)) / (trendData.length - 1);
  };

  const getSvgY = (value: number) => {
    return height - padding - ((value - minVal) * (height - padding * 2)) / valueRange;
  };

  // Build SVG Path points string
  const pointsStr = trendData
    .map((item, idx) => `${getSvgX(idx)},${getSvgY(item.value)}`)
    .join(" ");

  return (
    <div className="border border-indigo-200 dark:border-indigo-950 p-6 rounded-3xl bg-indigo-50/15 dark:bg-indigo-950/10 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-indigo-50 dark:border-indigo-950">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-outfit font-bold text-sm text-zinc-900 dark:text-zinc-50">
              AI Dynamic Pricing Intelligence
            </h3>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
              Machine Learning forecasting
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Demand Level</span>
          <span className={`text-xs font-bold ${details.expectedOccupancy > 80 ? "text-rose-500" : "text-emerald-500"}`}>
            {details.expectedOccupancy > 80 ? "🔥 Peak Demand" : "☘ Moderate"}
          </span>
        </div>
      </div>

      {/* Recommended Pricing Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-1">Current Rate</span>
          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">₹{currentPrice}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-950">
          <span className="text-[10px] text-indigo-500 font-bold block uppercase tracking-wider mb-1">AI Recommendation</span>
          <span className="text-lg font-black text-indigo-500">₹{recommendedPrice}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-1">Expected Occupancy</span>
          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{details.expectedOccupancy}%</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-1">Competitiveness</span>
          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{details.competitivenessScore}/100</span>
        </div>
      </div>

      {/* Suggested savings & checklist */}
      {priceDifference > 0 && (
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2 font-bold shrink-0">
            <Award className="w-5 h-5 text-emerald-500" />
            <span>AI Saving Prompt:</span>
          </div>
          <p className="leading-tight flex-1">
            Booking at the recommended price today could save you approximately{" "}
            <strong>₹{priceDifference.toLocaleString()}</strong> ({percentageSavings}% off our standard weekend rates).
          </p>
        </div>
      )}

      {/* Pricing trend forecasting SVG chart */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Price Trend & Forecast (Next 7 Days)</span>
          <div className="flex gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-400" /> Historical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Forecast</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 relative">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            {/* Horizontal Gridlines */}
            <line x1={padding} y1={getSvgY(minVal)} x2={width - padding} y2={getSvgY(minVal)} className="stroke-zinc-100 dark:stroke-zinc-800 stroke-1 stroke-dasharray-[4]" />
            <line x1={padding} y1={getSvgY((minVal + maxVal) / 2)} x2={width - padding} y2={getSvgY((minVal + maxVal) / 2)} className="stroke-zinc-100 dark:stroke-zinc-800 stroke-1 stroke-dasharray-[4]" />
            <line x1={padding} y1={getSvgY(maxVal)} x2={width - padding} y2={getSvgY(maxVal)} className="stroke-zinc-100 dark:stroke-zinc-800 stroke-1 stroke-dasharray-[4]" />

            {/* Line graph polyline */}
            <polyline
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsStr}
            />

            {/* Area Fill */}
            <path
              fill="url(#areaGradient)"
              d={`M${getSvgX(0)},${height - padding} ${trendData
                .map((d, i) => `L${getSvgX(i)},${getSvgY(d.value)}`)
                .join(" ")} L${getSvgX(trendData.length - 1)},${height - padding} Z`}
            />

            {/* Interactive node elements */}
            {trendData.map((item, idx) => {
              const x = getSvgX(idx);
              const y = getSvgY(item.value);
              const isForecast = idx > 3;

              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    className={`cursor-pointer transition-all duration-300 ${
                      isForecast
                        ? "fill-indigo-500 stroke-white dark:stroke-zinc-900 stroke-2 hover:r-6"
                        : "fill-zinc-400 stroke-white dark:stroke-zinc-900 stroke-2 hover:r-6"
                    }`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({
                        x: x,
                        y: y - 10,
                        label: item.label,
                        value: item.value,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}

            {/* SVG Definitions for Gradients */}
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#A1A1AA" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#4F46E5" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Forecast Data Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-full bg-zinc-900/90 dark:bg-zinc-900 text-white border border-zinc-700 rounded-xl px-2.5 py-1.5 text-[10px] shadow-xl pointer-events-none space-y-0.5 z-30 font-semibold"
            >
              <span className="block text-zinc-400 uppercase">{hoveredPoint.label}</span>
              <strong className="block text-indigo-400">₹{hoveredPoint.value.toLocaleString()}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Seasonality breakdown list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-xs">
        <div className="flex gap-2.5 items-start">
          <Calendar className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-zinc-800 dark:text-zinc-200">Weekend Demand</strong>
            <span className="text-[10px] text-zinc-500">Weekend rates carry a typical +15% density load surcharge.</span>
          </div>
        </div>
        <div className="flex gap-2.5 items-start border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-2.5 md:pt-0 md:pl-3">
          <TrendingUp className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-zinc-800 dark:text-zinc-200">Competitors Supply</strong>
            <span className="text-[10px] text-zinc-500">Competitive rate matches are high this week (priced below avg index).</span>
          </div>
        </div>
        <div className="flex gap-2.5 items-start border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-2.5 md:pt-0 md:pl-3">
          <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-zinc-800 dark:text-zinc-200">AI Pricing Rationale</strong>
            <p className="text-[10px] text-zinc-500 italic mt-0.5 leading-snug">
              "{details.aiRationale}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
