import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { votingValues } from '../constants';
import VoteValueButtons from './VoteValueButtons';

describe('VoteValueButtons', () => {
    it('renders a button for every card', () => {
        render(<VoteValueButtons selected={null} onSelect={vi.fn()} />);
        expect(screen.getAllByRole('button')).toHaveLength(votingValues.length);
        expect(screen.getByRole('button', { name: 'No Idea' })).toBeVisible();
    });

    it('highlights only the selected value', () => {
        render(<VoteValueButtons selected={5} onSelect={vi.fn()} />);
        expect(screen.getByRole('button', { name: '5' })).toHaveClass(
            'btn-primary'
        );
        expect(screen.getByRole('button', { name: '3' })).toHaveClass(
            'btn-outline-primary'
        );
    });

    it('calls onSelect with the card value', async () => {
        const onSelect = vi.fn();
        render(<VoteValueButtons selected={null} onSelect={onSelect} />);
        await userEvent.click(screen.getByRole('button', { name: '8' }));
        expect(onSelect).toHaveBeenCalledWith(8);
    });

    it('applies the extra button class', () => {
        render(
            <VoteValueButtons
                selected={null}
                onSelect={vi.fn()}
                buttonClassName="btn-xl"
            />
        );
        expect(screen.getByRole('button', { name: '1' })).toHaveClass('btn-xl');
    });

    it('only shows tooltips when asked', () => {
        const { rerender } = render(
            <VoteValueButtons selected={null} onSelect={vi.fn()} />
        );
        expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute(
            'title'
        );

        rerender(
            <VoteValueButtons selected={null} onSelect={vi.fn()} showTooltips />
        );
        expect(screen.getByRole('button', { name: '1' })).toHaveAttribute(
            'title',
            votingValues[1].tooltip
        );
    });
});
