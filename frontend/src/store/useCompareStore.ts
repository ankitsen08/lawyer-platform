import { create } from 'zustand';

export interface Lawyer {
  id: string;
  name: string;
  firm: string;
  rating: number;
  reviewCount: number;
  description: string;
  location: string;
  imageUrl: string;
  specialty: string;
  experienceYears: number;
  consultationAvailability: string;
}

interface CompareState {
  selectedLawyers: Lawyer[];
  addLawyer: (lawyer: Lawyer) => void;
  removeLawyer: (lawyerId: string) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  selectedLawyers: [],
  addLawyer: (lawyer) =>
    set((state) => {
      if (state.selectedLawyers.length >= 3) return state; // Max 3 lawyers
      if (state.selectedLawyers.find((l) => l.id === lawyer.id)) return state; // Prevent duplicates
      return { selectedLawyers: [...state.selectedLawyers, lawyer] };
    }),
  removeLawyer: (lawyerId) =>
    set((state) => ({
      selectedLawyers: state.selectedLawyers.filter((l) => l.id !== lawyerId),
    })),
  clearCompare: () => set({ selectedLawyers: [] }),
}));
