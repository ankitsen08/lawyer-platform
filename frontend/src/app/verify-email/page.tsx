"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getServerUrl } from "@/utils/apiUrl";
import { toast } from "sonner";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const { clientSession, loginClient } = useAuthStore();

  useEffect(() => {
    let isCancelled = false;

    async function verify() {
      if (!token) {
        setStatus("error");
        setErrorMessage("Missing activation token. Please click the link received in your activation email.");
        return;
      }

      try {
        const SERVER_URL = getServerUrl();
        const res = await fetch(
          `${SERVER_URL.replace("ws://", "http://").replace("wss://", "https://")}/api/auth/verify-email?token=${encodeURIComponent(token)}&format=json`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );

        const data = await res.json();

        if (isCancelled) return;

        if (res.ok && data.success) {
          setStatus("success");
          if (data.user) {
            loginClient({ ...data.user, isVerified: true }, data.token);
          } else if (clientSession.user) {
            loginClient({ ...clientSession.user, isVerified: true });
          }

          toast.success("Account activated successfully!");
          setTimeout(() => {
            router.push("/client-dashboard?verified=true");
          }, 2000);
        } else {
          setStatus("error");
          setErrorMessage(data.error || "The verification link is invalid or has expired.");
        }
      } catch (err: any) {
        if (!isCancelled) {
          setStatus("error");
          setErrorMessage("Failed to connect to the verification server. Please try again.");
        }
      }
    }

    verify();
    return () => {
      isCancelled = true;
    };
  }, [token, router, loginClient, clientSession.user]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendEmail.trim() || clientSession.user?.email;
    if (!targetEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setIsResending(true);
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(
        `${SERVER_URL.replace("ws://", "http://").replace("wss://", "https://")}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: targetEmail }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      setResendSent(true);
      toast.success("Fresh activation link sent!", {
        description: `Check your inbox at ${targetEmail}`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[75vh] w-full flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md bg-white border border-color-border-light border-t-4 border-t-black p-6 sm:p-8 shadow-xl text-center">
        
        {status === "loading" && (
          <div className="py-8 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-black">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Activating Your Account...</h1>
            <p className="text-sm text-neutral-500">
              Validating your secure verification token with LawyerComparison.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="py-8 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Account Activated!</h1>
            <p className="text-sm text-neutral-600">
              Your email verification is complete. Direct consultations and priority intake are now unlocked.
            </p>
            <div className="pt-2">
              <Link
                href="/client-dashboard?verified=true"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors w-full"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 space-y-5 animate-in fade-in">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Activation Failed</h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5">{errorMessage}</p>
            </div>

            {resendSent ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded text-left space-y-1">
                <p className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  New Activation Link Dispatched
                </p>
                <p className="text-xs text-green-700">
                  Please check your inbox (and spam folder) for the new activation email.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left border-t border-neutral-100">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Request New Activation Link
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={resendEmail || clientSession.user?.email || ""}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-300 focus:outline-none focus:border-black"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full bg-black text-white py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Resend Activation Email
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-2">
              <Link
                href="/client-login"
                className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] w-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

