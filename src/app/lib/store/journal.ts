import { create } from 'zustand'

interface JournalState {
  currentDate: Date;
  activeLog: any | null; 
  isLoading: boolean;
  setDate: (date: Date) => void;
  setActiveLog: (log: any) => void;
}

// Виправлений синтаксис для TS
export const useJournalStore = create<JournalState>()((set) => ({
  currentDate: new Date(),
  activeLog: null,
  isLoading: false,
  setDate: (date) => set({ currentDate: date }),
  setActiveLog: (log) => set({ activeLog: log }),
}))