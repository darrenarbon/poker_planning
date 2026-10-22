import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
/** the saved default last applied, so it only overrides the toggle once */
const DEFAULT_KEY = 'themeDefault';
const CHANGE_EVENT = 'themechange';

const read = (key: string) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const write = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // not worth surfacing
    }
};

const initialTheme = (): Theme => {
    const saved = read(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
};

/** Switches every useTheme user to the given theme */
export const setAppTheme = (theme: Theme) => {
    write(STORAGE_KEY, theme);
    window.dispatchEvent(
        new CustomEvent<Theme>(CHANGE_EVENT, { detail: theme })
    );
};

/**
 * Applies the user's saved default theme when it is new to this browser, so
 * the nav bar toggle can still change it for the rest of the visit.
 */
export const applyDefaultTheme = (theme: Theme | undefined) => {
    if (!theme || read(DEFAULT_KEY) === theme) return;
    write(DEFAULT_KEY, theme);
    setAppTheme(theme);
};

/** Light/dark theme, applied via Bootstrap's data-bs-theme and remembered */
export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(initialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        write(STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        const onChange = (e: Event) =>
            setTheme((e as CustomEvent<Theme>).detail);
        window.addEventListener(CHANGE_EVENT, onChange);
        return () => window.removeEventListener(CHANGE_EVENT, onChange);
    }, []);

    const toggleTheme = useCallback(
        () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
        []
    );

    return { theme, toggleTheme };
};
