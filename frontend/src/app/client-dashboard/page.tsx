"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Bookmark, 
  MessageSquare, 
  Calendar, 
  ChevronRight, 
  Star, 
  MapPin, 
  Briefcase,
  Mail,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useContactStore } from "@/store/useContactStore";
import { useSavedAttorneysStore } from "@/store/useSavedAttorneysStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getServerUrl } from "@/utils/apiUrl";
import MessagesTab from "@/components/chat/MessagesTab";
import ConsultationsTab from "@/components/dashboard/ConsultationsTab";
import AccountSettingsTab from "@/components/dashboard/AccountSettingsTab";
import ClientCaseProfileTab from "@/components/dashboard/ClientCaseProfileTab";

export default function ClientDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("saved");
  const [isResending, setIsResending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  const { clientSession, loginClient, logoutClient } = useAuthStore();
  const { user, isAuthenticated } = clientSession;
  const { openContactModal } = useContactStore();
  const { savedLawyers, removeLawyer, fetchSavedLawyers } = useSavedAttorneysStore();
  const router = useRouter();

  // 1. Initial hydration and URL ?verified=true detection
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        window.history.replaceState({}, "", "/client-dashboard");
        if (user) {
          loginClient({
            ...user,
            isVerified: true
          });
        }
        toast.success("Email verified! Your account is now active.");
      }
    }
  }, [user, loginClient]);

  // Fetch token in dev mode for instant 1-click activation bypass
  useEffect(() => {
    if (!isMounted || !user?.email || user?.isVerified !== false) return;
    const fetchDevToken = async () => {
      try {
        const SERVER_URL = getServerUrl();
        const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/dev-peek-verification-token?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            setDevToken(data.token);
          }
        }
      } catch (_) {}
    };
    fetchDevToken();
  }, [isMounted, user?.email, user?.isVerified]);

  // 2. Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // 3. Authentication redirection & data fetch
  useEffect(() => {
    if (isMounted && (!isAuthenticated || user?.role !== 'client')) {
      router.push('/client-login');
    } else if (isMounted && isAuthenticated && user?._id) {
      // Hydrate saved attorneys from the backend
      fetchSavedLawyers(user._id);
    }
  }, [isMounted, isAuthenticated, user, router, fetchSavedLawyers]);

  // 4. Polling for automatic unlock when verified in another tab or mobile device
  useEffect(() => {
    if (!isMounted || !isAuthenticated || user?.isVerified !== false) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const SERVER_URL = getServerUrl();
        const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/me`, {
          credentials: 'include'
        });
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (data.clientUser?.isVerified) {
            loginClient(data.clientUser);
            toast.success("Email verified! Your account is now active.");
          }
        }
      } catch (_) {}
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isMounted, isAuthenticated, user?.isVerified, loginClient]);

  const handleUpdateEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !user?.email) return;
    setIsUpdatingEmail(true);
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/update-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail: user.email, newEmail: cleanEmail }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Email updated to ${cleanEmail}! Activation link dispatched.`);
        loginClient({ ...user, email: cleanEmail });
        setIsEditingEmail(false);
        setResendCooldown(60);
        if (data.token) setDevToken(data.token);
      } else {
        toast.error(data.error || "Failed to update email address.");
      }
    } catch {
      toast.error("Network error while updating email address.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Fresh activation link sent! Please check your inbox.", {
          description: "Delivered via SMTP. Check your Spam / Junk folder if not in primary inbox.",
          action: data.verificationUrl ? {
            label: "Copy Link",
            onClick: () => {
              navigator.clipboard.writeText(data.verificationUrl);
              toast.success("Activation link copied to clipboard!");
            }
          } : undefined
        });
        setResendCooldown(60);
        if (data.verificationUrl) {
          try {
            const urlObj = new URL(data.verificationUrl);
            const token = urlObj.searchParams.get("token");
            if (token) setDevToken(token);
          } catch (_) {}
        }
      } else {
        toast.error(data.error || "Failed to resend verification link.");
      }
    } catch {
      toast.error("Network error while resending activation link.");
    } finally {
      setIsResending(false);
    }
  };

  const handleDevInstantActivate = async () => {
    if (!devToken) return;
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/verify-email?token=${encodeURIComponent(devToken)}&format=json`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user) {
          loginClient(data.user, data.token);
        } else if (user) {
          loginClient({ ...user, isVerified: true });
        }
        toast.success("Email verified! Your account is now active.");
      } else {
        toast.error(data.error || "Activation failed");
      }
    } catch {
      toast.error("Failed to activate account");
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/me`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clientUser?.isVerified) {
          loginClient(data.clientUser);
          toast.success("Email verified! Your account is now active.");
          return;
        }
      }
      toast.info("Verification pending. Please check your inbox and tap the activation link.");
    } catch {
      toast.error("Could not check verification status right now.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSignOut = async () => {
    await logoutClient();
    router.push('/client-login');
  };

  const handleRemove = (id: string, name: string) => {
    removeLawyer(id, user?._id);
    toast.success(`${name} removed from saved list.`);
  };

  if (!isMounted) return <div className="h-screen bg-color-background"></div>; // Wait for hydration
  if (!isAuthenticated || !user) return null; // Avoid flicker during redirect

  const isBlocked = isAuthenticated && user && user.isVerified === false;

  return (
    <>
      {/* Underlying Dashboard Content (Protected & Inactive when unverified) */}
      <div 
        className={`h-[calc(100vh-64px)] bg-color-background flex flex-col md:flex-row border-t border-color-border-light overflow-hidden transition-all duration-300 ${
          isBlocked ? 'pointer-events-none select-none filter blur-[2px] opacity-40' : ''
        }`}
        aria-hidden={isBlocked}
      >
        
        {/* Client Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-white border-r border-color-border-light flex flex-col shrink-0">
          <div className="p-8 border-b border-color-border-light bg-neutral-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-lg uppercase">
                {(user.name || user.firstName || "U").charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm text-color-foreground">
                  {user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Client"}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-color-text-muted mt-1">Client Account</p>
                {(user.city || user.state || user.zipCode) && (
                  <p className="text-[11px] text-neutral-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {[user.city, user.state].filter(Boolean).join(", ")} {user.zipCode || ""}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {[
              { id: "saved", icon: Bookmark, label: "Saved Attorneys" },
              { id: "case-profile", icon: Briefcase, label: "Case Dossier & Profile" },
              { id: "messages", icon: MessageSquare, label: "Messages & Inquiries" },
              { id: "consultations", icon: Calendar, label: "Consultations" },
              { id: "profile", icon: User, label: "Account Settings" }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? "bg-black text-white" 
                    : "text-color-text-muted hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {activeTab === "saved" && (
            <div className="p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
              <div className="mb-10 border-b border-color-border-light pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-color-foreground">Saved Attorneys</h1>
                <p className="mt-2 text-color-text-muted">Review the legal professionals you are considering hiring.</p>
              </div>

              <div className="space-y-6">
                {savedLawyers.length === 0 ? (
                  <div className="text-center py-12 border border-color-border-light bg-neutral-50">
                    <p className="text-color-text-muted">You have no saved attorneys yet.</p>
                    <Link href="/find" className="mt-4 inline-block font-bold text-black border-b border-black">Browse Directory</Link>
                  </div>
                ) : (
                  savedLawyers.map((lawyer) => (
                    <div key={lawyer.id} className="border border-color-border-light bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-black transition-colors">
                      <div className="w-24 h-24 shrink-0 bg-neutral-100 overflow-hidden">
                        <img src={lawyer.imageUrl} alt={lawyer.name} className="w-full h-full object-cover grayscale" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-color-foreground group-hover:underline decoration-2 underline-offset-4">
                              <Link href={`/lawyers/${lawyer.id}`}>{lawyer.name}</Link>
                            </h3>
                            <p className="text-sm font-medium text-color-text-muted mt-1">{lawyer.firm}</p>
                          </div>
                          <button 
                            onClick={() => handleRemove(lawyer.id, lawyer.name)}
                            className="text-xs font-bold uppercase tracking-widest text-color-text-muted hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-sm font-medium">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-black text-black" />
                            <span>{lawyer.rating}</span>
                          </div>
                          <div className="flex items-center gap-1 text-color-text-muted">
                            <MapPin className="w-4 h-4" />
                            <span>{lawyer.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
                        <Link 
                          href={`/lawyers/${lawyer.id}`} 
                          className="w-full text-center border-2 border-black bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                        >
                          View Profile
                        </Link>
                        
                        {lawyer.hasConsultation ? (
                          <div className="w-full text-center bg-green-50 text-green-700 px-6 py-2 text-[10px] font-bold uppercase tracking-widest border border-green-200">
                            Consultation Booked
                          </div>
                        ) : (
                          <button 
                            onClick={() => openContactModal(lawyer.id, lawyer.name)}
                            className="w-full text-center border border-color-border-light bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                          >
                            Message
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "case-profile" && (
            <ClientCaseProfileTab />
          )}

          {activeTab === "messages" && (
            <div className="h-full w-full">
              <MessagesTab userId={user?._id || user?.email || "user-123"} />
            </div>
          )}
          
          {activeTab === "consultations" && (
            <ConsultationsTab userId={user?._id || user?.email || "user-123"} setActiveTab={setActiveTab} />
          )}

          {activeTab === "profile" && (
            <AccountSettingsTab />
          )}

        </main>
      </div>

      {/* Strict Blocking Verification Modal (Pre-Dashboard Gate) with Fluid Motion */}
      <AnimatePresence>
        {isBlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-gate-title"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="bg-white border border-neutral-200/80 max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-2xl shadow-neutral-950/20 relative text-center space-y-5 my-auto"
            >
              
              {/* Floating Animated Badge */}
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-lg shadow-neutral-900/10">
                <Mail className="w-6 h-6 stroke-[1.75]" />
                <motion.span 
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white ring-2 ring-amber-500/20"
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                />
              </div>

              {/* Status Pill & Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Action Required &bull; Verification Pending
                </div>

                <h2 id="verification-gate-title" className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight">
                  Verify your email
                </h2>

                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
                  We sent a secure activation link to verify your identity and activate your client dashboard.
                </p>
              </div>

              {/* Recipient Email & Typo Detection */}
              {(() => {
                const typoMatch = user?.email?.match(/@([a-zA-Z0-9.-]+)$/);
                const domain = typoMatch ? typoMatch[1].toLowerCase() : "";
                const isTypo = ["gmial.com", "gamil.com", "gmai.com", "gmaill.com", "hotmial.com", "yaho.com", "outlok.com"].includes(domain);
                const correctedDomain = domain.startsWith("gm") ? "gmail.com" : domain.startsWith("hot") ? "hotmail.com" : domain.startsWith("ya") ? "yahoo.com" : "outlook.com";
                const suggested = isTypo && user?.email ? user.email.replace(/@.*$/, `@${correctedDomain}`) : "";

                return (
                  <div className="space-y-3">
                    {/* Compact Email Chip */}
                    <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-600 shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Recipient</p>
                          <p className="text-xs font-semibold text-neutral-900 truncate font-mono">{user.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewEmailInput(user.email || "");
                          setIsEditingEmail(!isEditingEmail);
                        }}
                        className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-2 py-1 rounded-md hover:bg-white transition-colors shrink-0 cursor-pointer"
                      >
                        {isEditingEmail ? "Cancel" : "Change"}
                      </button>
                    </div>

                    {/* Inline Email Edit Form */}
                    <AnimatePresence>
                      {isEditingEmail && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdateEmail(newEmailInput);
                          }}
                          className="overflow-hidden space-y-2 text-left pt-1"
                        >
                          <label className="text-[11px] font-medium text-neutral-600 block">
                            Enter correct email:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={newEmailInput}
                              onChange={(e) => setNewEmailInput(e.target.value)}
                              placeholder="name@example.com"
                              className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 focus:border-neutral-950"
                              required
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={isUpdatingEmail}
                              className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isUpdatingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                              <span>Update</span>
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Refined Typo Warning Banner */}
                    <AnimatePresence>
                      {isTypo && suggested && !isEditingEmail && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 text-left space-y-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-neutral-700 leading-snug">
                              <span>Did you mean </span>
                              <strong className="text-neutral-950 font-semibold">{suggested}</strong>
                              <span className="text-neutral-500">? (Contains typo @{domain})</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateEmail(suggested)}
                            disabled={isUpdatingEmail}
                            className="w-full py-2 px-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.99]"
                          >
                            {isUpdatingEmail ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            )}
                            <span>Change to {suggested} &amp; Resend</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleResendVerification}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-3 px-4 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-400 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Resend available in {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Resend verification email</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 border border-neutral-200/90 text-neutral-800 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCheckingStatus ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking status...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>I&apos;ve verified my email</span>
                    </>
                  )}
                </button>
              </div>

              {/* Spam Notice & Discreet Direct Access */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] text-neutral-400">
                  Can&apos;t find the email? Check your Gmail <strong>Spam / Junk</strong> folder.
                </p>
                {devToken && (
                  <div className="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-neutral-400">
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/verify-email?token=${devToken}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Activation link copied to clipboard!");
                      }}
                      className="text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Copy link
                    </button>
                    <span>&bull;</span>
                    <button
                      type="button"
                      onClick={handleDevInstantActivate}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Activate account
                    </button>
                  </div>
                )}
              </div>

              {/* Sign Out Link */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                <span>Need to use another email?</span>
                <button
                  onClick={handleSignOut}
                  className="text-neutral-950 font-semibold hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
