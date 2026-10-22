import confetti from 'canvas-confetti';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTicket } from '../test/factories';
import { isConsensus, useConsensusConfetti } from './useConsensusConfetti';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const agreed = makeTicket({
    votes: [
        { usersub: 'a', vote: 5 },
        { usersub: 'b', vote: 5 },
    ],
});

describe('isConsensus', () => {
    it.each([
        [agreed, true],
        [makeTicket({ votes: [{ usersub: 'a', vote: 5 }] }), false],
        [
            makeTicket({
                votes: [
                    { usersub: 'a', vote: 5 },
                    { usersub: 'b', vote: 8 },
                ],
            }),
            false,
        ],
        [
            makeTicket({
                votes: [
                    { usersub: 'a', vote: 0 },
                    { usersub: 'b', vote: 0 },
                ],
            }),
            false,
        ],
    ])('case %#', (ticket, expected) => {
        expect(isConsensus(ticket)).toBe(expected);
    });
});

describe('useConsensusConfetti', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    });

    it('does nothing until votes are revealed', () => {
        renderHook(() => useConsensusConfetti(agreed, false));
        expect(confetti).not.toHaveBeenCalled();
    });

    it('celebrates once per ticket when everyone agrees', () => {
        const { rerender } = renderHook(
            ({ show }) => useConsensusConfetti(agreed, show),
            { initialProps: { show: true } }
        );
        expect(confetti).toHaveBeenCalled();
        vi.mocked(confetti).mockClear();
        rerender({ show: true });
        expect(confetti).not.toHaveBeenCalled();
    });
});
