import { create } from 'zustand'

interface JournalState {
  currentDate: Date;
  activeLog: any | null; // Замінити на типізацію бази
  isLoading: boolean;
  setDate: (date: Date) => void;
  setActiveLog: (log: any) => void;
}

export const useJournalStore = create<JournalState>((set) => ({
  currentDate: new Date(),
  activeLog: null,
  isLoading: false,
  setDate: (date) => set({ currentDate: date }),
  setActiveLog: (log) => set({ activeLog: log }),
}))