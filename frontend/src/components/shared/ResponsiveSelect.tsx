"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  searchKeywords?: string;
}

interface ResponsiveSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
  id?: string;
}

export default function ResponsiveSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchable,
  searchPlaceholder = "Search...",
  disabled = false,
  error = false,
  className = "",
  triggerClassName = "",
  ariaLabel,
  id,
}: ResponsiveSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const [maxListHeight, setMaxListHeight] = useState(240);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const enableSearch = searchable ?? options.length > 8;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const target = `${opt.label} ${opt.value} ${opt.searchKeywords || ""}`.toLowerCase();
      return target.includes(q);
    });
  }, [options, searchQuery]);

  // Close when clicking/tapping outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  // Focus search input & determine upward/downward flip when opening
  useEffect(() => {
    if (!isOpen) return;

    if (containerRef.current) {
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
      const shouldFlip = spaceBelow < 280 && spaceAbove > spaceBelow;
      setOpenUpward(shouldFlip);
      const chosenSpace = shouldFlip ? spaceAbove : spaceBelow;
      const searchChrome = enableSearch ? 52 : 12;
      setMaxListHeight(Math.max(120, Math.min(240, Math.floor(chosenSpace - searchChrome - 8))));
    }

    const idx = filteredOptions.findIndex((opt) => opt.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);

    if (enableSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen, enableSearch]);

  // Keep active keyboard item scrolled into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) setSearchQuery("");
      return next;
    });
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      return;
    }

    if (!isOpen && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex].value);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onClick={handleToggle}
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
        <span className={`truncate ${selectedOption ? "text-neutral-900 font-medium" : "text-neutral-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-black" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 w-full bg-white border border-black shadow-2xl rounded-sm overflow-hidden animate-in fade-in duration-100 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {enableSearch && (
            <div className="p-2 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 bg-transparent text-base sm:text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
          )}

          <ul
            ref={listRef}
            role="listbox"
            style={{ maxHeight: `${maxListHeight}px` }}
            className="w-full max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-neutral-100 overscroll-contain"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3.5 py-3 text-xs text-neutral-500 text-center">
                No matching options
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={opt.value || `__empty_${idx}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? "bg-black text-white font-semibold"
                          : isActive
                          ? "bg-neutral-100 text-neutral-900"
                          : "bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
