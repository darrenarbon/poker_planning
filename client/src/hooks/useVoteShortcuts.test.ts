import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NO_IDEA_VOTE } from '../constants';
import { SHORTCUT_DELAY_MS, useVoteShortcuts } from './useVoteShortcuts';

describe('useVoteShortcuts', () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('votes straight away for a value no longer value starts with', async () => {
        const onSelect = vi.fn();
        renderHook(() => useVoteShortcuts(onSelect));
        await userEvent.keyboard('5');
        expect(onSelect).toHaveBeenCalledWith(5);
    });

    it('waits for a second digit to vote 13', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const onSelect = vi.fn();
        renderHook(() => useVoteShortcuts(onSelect));
        await userEvent.keyboard('13');
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(13);
    });

    it('votes 1 once the delay passes', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const onSelect = vi.fn();
        renderHook(() => useVoteShortcuts(onSelect));
        await userEvent.keyboard('1');
        expect(onSelect).not.toHaveBeenCalled();
        vi.advanceTimersByTime(SHORTCUT_DELAY_MS);
        expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('votes No Idea with 0', async () => {
        const onSelect = vi.fn();
        renderHook(() => useVoteShortcuts(onSelect));
        await userEvent.keyboard('0');
        expect(onSelect).toHaveBeenCalledWith(NO_IDEA_VOTE);
    });

    it('ignores keys typed into inputs, and when disabled', async () => {
        const onSelect = vi.fn();
        const input = document.createElement('input');
        document.body.appendChild(input);
        const { rerender } = renderHook(
            ({ enabled }) => useVoteShortcuts(onSelect, enabled),
            { initialProps: { enabled: true } }
        );
        await userEvent.type(input, '5');
        rerender({ enabled: false });
        input.blur();
        await userEvent.keyboard('5');
        expect(onSelect).not.toHaveBeenCalled();
    });
});
