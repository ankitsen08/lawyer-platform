"use client";

import { useState } from "react";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdvancedFilterSidebarProps {
  freeConsultation: boolean;
  onFreeConsultationChange: (val: boolean) => void;
  experience: string;
  onExperienceChange: (exp: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  onReset: () => void;
}

export function AdvancedFilterSidebar({
  freeConsultation = false,
  onFreeConsultationChange,
  experience = "Any",
  onExperienceChange,
  language = "All",
  onLanguageChange,
  onReset,
}: Partial<AdvancedFilterSidebarProps>) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const FilterContent = () => (
    <div className="space-y-10">
      {/* Reset Filter Button */}
      {onReset && (
        <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Filters</span>
          <button
            onClick={onReset}
            className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* Free Consultation Toggle */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Availability</h4>
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm font-medium tracking-wide group-hover:text-neutral-600 transition-colors">Free Consultation</span>
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={freeConsultation} 
              onChange={(e) => onFreeConsultationChange && onFreeConsultationChange(e.target.checked)} 
            />
            {/* Custom Switch UI */}
            <div className={`w-10 h-5 rounded-full transition-colors duration-300 ${freeConsultation ? 'bg-black' : 'bg-neutral-200'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${freeConsultation ? 'translate-x-5' : 'translate-x-0'} shadow-sm`}></div>
          </div>
        </label>
      </div>

      {/* Years of Experience Radio */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Experience</h4>
        <div className="space-y-4">
          {["Any", "5+ Years", "10+ Years", "20+ Years"].map((exp) => {
            const isChecked = (experience || "Any") === exp;
            return (
              <label 
                key={exp} 
                onClick={() => onExperienceChange && onExperienceChange(exp)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <input 
                    type="radio" 
                    name="experience" 
                    className="sr-only" 
                    checked={isChecked}
                    onChange={() => {}} 
                  />
                  <div className={`w-4 h-4 border rounded-full transition-colors ${isChecked ? 'border-black' : 'border-neutral-300'}`}></div>
                  <div className={`absolute w-2 h-2 bg-black rounded-full transition-all duration-200 ${isChecked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}></div>
                </div>
                <span className={`text-sm font-medium tracking-wide transition-colors ${isChecked ? 'text-black font-bold' : 'text-neutral-600 group-hover:text-black'}`}>{exp}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Spoken Languages Checkboxes */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Languages</h4>
        <div className="space-y-4">
          {["All", "English", "Spanish", "Mandarin", "French"].map((lang) => {
            const isSelected = (language || "All") === lang;
            return (
              <label 
                key={lang} 
                onClick={() => onLanguageChange && onLanguageChange(lang)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${isSelected ? 'border-black bg-black' : 'border-neutral-300'}`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-medium tracking-wide transition-colors ${isSelected ? 'text-black font-bold' : 'text-neutral-600 group-hover:text-black'}`}>{lang}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-6 w-full">
        <button 
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 border border-black px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 transition-colors w-full justify-center"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter Results
        </button>
      </div>

      {/* Desktop Sidebar (Sticky, Minimalist) */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-28 h-max border-r border-neutral-100 pr-10 pb-10">
        <FilterContent />
      </aside>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100] lg:hidden backdrop-blur-sm"
            />

            {/* Slide-over panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 max-w-full w-80 bg-white shadow-2xl z-[101] lg:hidden flex flex-col p-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
                <span className="font-bold text-sm tracking-wider uppercase">Filters</span>
                <button 
                  onClick={() => setMobileOpen(false)}
                  className="p-1 hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <FilterContent />
              </div>

              <div className="pt-6 border-t border-neutral-100 mt-auto">
                <button 
                  onClick={() => setMobileOpen(false)}
                  className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
