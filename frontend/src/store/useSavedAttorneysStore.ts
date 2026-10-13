import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lawyer } from './useCompareStore';
import { getServerUrl } from '@/utils/apiUrl';

// We can extend the Lawyer type for saved specific properties if needed, or just use Lawyer
interface SavedLawyer extends Lawyer {
  hasConsultation?: boolean;
}

interface SavedAttorneysState {
  savedLawyers: SavedLawyer[];
  toggleSaveLawyer: (lawyer: SavedLawyer, clientId?: string) => Promise<void>;
  removeLawyer: (id: string, clientId?: string) => Promise<void>;
  fetchSavedLawyers: (clientId: string) => Promise<void>;
  isSaved: (id: string) => boolean;
}

export const useSavedAttorneysStore = create<SavedAttorneysState>()(
  persist(
    (set, get) => ({
      savedLawyers: [],
      toggleSaveLawyer: async (lawyer, clientId) => {
        const { savedLawyers } = get();
        const exists = savedLawyers.some((l) => l.id === lawyer.id);
        
        // Optimistic UI Update
        if (exists) {
          set({ savedLawyers: savedLawyers.filter((l) => l.id !== lawyer.id) });
        } else {
          set({ savedLawyers: [...savedLawyers, { ...lawyer, hasConsultation: false }] });
        }

        // Sync with backend if logged in
        if (clientId) {
          try {
            const SERVER_URL = getServerUrl();
            await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/clients/${clientId}/saved-attorneys`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lawyerId: lawyer.id }),
              credentials: 'include'
            });
          } catch (e) { console.error("Failed to sync save state", e); }
        }
      },
      removeLawyer: async (id, clientId) => {
        set((state) => ({
          savedLawyers: state.savedLawyers.filter((l) => l.id !== id),
        }));

        if (clientId) {
          try {
            const SERVER_URL = getServerUrl();
            await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/clients/${clientId}/saved-attorneys`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lawyerId: id }),
              credentials: 'include'
            });
          } catch (e) { console.error("Failed to sync remove state", e); }
        }
      },
      fetchSavedLawyers: async (clientId: string) => {
        try {
          const SERVER_URL = getServerUrl();
          const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/clients/${clientId}/saved-attorneys`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            const mappedLawyers = data
              .filter((item: any) => item && item.lawyerId)
              .map((item: any) => {
                const l = item.lawyerId;
                const id = typeof l === 'object' ? (l._id || l.id) : l;
                const name = typeof l === 'object' ? (l.name || l.firmName || "Verified Attorney") : "Verified Attorney";
                const firm = typeof l === 'object' ? (l.firmName || "Independent Practice") : "Independent Practice";
                const specialty = typeof l === 'object' ? (l.specialty || "General Practice") : "General Practice";
                const hourlyRate = typeof l === 'object' && l.hourlyRate ? `$${l.hourlyRate}/hr` : "$350/hr";
                const location = typeof l === 'object' && l.location ? l.location : "United States";
                const imageUrl = typeof l === 'object' && l.imageUrl ? l.imageUrl : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60";
                
                return {
                  id: String(id),
                  name,
                  firm,
                  specialty,
                  hourlyRate,
                  rating: 5.0,
                  reviewCount: 12,
                  location,
                  imageUrl,
                  description: "Verified legal professional",
                  experienceYears: 10,
                  consultationAvailability: "Within 24 Hours",
                  hasConsultation: false
                };
              });
            set({ savedLawyers: mappedLawyers });
          }
        } catch (e) { console.error("Failed to fetch saved lawyers", e); }
      },
      isSaved: (id) => {
        return get().savedLawyers.some((l) => l.id === id);
      },
    }),
    {
      name: 'saved-attorneys-storage',
    }
  )
);
