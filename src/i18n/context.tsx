import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import he from './he.json';
import en from './en.json';

export type Language = 'he' | 'en';

export interface FontOption {
  id: string;
  name: string;
  value: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  { id: 'rubik', name: 'Rubik (Default)', value: "'Rubik Variable', 'Rubik', 'Inter', -apple-system, sans-serif" },
  { id: 'inter', name: 'Inter', value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'system', name: 'System UI', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: 'roboto', name: 'Roboto', value: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'assistant', name: 'Assistant (עברית נקייה)', value: "'Assistant', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'heebo', name: 'Heebo (מודרני)', value: "'Heebo', -apple-system, BlinkMacSystemFont, sans-serif" },
];

const translations: Record<Language, any> = { he, en };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  font: string;
  setFont: (fontId: string) => void;
  t: (key: string, paramsOrFallback?: Record<string, any> | string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('reclone_language') as Language;
      return saved === 'en' || saved === 'he' ? saved : 'he';
    } catch {
      return 'he';
    }
  });

  const [font, setFontState] = useState<string>(() => {
    try {
      return localStorage.getItem('reclone_font') || 'rubik';
    } catch {
      return 'rubik';
    }
  });

  const dir: 'rtl' | 'ltr' = language === 'he' ? 'rtl' : 'ltr';
  const isRtl = dir === 'rtl';

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('reclone_language', newLang);
    } catch {}
  }, []);

  const setFont = useCallback((fontId: string) => {
    setFontState(fontId);
    try {
      localStorage.setItem('reclone_font', fontId);
    } catch {}
  }, []);

  // Update HTML tag attributes and global font family dynamically
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    const selectedFont = AVAILABLE_FONTS.find((f) => f.id === font) || AVAILABLE_FONTS[0];
    document.documentElement.style.setProperty('--app-font', selectedFont.value);
  }, [dir, language, font]);

  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, any> | string): string => {
      const keys = key.split('.');
      let val: any = translations[language];

      for (const k of keys) {
        if (val && typeof val === 'object' && k in val) {
          val = val[k];
        } else {
          val = undefined;
          break;
        }
      }

      if (val === undefined) {
        // Fallback to English dictionary
        let fallbackVal: any = translations.en;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        val = fallbackVal;
      }

      if (val === undefined) {
        if (typeof paramsOrFallback === 'string') {
          return paramsOrFallback;
        }
        return key;
      }

      if (typeof val === 'string' && paramsOrFallback && typeof paramsOrFallback === 'object') {
        let result = val;
        for (const [pKey, pVal] of Object.entries(paramsOrFallback)) {
          result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }
        return result;
      }

      return String(val);
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, dir, isRtl, font, setFont, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
};
