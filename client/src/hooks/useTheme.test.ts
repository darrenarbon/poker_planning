import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyDefaultTheme, useTheme } from './useTheme';

describe('useTheme', () => {
    beforeEach(() => localStorage.clear());

    it('switches to a new saved default theme once', () => {
        localStorage.setItem('theme', 'light');
        const { result } = renderHook(() => useTheme());

        act(() => applyDefaultTheme('dark'));
        expect(result.current.theme).toBe('dark');
        expect(document.documentElement).toHaveAttribute(
            'data-bs-theme',
            'dark'
        );

        // the toggle wins for the visit; the same default isn't reapplied
        act(() => result.current.toggleTheme());
        act(() => applyDefaultTheme('dark'));
        expect(result.current.theme).toBe('light');
    });
});
