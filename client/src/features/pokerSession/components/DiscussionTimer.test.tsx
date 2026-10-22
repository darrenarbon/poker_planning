import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithSession } from '../../../test/renderWithSession';
import DiscussionTimer from './DiscussionTimer';

describe('DiscussionTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });
    afterEach(() => vi.useRealTimers());

    it('is hidden from voters when no timer is running', () => {
        const { container } = renderWithSession(<DiscussionTimer />);
        expect(container).toBeEmptyDOMElement();
    });

    it('counts down to the shared end time and says when time is up', () => {
        renderWithSession(<DiscussionTimer />, { timerEndsAt: 65_000 });
        expect(screen.getByRole('timer')).toHaveTextContent('1:05');
        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.getByRole('timer')).toHaveTextContent('0:05');
        act(() => vi.advanceTimersByTime(6_000));
        expect(screen.getByRole('timer')).toHaveTextContent("Time's up");
    });

    it('lets a facilitator start a preset or custom timer', () => {
        const { session } = renderWithSession(<DiscussionTimer />, {
            isAdmin: true,
        });
        fireEvent.click(screen.getByRole('button', { name: '2 min' }));
        expect(session.startTimer).toHaveBeenCalledWith(120);

        fireEvent.change(screen.getByLabelText('Custom minutes'), {
            target: { value: '1.5' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        expect(session.startTimer).toHaveBeenCalledWith(90);
    });

    it('lets a facilitator stop a running timer', () => {
        const { session } = renderWithSession(<DiscussionTimer />, {
            isAdmin: true,
            timerEndsAt: 30_000,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
        expect(session.stopTimer).toHaveBeenCalled();
    });
});
