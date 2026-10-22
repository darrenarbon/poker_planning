import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
    it('shows its text on hover, even around a disabled button', async () => {
        render(
            <Tooltip text="Explains the button">
                <button disabled>Do it</button>
            </Tooltip>
        );
        fireEvent.mouseOver(screen.getByRole('button').parentElement!);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Explains the button'
        );
    });

    it('keeps the button name unchanged', () => {
        render(
            <Tooltip text="Explains the button">
                <button>Do it</button>
            </Tooltip>
        );
        expect(screen.getByRole('button', { name: 'Do it' })).toBeVisible();
    });
});
