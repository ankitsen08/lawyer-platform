import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getServerUrl } from '@/utils/apiUrl';

export type User = {
  _id?: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  firmName?: string;
  role: 'client' | 'lawyer';
  email: string;
  avatar?: string;
  phone?: string;
  smsConsent?: boolean;
  isVerified?: boolean;
  city?: string;
  state?: string;
  zipCode?: string;
  preferredContactMethod?: 'email' | 'phone' | 'sms' | 'whatsapp';
  caseProfile?: {
    legalCategory?: string;
    legalSubCategory?: string;
    urgency?: string;
    incidentDate?: string;
    opposingParty?: string;
    budgetRange?: string;
    preferredFormat?: string;
    preferredContactMethod?: string;
    smsNotifications?: boolean;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
    attachments?: Array<{
      name: string;
      size: number;
      mimeType: string;
      dataUrl: string;
      uploadedAt?: string;
    }>;
  };
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
  token?: string | null;
}

interface AuthState {
  clientSession: Session;
  lawyerSession: Session;
  loginClient: (user: User, token?: string) => void;
  logoutClient: () => Promise<void>;
  loginLawyer: (user: User, token?: string) => void;
  logoutLawyer: () => Promise<void>;
  clearClientSession: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      clientSession: { isAuthenticated: false, user: null, token: null },
      lawyerSession: { isAuthenticated: false, user: null, token: null },
      
      clearClientSession: () => {
        set({ clientSession: { isAuthenticated: false, user: null, token: null } });
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('auth-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                parsed.state.clientSession = { isAuthenticated: false, user: null, token: null };
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            }
          } catch (_) {}
        }
      },

      loginClient: (user, token) => {
        set({ clientSession: { isAuthenticated: true, user, token: token || null } });
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('auth-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                parsed.state.clientSession = { isAuthenticated: true, user, token: token || null };
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            }
          } catch (_) {}
        }
      },

      logoutClient: async () => {
        try {
          const SERVER_URL = getServerUrl();
          await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'client' }),
            credentials: 'include'
          });
        } catch (e) {
          console.error("Logout request failed", e);
        }
        set({ clientSession: { isAuthenticated: false, user: null, token: null } });
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('auth-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                parsed.state.clientSession = { isAuthenticated: false, user: null, token: null };
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            }
          } catch (_) {}
        }
      },
      
      loginLawyer: (user, token) => {
        set({ lawyerSession: { isAuthenticated: true, user, token: token || null } });
      },

      logoutLawyer: async () => {
        try {
          const SERVER_URL = getServerUrl();
          await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'lawyer' }),
            credentials: 'include'
          });
        } catch (e) {
          console.error("Logout request failed", e);
        }
        set({ lawyerSession: { isAuthenticated: false, user: null, token: null } });
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('auth-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                parsed.state.lawyerSession = { isAuthenticated: false, user: null, token: null };
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            }
          } catch (_) {}
        }
      },
      
      hydrate: async () => {
        try {
          const SERVER_URL = getServerUrl();
          const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/auth/me`, {
            credentials: 'include' // Cross-origin cookies required for local dev on different ports
          });
          
          if (res.ok) {
            const data = await res.json();
            
            // If the backend decoded a valid JWT, sync session state
            if (data.clientUser) {
              set((state) => ({ clientSession: { isAuthenticated: true, user: data.clientUser, token: state.clientSession.token } }));
            } else {
              set({ clientSession: { isAuthenticated: false, user: null, token: null } });
              if (typeof window !== 'undefined') {
                try {
                  const raw = localStorage.getItem('auth-storage');
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.state?.clientSession?.isAuthenticated) {
                      parsed.state.clientSession = { isAuthenticated: false, user: null, token: null };
                      localStorage.setItem('auth-storage', JSON.stringify(parsed));
                    }
                  }
                } catch (_) {}
              }
            }

            if (data.lawyerUser) {
              set((state) => ({ lawyerSession: { isAuthenticated: true, user: data.lawyerUser, token: state.lawyerSession.token } }));
            } else {
              set({ lawyerSession: { isAuthenticated: false, user: null, token: null } });
            }
          } else {
            set({
              clientSession: { isAuthenticated: false, user: null, token: null },
              lawyerSession: { isAuthenticated: false, user: null, token: null }
            });
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
