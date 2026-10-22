import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const initialTheme = (): Theme => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch {
        // storage blocked, fall back to the OS preference
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
};

/** Light/dark theme, applied via Bootstrap's data-bs-theme and remembered */
export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(initialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // not worth surfacing
        }
    }, [theme]);

    const toggleTheme = useCallback(
        () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
        []
    );

    return { theme, toggleTheme };
};
