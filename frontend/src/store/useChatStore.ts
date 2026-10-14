import { create } from 'zustand';

interface ChatStoreState {
  activeContactId: string | null;
  setActiveContactId: (id: string | null) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  activeContactId: null,
  setActiveContactId: (id) => set({ activeContactId: id }),
}));
