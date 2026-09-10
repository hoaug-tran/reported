import React, { createContext, useContext, useState, useEffect } from "react";
import viTranslations from "../locales/vi.json";
import enTranslations from "../locales/en.json";

export type Language = "vi" | "en";

const translations = {
  vi: viTranslations,
  en: enTranslations,
} as const;

export type TranslationKey = keyof typeof viTranslations;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("reported_lang");
    if (saved === "en" || saved === "vi") return saved;
    return "vi";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("reported_lang", lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations.vi;
    return (
      (dict as Record<string, string>)[key] ||
      (translations.vi as Record<string, string>)[key] ||
      String(key)
    );
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
