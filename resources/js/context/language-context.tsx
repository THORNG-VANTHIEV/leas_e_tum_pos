import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { km, TranslationDict } from '../locales/km';
import { en } from '../locales/en';

export type Language = 'km' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: (key: string, fallback?: string) => string;
    getName: (item?: { name_primary?: string | null; name_secondary?: string | null; name?: string | null; khmerName?: string | null }) => string;
    getSecondaryName: (item?: { name_primary?: string | null; name_secondary?: string | null; name?: string | null; khmerName?: string | null }) => string | null;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionaries: Record<Language, TranslationDict> = {
    km,
    en,
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // The POS is Khmer-first: the language switch was removed, so always start in Khmer
    // (ignores an old 'en' choice left in localStorage from the earlier switch)
    const [language, setLanguageState] = useState<Language>('km');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pos_language', language);
            document.documentElement.lang = language;
        }
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

    const toggleLanguage = () => {
        setLanguageState((prev) => (prev === 'km' ? 'en' : 'km'));
    };

    const t = useMemo(() => {
        return (key: string, fallback?: string): string => {
            const dict = dictionaries[language] || dictionaries.km;
            const parts = key.split('.');
            let current: any = dict;
            for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    return fallback || key;
                }
            }
            return typeof current === 'string' ? current : fallback || key;
        };
    }, [language]);

    /**
     * Resolves the primary display name based on active language:
     * - If language is 'km': prefer name_primary / khmerName, fallback to name_secondary / name
     * - If language is 'en': prefer name_secondary / name, fallback to name_primary / khmerName
     */
    const getName = (item?: {
        name_primary?: string | null;
        name_secondary?: string | null;
        name?: string | null;
        khmerName?: string | null;
    }): string => {
        if (!item) return '';
        if (language === 'km') {
            return item.name_primary || item.khmerName || item.name_secondary || item.name || '';
        }
        return item.name_secondary || item.name || item.name_primary || item.khmerName || '';
    };

    /**
     * Resolves the sub-line secondary name (small label underneath)
     */
    const getSecondaryName = (item?: {
        name_primary?: string | null;
        name_secondary?: string | null;
        name?: string | null;
        khmerName?: string | null;
    }): string | null => {
        if (!item) return null;
        if (language === 'km') {
            // Under Khmer, secondary is English (if present and distinct)
            const sub = item.name_secondary || item.name;
            const main = item.name_primary || item.khmerName;
            return sub && sub !== main ? sub : null;
        }
        // Under English, secondary is Khmer (if present and distinct)
        const sub = item.name_primary || item.khmerName;
        const main = item.name_secondary || item.name;
        return sub && sub !== main ? sub : null;
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                setLanguage,
                toggleLanguage,
                t,
                getName,
                getSecondaryName,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        // Fallback if rendered outside of provider
        return {
            language: 'km' as Language,
            setLanguage: () => {},
            toggleLanguage: () => {},
            t: (key: string, fallback?: string) => fallback || key,
            getName: (item?: any) => item?.name_primary || item?.name || '',
            getSecondaryName: (item?: any) => item?.name_secondary || null,
        };
    }
    return context;
};
