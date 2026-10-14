"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompareStore } from "@/store/useCompareStore";

export default function CompareToast() {
  const { selectedLawyers, clearCompare } = useCompareStore();
  const pathname = usePathname();

  if (selectedLawyers.length === 0 || pathname === '/compare') return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300 w-full sm:w-auto px-4 sm:px-0">
      <div className="bg-white/95 backdrop-blur-md text-color-foreground shadow-[0_-5px_15px_rgba(0,0,0,0.1)] px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8 border border-color-border-light border-b-0 rounded-t-xl w-full">
        <div className="flex flex-col text-center sm:text-left">
          <span className="font-bold text-sm tracking-wide">
            {selectedLawyers.length} / 3 Lawyers Selected
          </span>
          <span className="text-xs opacity-70">
            Select up to 3 lawyers to compare
          </span>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
          <button 
            onClick={clearCompare}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100 transition-minimal"
          >
            Clear
          </button>
          <Link 
            href="/compare"
            className="flex-1 sm:flex-none text-center bg-color-foreground text-color-background px-6 py-2.5 text-sm font-bold shadow-md hover:opacity-90 transition-minimal whitespace-nowrap rounded-sm"
          >
            Compare Now
          </Link>
        </div>
      </div>
    </div>
  );
}
