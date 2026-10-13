"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { getServerUrl } from "@/utils/apiUrl";

export default function ClientLoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const router = useRouter();
  const { loginClient } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CRITICAL: Prevent page reload
    
    if (!email || !password || (!isLogin && !name)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const SERVER_URL = getServerUrl();
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'client', name }),
        credentials: 'include' // Allow JWT cookie to be set
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Sync Zustand Store
      loginClient(data.user);

      toast.success(isLogin ? "Welcome back!" : "Account created successfully!", {
        description: "Redirecting to your dashboard..."
      });

      // Navigate instantly
      router.push("/client-dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in. Please try again.");
    }
  };

  return (
    <div className="min-h-[85vh] w-full bg-color-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-color-text-muted hover:text-color-foreground mb-8 transition-minimal"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="border border-color-border-light bg-white p-8 shadow-2xl relative overflow-hidden">
          {/* Top border accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>

          <div className="mb-8 flex flex-col items-center text-center mt-2">
            <div className="h-12 w-12 border-2 border-black flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-black" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-color-foreground">
              {isLogin ? "Client Portal" : "Create Account"}
            </h1>
            <p className="mt-2 text-sm text-color-text-muted">
              {isLogin 
                ? "Sign in to manage your saved attorneys and consultations."
                : "Join to save attorneys and securely request consultations."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-color-foreground uppercase tracking-widest text-[10px]">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-sm focus:border-black focus:outline-none transition-minimal"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-bold text-color-foreground uppercase tracking-widest text-[10px]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-sm focus:border-black focus:outline-none transition-minimal"
                  placeholder="client@example.com"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-color-foreground uppercase tracking-widest text-[10px]">Password</label>
                {isLogin && (
                  <Link href="#" className="text-[10px] font-bold text-color-text-muted hover:text-black uppercase tracking-widest transition-colors">
                    Forgot?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-sm focus:border-black focus:outline-none transition-minimal"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-black text-white px-4 py-3.5 text-sm font-bold uppercase tracking-widest shadow-md hover:opacity-90 transition-minimal mt-4"
            >
              {isLogin ? "Sign In Securely" : "Create Account"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-color-border-light text-center flex flex-col gap-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-color-text-muted hover:text-black transition-colors"
            >
              {isLogin ? (
                <>Don't have an account? <span className="font-bold border-b border-black">Sign up</span></>
              ) : (
                <>Already have an account? <span className="font-bold border-b border-black">Sign in</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
