import { enFromKm } from './en-from-km';

export type Language = 'km' | 'en';

const STORAGE_KEY = 'pos_language';

/**
 * The chosen language lives in localStorage (for the UI) and in a cookie (so the server
 * answers validation and flash messages in the same language).
 */
export function storedLanguage(): Language {
    try {
        return window.localStorage.getItem(STORAGE_KEY)?.toLowerCase() === 'en' ? 'en' : 'km';
    } catch {
        return 'km';
    }
}

const activeLanguage: Language = typeof window === 'undefined' ? 'km' : storedLanguage();

export function currentLanguage(): Language {
    return activeLanguage;
}

export function syncLanguageCookie(language: Language): void {
    document.cookie = `${STORAGE_KEY}=${language}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Translate a Khmer UI text. Khmer is the source language: in English mode the text is
 * looked up in the dictionary and falls back to Khmer when no translation exists.
 */
export function tr(khmer: string): string {
    if (activeLanguage === 'km') {
        return khmer;
    }

    return enFromKm[khmer] ?? khmer;
}

/**
 * Switching language reloads the page once, so every label (including module-level
 * constants) is rendered again in the new language.
 */
export function switchLanguage(language: Language): void {
    if (language === activeLanguage) {
        return;
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
        // Private mode: the cookie below still carries the choice for this session
    }

    syncLanguageCookie(language);
    window.location.reload();
}
