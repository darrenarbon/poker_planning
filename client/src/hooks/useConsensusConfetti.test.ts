import confetti from 'canvas-confetti';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTicket } from '../test/factories';
import {
    DISAGREEMENT_QUIPS,
    isConsensus,
    isTotalDisagreement,
    useConsensusConfetti,
} from './useConsensusConfetti';

vi.mock('canvas-confetti', () => ({
    default: Object.assign(vi.fn(), { shapeFromText: vi.fn(() => ({})) }),
}));

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

const chaotic = makeTicket({
    votes: [
        { usersub: 'a', vote: 1 },
        { usersub: 'b', vote: 5 },
        { usersub: 'c', vote: 13 },
    ],
});

describe('isTotalDisagreement', () => {
    it.each([
        [chaotic, true],
        [agreed, false],
        [
            makeTicket({
                votes: [
                    { usersub: 'a', vote: 1 },
                    { usersub: 'b', vote: 5 },
                ],
            }),
            false,
        ],
        [
            makeTicket({
                votes: [
                    { usersub: 'a', vote: 1 },
                    { usersub: 'b', vote: 5 },
                    { usersub: 'c', vote: 5 },
                ],
            }),
            false,
        ],
    ])('case %#', (ticket, expected) => {
        expect(isTotalDisagreement(ticket)).toBe(expected);
    });
});

describe('when every vote is different', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    it('rains emoji and shows a quip for a few seconds', () => {
        const { result } = renderHook(() =>
            useConsensusConfetti(chaotic, true)
        );
        expect(confetti.shapeFromText).toHaveBeenCalled();
        expect(DISAGREEMENT_QUIPS).toContain(result.current);

        act(() => vi.advanceTimersByTime(4000));
        expect(result.current).toBeNull();
    });

    it('drops the quip when moving to another ticket', () => {
        const { result, rerender } = renderHook(
            ({ ticket }) => useConsensusConfetti(ticket, true),
            { initialProps: { ticket: chaotic } }
        );
        expect(result.current).not.toBeNull();
        rerender({ ticket: makeTicket({ ticket_id: 'other' }) });
        expect(result.current).toBeNull();
    });

    it('reacts again after a re-vote with new votes', () => {
        const { rerender } = renderHook(
            ({ ticket }) => useConsensusConfetti(ticket, true),
            { initialProps: { ticket: chaotic } }
        );
        vi.mocked(confetti).mockClear();
        rerender({ ticket: agreed });
        expect(confetti).toHaveBeenCalled();
    });
});
