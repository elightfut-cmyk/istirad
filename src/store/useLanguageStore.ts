import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language, TranslationKey } from '../translations';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ar',
      setLanguage: () => {
        set({ language: 'ar' });
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
      },
      toggleLanguage: () => {},
      t: (key: TranslationKey | string, fallback?: string) => {
        const arDict = translations['ar'] as Record<string, string>;
        if (arDict && arDict[key]) {
          return arDict[key];
        }
        return fallback || key;
      }
    }),
    {
      name: 'language-storage',
    }
  )
);
