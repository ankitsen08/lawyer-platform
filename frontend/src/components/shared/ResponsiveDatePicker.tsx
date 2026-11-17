"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ResponsiveDatePickerProps {
  value: string; // ISO YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
  id?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function parseIsoDate(iso?: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null;
  return { year: y, month: m - 1, day: d };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function formatReadableDate(iso?: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  return `${MONTH_NAMES[parsed.month]} ${parsed.day}, ${parsed.year}`;
}

export default function ResponsiveDatePicker({
  value,
  onChange,
  placeholder = "Select date (MM/DD/YYYY)",
  disabled = false,
  error = false,
  className = "",
  triggerClassName = "",
  ariaLabel,
  id,
}: ResponsiveDatePickerProps) {
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, []);

  const parsedValue = useMemo(() => parseIsoDate(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const [openUpward, setOpenUpward] = useState(false);
  const [viewYear, setViewYear] = useState<number>(parsedValue?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue?.month ?? today.month);
  const [yearRangeStart, setYearRangeStart] = useState<number>(
    Math.floor((parsedValue?.year ?? today.year) / 12) * 12
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync calendar cursor whenever external value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
      setYearRangeStart(Math.floor(parsedValue.year / 12) * 12);
    }
  }, [parsedValue]);

  // Close on outside click/tap or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode("days");
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setViewMode("days");
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Auto-flip upward vs downward inside bounded viewport / scrollable modal containers
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let boundTop = 0;
    let boundBottom = window.innerHeight;
    let parent = containerRef.current.parentElement;
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden") {
        const pRect = parent.getBoundingClientRect();
        boundTop = Math.max(boundTop, pRect.top);
        boundBottom = Math.min(boundBottom, pRect.bottom);
        break;
      }
      parent = parent.parentElement;
    }

    const spaceBelow = boundBottom - rect.bottom;
    const spaceAbove = rect.top - boundTop;
    setOpenUpward(spaceBelow < 340 && spaceAbove > spaceBelow);
  }, [isOpen]);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      year: number;
      month: number;
      day: number;
      inCurrentMonth: boolean;
      iso: string;
    }> = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ year: y, month: m, day: d, inCurrentMonth: false, iso: toIsoDate(y, m, d) });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        year: viewYear,
        month: viewMonth,
        day: d,
        inCurrentMonth: true,
        iso: toIsoDate(viewYear, viewMonth, d),
      });
    }

    // Trailing days to complete 6 rows (42 cells) or 5 rows (35 cells) cleanly
    const targetCells = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < targetCells) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ year: y, month: m, day: nextDay, inCurrentMonth: false, iso: toIsoDate(y, m, nextDay) });
      nextDay++;
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayIso = toIsoDate(today.year, today.month, today.day);
  const displayLabel = formatReadableDate(value);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectIso = (iso: string) => {
    onChange(iso);
    setIsOpen(false);
    setViewMode("days");
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange("");
    setIsOpen(false);
    setViewMode("days");
  };

  const handleSelectToday = () => {
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange(todayIso);
    setIsOpen(false);
    setViewMode("days");
  };

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      <div className="relative w-full min-w-0">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={ariaLabel || placeholder}
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
            setViewMode("days");
          }}
          className={`w-full min-w-0 flex items-center justify-between gap-2 text-left text-base sm:text-sm border transition-colors focus:outline-none ${
            error
              ? "border-red-500"
              : isOpen
              ? "border-black"
              : "border-color-border-light hover:border-neutral-400 focus:border-black"
          } ${
            disabled ? "opacity-60 cursor-not-allowed bg-neutral-100" : "cursor-pointer"
          } ${triggerClassName || "bg-white px-3.5 py-2.5"}`}
        >
          <span className={`truncate ${value && !disabled ? "pr-6" : ""} ${displayLabel ? "text-neutral-900 font-medium" : "text-neutral-400"}`}>
            {displayLabel || placeholder}
          </span>
          <CalendarIcon className={`w-4 h-4 shrink-0 ${isOpen ? "text-black" : "text-neutral-500"}`} />
        </button>

        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-black rounded-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose date"
          className={`absolute left-0 right-0 sm:right-auto sm:w-80 w-full max-w-full z-50 bg-white border border-black shadow-2xl rounded-sm overflow-hidden animate-in fade-in duration-100 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-neutral-50 border-b border-neutral-200">
            <button
              type="button"
              aria-label={viewMode === "years" ? "Previous 12 years" : "Previous month"}
              onClick={() => {
                if (viewMode === "years") {
                  setYearRangeStart((y) => y - 12);
                } else if (viewMode === "months") {
                  setViewYear((y) => y - 1);
                } else {
                  handlePrevMonth();
                }
              }}
              className="p-1.5 rounded-sm text-neutral-700 hover:bg-neutral-200 hover:text-black transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "months" ? "days" : "months"))}
                className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                  viewMode === "months" ? "bg-black text-white" : "text-neutral-900 hover:bg-neutral-200"
                }`}
              >
                {MONTH_NAMES[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => {
                  setYearRangeStart(Math.floor(viewYear / 12) * 12);
                  setViewMode((m) => (m === "years" ? "days" : "years"));
                }}
                className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                  viewMode === "years" ? "bg-black text-white" : "text-neutral-900 hover:bg-neutral-200"
                }`}
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              aria-label={viewMode === "years" ? "Next 12 years" : "Next month"}
              onClick={() => {
                if (viewMode === "years") {
                  setYearRangeStart((y) => y + 12);
                } else if (viewMode === "months") {
                  setViewYear((y) => y + 1);
                } else {
                  handleNextMonth();
                }
              }}
              className="p-1.5 rounded-sm text-neutral-700 hover:bg-neutral-200 hover:text-black transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Quick-Picker View */}
          {viewMode === "months" && (
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {MONTH_SHORT.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setViewMonth(idx);
                    setViewMode("days");
                  }}
                  className={`py-2.5 text-xs font-bold rounded-sm transition-colors ${
                    viewMonth === idx
                      ? "bg-black text-white"
                      : "bg-neutral-50 text-neutral-800 hover:bg-neutral-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Year Quick-Picker View */}
          {viewMode === "years" && (
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, idx) => yearRangeStart + idx).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setViewYear(yr);
                    setViewMode("days");
                  }}
                  className={`py-2.5 text-xs font-bold rounded-sm transition-colors ${
                    viewYear === yr
                      ? "bg-black text-white"
                      : "bg-neutral-50 text-neutral-800 hover:bg-neutral-200"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {/* Calendar Days Grid */}
          {viewMode === "days" && (
            <div className="p-2.5 sm:p-3">
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map((dayName) => (
                  <div
                    key={dayName}
                    className="h-7 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-neutral-400"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((cell) => {
                  const isSelected = cell.iso === value;
                  const isToday = cell.iso === todayIso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => handleSelectIso(cell.iso)}
                      className={`h-9 w-full flex items-center justify-center text-xs rounded-sm transition-all ${
                        isSelected
                          ? "bg-black text-white font-bold shadow-xs"
                          : isToday
                          ? "border border-black font-bold text-black hover:bg-neutral-100"
                          : cell.inCurrentMonth
                          ? "text-neutral-900 font-medium hover:bg-neutral-100"
                          : "text-neutral-300 hover:bg-neutral-50 hover:text-neutral-500"
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-neutral-500 hover:text-black px-2 py-1 rounded-sm transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-xs font-bold text-black hover:bg-neutral-200 px-2.5 py-1 rounded-sm transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
