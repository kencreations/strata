import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  notificationOffset: number; // in minutes
  setNotificationOffset: (minutes: number) => void;
  nickname: string | null;
  setNickname: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationOffset: 5, // default 5 minutes
      setNotificationOffset: (minutes) => set({ notificationOffset: minutes }),
      nickname: null,
      setNickname: (name) => set({ nickname: name }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

