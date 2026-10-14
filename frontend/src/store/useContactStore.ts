import { create } from 'zustand';

interface ContactState {
  isOpen: boolean;
  lawyerName: string | null;
  lawyerId: string | null;
  openContactModal: (lawyerId: string, lawyerName: string) => void;
  closeContactModal: () => void;
}

export const useContactStore = create<ContactState>((set) => ({
  isOpen: false,
  lawyerName: null,
  lawyerId: null,
  openContactModal: (lawyerId, lawyerName) => set({ isOpen: true, lawyerId, lawyerName }),
  closeContactModal: () => set({ isOpen: false, lawyerId: null, lawyerName: null }),
}));
