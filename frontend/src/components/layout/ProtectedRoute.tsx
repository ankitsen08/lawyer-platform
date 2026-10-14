"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: "client" | "lawyer";
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { clientSession, lawyerSession, hydrate } = useAuthStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // First attempt to hydrate from the backend cookie
      await hydrate();
      
      const session = role === "client" ? useAuthStore.getState().clientSession : useAuthStore.getState().lawyerSession;
      
      if (!session.isAuthenticated) {
        router.push(role === "client" ? "/client-login" : "/login");
      } else {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [role, router, hydrate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return <>{children}</>;
}
