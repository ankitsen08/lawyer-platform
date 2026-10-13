"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Briefcase } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { getServerUrl } from "@/utils/apiUrl";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firmName, setFirmName] = useState("");
  const router = useRouter();
  const { loginLawyer } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !firmName)) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    try {
      const SERVER_URL = getServerUrl();
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'lawyer', firmName }),
        credentials: 'include' // Allow JWT cookie to be set
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Sync Zustand Store
      loginLawyer(data.user);
      
      if (!data.user.onboarded) {
        toast.success("Account created!", { description: "Redirecting to profile setup..." });
        router.push("/lawyer-onboarding/pricing");
      } else {
        toast.success("Welcome back!", { description: "Redirecting to your dashboard..." });
        router.push("/attorney-dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to log in. Please try again.");
    }
  };

  return (
    <div className="min-h-[80vh] w-full bg-color-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-color-text-muted hover:text-color-foreground mb-8 transition-minimal"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="border border-color-border-light bg-white p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-color-foreground text-color-background flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-color-foreground">
              {isLogin ? "Attorney Portal" : "Register Practice"}
            </h1>
            <p className="mt-2 text-sm text-color-text-muted">
              {isLogin 
                ? "Securely log in to manage your premium directory listing."
                : "Create a verified practice account to reach premium clients."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-color-foreground">Firm / Practice Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-color-foreground focus:outline-none transition-minimal"
                    placeholder="e.g. Pearson & Hardman LLP"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-color-foreground">Work Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-color-foreground focus:outline-none transition-minimal"
                placeholder="attorney@firm.com"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-color-foreground">Password</label>
                {isLogin && (
                  <Link href="#" className="text-xs font-semibold text-color-text-muted underline hover:text-color-foreground">
                    Forgot?
                  </Link>
                )}
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-color-foreground focus:outline-none transition-minimal"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              className="w-full flex justify-center bg-color-foreground text-color-background px-4 py-3 text-sm font-bold shadow-md hover:opacity-90 transition-minimal"
            >
              {isLogin ? "Sign In Securely" : "Create Attorney Account"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-color-border-light text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-sm text-color-text-muted hover:text-color-foreground"
            >
              {isLogin ? (
                <>Not listed yet? <span className="font-bold underline">Claim or create your profile</span></>
              ) : (
                <>Already registered? <span className="font-bold underline">Sign in to your practice</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
