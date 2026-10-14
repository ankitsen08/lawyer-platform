"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, User as UserIcon, ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const { clientSession, lawyerSession, logoutClient, logoutLawyer } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Globally determine authenticated state independent of current URL
  let isAuthenticated = false;
  let user = null;
  let activeRole: 'lawyer' | 'client' | null = null;

  if (lawyerSession.isAuthenticated) {
    isAuthenticated = true;
    user = lawyerSession.user;
    activeRole = 'lawyer';
  } else if (clientSession.isAuthenticated) {
    isAuthenticated = true;
    user = clientSession.user;
    activeRole = 'client';
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    if (activeRole === 'lawyer') {
      logoutLawyer();
    } else {
      logoutClient();
    }
    setDropdownOpen(false);
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-color-border-light bg-white/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        
        {/* Logo Section */}
        <div className="flex-shrink-0 font-bold text-xl tracking-tight">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="LawyerComparison Logo" className="h-8 w-8 object-contain rounded-full border border-color-border-light" />
            <span>LawyerComparison</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link 
            href="/find" 
            className="text-color-foreground hover:opacity-60 transition-minimal"
          >
            Find a Lawyer
          </Link>
          <Link 
            href="/categories" 
            className="text-color-foreground hover:opacity-60 transition-minimal"
          >
            Categories
          </Link>
          <Link 
            href="/legal-answers" 
            className="text-color-foreground hover:opacity-60 transition-minimal"
          >
            Free Q&A
          </Link>
          <Link 
            href="/compare" 
            className="text-color-foreground hover:opacity-60 transition-minimal"
          >
            Compare
          </Link>
        </div>

        {/* Action Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {!isMounted ? (
            <div className="flex items-center gap-4 opacity-50">
              <div className="w-20 h-6 bg-neutral-200 animate-pulse rounded"></div>
              <div className="w-24 h-9 bg-neutral-200 animate-pulse rounded border border-neutral-300"></div>
            </div>
          ) : !isAuthenticated ? (
            <>
              <Link 
                href="/client-login" 
                className="text-sm font-bold text-color-foreground hover:opacity-60 transition-minimal"
              >
                Client Login
              </Link>
              <Link 
                href="/login" 
                className="border border-color-foreground bg-color-foreground text-color-background px-4 py-2 text-sm font-medium hover:bg-transparent hover:text-color-foreground transition-minimal"
              >
                Lawyer Login
              </Link>
            </>
          ) : (
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 border border-color-border-light bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 transition-minimal"
              >
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold rounded-full uppercase">
                  {(user?.name || user?.firstName || user?.firmName || "U").charAt(0)}
                </div>
                <span>{user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.firmName || "User"}</span>
                <ChevronDown className="w-4 h-4 text-color-text-muted" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-color-border-light shadow-xl py-1 z-50">
                  <Link 
                    href={activeRole === 'lawyer' ? "/attorney-dashboard" : "/client-dashboard"}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-color-foreground hover:bg-neutral-100 transition-colors w-full"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left border-t border-color-border-light mt-1 pt-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={toggleMenu}
            className="text-color-foreground p-2 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-b border-color-border-light bg-color-background px-6 py-4 space-y-4">
          <Link 
            href="/find" 
            className="block text-base font-medium text-color-foreground"
            onClick={() => setIsOpen(false)}
          >
            Find a Lawyer
          </Link>
          <Link 
            href="/categories" 
            className="block text-base font-medium text-color-foreground"
            onClick={() => setIsOpen(false)}
          >
            Categories
          </Link>
          <Link 
            href="/legal-answers" 
            className="block text-base font-medium text-color-foreground"
            onClick={() => setIsOpen(false)}
          >
            Free Q&A
          </Link>
          <Link 
            href="/compare" 
            className="block text-base font-medium text-color-foreground"
            onClick={() => setIsOpen(false)}
          >
            Compare
          </Link>
          <div className="pt-4 border-t border-color-border-light flex flex-col gap-3">
            {!isMounted ? (
              <div className="h-10 bg-neutral-200 animate-pulse rounded w-full"></div>
            ) : !isAuthenticated ? (
              <>
                <Link 
                  href="/client-login" 
                  className="inline-block text-base font-bold text-color-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  Client Login
                </Link>
                <Link 
                  href="/login" 
                  className="inline-block border border-color-foreground bg-color-foreground text-color-background px-4 py-2 text-sm font-medium text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Lawyer Login
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href={activeRole === 'lawyer' ? "/attorney-dashboard" : "/client-dashboard"}
                  className="flex items-center gap-2 text-base font-bold text-color-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5" /> Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-base font-bold text-red-600"
                >
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
