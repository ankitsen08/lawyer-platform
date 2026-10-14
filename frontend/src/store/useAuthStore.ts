import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type User = {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  firmName?: string;
  role: 'client' | 'lawyer';
  email: string;
  avatar?: string;
  phone?: string;
  plan?: string;
  specialty?: string;
  bio?: string;
  hourlyRate?: string;
  location?: string;
  imageUrl?: string;
  onboarded?: boolean;
};

interface Session {
  isAuthenticated: boolean;
  user: User | null;
}

interface AuthState {
  clientSession: Session;
  lawyerSession: Session;
  loginClient: (user: User) => void;
  logoutClient: () => void;
  loginLawyer: (user: User) => void;
  logoutLawyer: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      clientSession: { isAuthenticated: false, user: null },
      lawyerSession: { isAuthenticated: false, user: null },
      
      loginClient: (user) => {
        set({ clientSession: { isAuthenticated: true, user } });
      },
      logoutClient: () => {
        if (typeof window !== "undefined") document.cookie = "client_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        set({ clientSession: { isAuthenticated: false, user: null } });
      },
      
      loginLawyer: (user) => {
        set({ lawyerSession: { isAuthenticated: true, user } });
      },
      logoutLawyer: () => {
        if (typeof window !== "undefined") document.cookie = "lawyer_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        set({ lawyerSession: { isAuthenticated: false, user: null } });
      },
      
      hydrate: async () => {
        try {
          const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
          const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/me`, {
            credentials: 'include' // Cross-origin cookies required for local dev on different ports
          });
          
          if (res.ok) {
            const data = await res.json();
            
            // If the backend decoded a valid JWT, set the session
            if (data.clientUser) {
              set({ clientSession: { isAuthenticated: true, user: data.clientUser } });
            } else if (data.lawyerUser) {
              set({ lawyerSession: { isAuthenticated: true, user: data.lawyerUser } });
            } else {
              // If backend returned nulls (due to a missing or invalid legacy dummy cookie), clear the state
              if (typeof window !== "undefined") {
                document.cookie = "client_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "lawyer_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              }
              set({ 
                clientSession: { isAuthenticated: false, user: null },
                lawyerSession: { isAuthenticated: false, user: null } 
              });
            }
          }
        } catch (error) {
          console.error("Hydration failed", error);
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
