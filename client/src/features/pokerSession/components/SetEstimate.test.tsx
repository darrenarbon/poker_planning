import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SetEstimate from './SetEstimate';

describe('SetEstimate', () => {
    it('highlights the chosen estimate', () => {
        render(<SetEstimate chosenEstimate={8} onSetEstimate={vi.fn()} />);
        expect(screen.getByRole('button', { name: '8' })).toHaveClass(
            'btn-primary'
        );
        expect(screen.getByRole('button', { name: '5' })).toHaveClass(
            'btn-outline-primary'
        );
    });

    it('sets an estimate', async () => {
        const onSetEstimate = vi.fn();
        render(
            <SetEstimate
                chosenEstimate={undefined}
                onSetEstimate={onSetEstimate}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: '21' }));
        expect(onSetEstimate).toHaveBeenCalledWith(21);
    });

    it('resets the estimate to 0', async () => {
        const onSetEstimate = vi.fn();
        render(
            <SetEstimate chosenEstimate={8} onSetEstimate={onSetEstimate} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Reset Estimate' })
        );
        expect(onSetEstimate).toHaveBeenCalledWith(0);
    });
});
