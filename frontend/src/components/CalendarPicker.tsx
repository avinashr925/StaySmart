"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BookedRange {
  startDate: string | Date;
  endDate: string | Date;
}

interface CalendarPickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  bookedDates: BookedRange[];
}

export default function CalendarPicker({
  startDate,
  endDate,
  onChange,
  bookedDates = [],
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isDateBooked = (date: Date) => {
    const time = date.getTime();
    return bookedDates.some((range) => {
      const start = new Date(range.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(range.endDate);
      end.setHours(0, 0, 0, 0);
      return time >= start.getTime() && time <= end.getTime();
    });
  };

  const isDateDisabled = (date: Date) => {
    if (date < today) return true;
    return isDateBooked(date);
  };

  const handleDayClick = (dayDate: Date) => {
    if (isDateDisabled(dayDate)) return;

    if (!startDate || (startDate && endDate)) {
      // Start a new selection
      onChange(formatDateString(dayDate), "");
    } else {
      // Complete selection
      const start = new Date(startDate);
      if (dayDate < start) {
        // If clicked day is before start, set as start
        onChange(formatDateString(dayDate), "");
      } else {
        onChange(startDate, formatDateString(dayDate));
        setIsOpen(false);
      }
    }
  };

  const isSelected = (date: Date) => {
    if (startDate && formatDateString(date) === startDate) return true;
    if (endDate && formatDateString(date) === endDate) return true;
    return false;
  };

  const isInRange = (date: Date) => {
    if (!startDate) return false;
    const time = date.getTime();
    const start = new Date(startDate).getTime();

    if (endDate) {
      const end = new Date(endDate).getTime();
      return time > start && time < end;
    }

    if (hoveredDate) {
      const hover = hoveredDate.getTime();
      return time > start && time < hover;
    }

    return false;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Generate blank placeholder slots for previous month padding days
  const blankDays = Array.from({ length: firstDayIndex });
  // Generate active calendar days
  const calendarDays = Array.from({ length: daysInMonth }).map((_, idx) => {
    return new Date(year, month, idx + 1);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Target input elements */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="grid grid-cols-2 gap-2 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-2 bg-zinc-50 dark:bg-zinc-950 cursor-pointer hover:border-rose-500/50 transition-all select-none"
      >
        <div className="px-2 py-1">
          <label className="block text-[10px] uppercase font-bold text-zinc-400">Check-in</label>
          <div className="flex items-center gap-1.5 text-xs text-zinc-800 dark:text-zinc-200 py-0.5">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>{startDate || "Select date"}</span>
          </div>
        </div>
        <div className="px-2 py-1 border-l border-zinc-300 dark:border-zinc-700">
          <label className="block text-[10px] uppercase font-bold text-zinc-400">Check-out</label>
          <div className="flex items-center gap-1.5 text-xs text-zinc-800 dark:text-zinc-200 py-0.5">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>{endDate || "Select date"}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            {/* Header / Month-Year Navigation */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-outfit font-bold text-xs text-zinc-800 dark:text-zinc-200">
                {monthNames[month]} {year}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week Labels */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
              {blankDays.map((_, idx) => (
                <div key={`blank-${idx}`} className="aspect-square" />
              ))}

              {calendarDays.map((dayDate, idx) => {
                const isDisabled = isDateDisabled(dayDate);
                const selected = isSelected(dayDate);
                const ranged = isInRange(dayDate);
                const isToday = dayDate.getTime() === today.getTime();

                return (
                  <button
                    key={`day-${idx}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDayClick(dayDate)}
                    onMouseEnter={() => !isDisabled && setHoveredDate(dayDate)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={`aspect-square w-full rounded-full text-xs transition-all relative flex items-center justify-center cursor-pointer ${
                      isDisabled
                        ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed line-through"
                        : selected
                        ? "bg-rose-500 text-white font-bold"
                        : ranged
                        ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 font-semibold"
                        : isToday
                        ? "ring-1 ring-zinc-900 dark:ring-zinc-100 font-bold"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {dayDate.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Caption Info */}
            <div className="flex gap-2.5 items-center p-2.5 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Unavailable slots denote dates already reserved by guest bookings.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
