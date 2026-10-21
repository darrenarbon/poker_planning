import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorAlert from './ErrorAlert';

describe('ErrorAlert', () => {
    it('renders nothing without a message', () => {
        const { container } = render(<ErrorAlert message={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the message as an alert', () => {
        render(<ErrorAlert message="Something broke" />);
        expect(screen.getByRole('alert')).toHaveTextContent('Something broke');
    });

    it('has no dismiss button without onDismiss', () => {
        render(<ErrorAlert message="Something broke" />);
        expect(
            screen.queryByRole('button', { name: 'Dismiss' })
        ).not.toBeInTheDocument();
    });

    it('calls onDismiss when dismissed', async () => {
        const onDismiss = vi.fn();
        render(<ErrorAlert message="Something broke" onDismiss={onDismiss} />);
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(onDismiss).toHaveBeenCalledOnce();
    });
});
