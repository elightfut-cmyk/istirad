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
    (set, get) => ({
      language: 'ar',
      setLanguage: (language: Language) => {
        set({ language });
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      },
      toggleLanguage: () => {
        const nextLang: Language = get().language === 'ar' ? 'en' : 'ar';
        get().setLanguage(nextLang);
      },
      t: (key: TranslationKey | string, fallback?: string) => {
        const lang = get().language;
        const dict = translations[lang] as Record<string, string>;
        if (dict && dict[key]) {
          return dict[key];
        }
        // Fallback to Arabic dict if not found in current language
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
