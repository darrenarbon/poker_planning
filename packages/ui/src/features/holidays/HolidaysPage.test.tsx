import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HolidaysPage from './HolidaysPage';

vi.mock('../../components/NavBar', () => ({ default: () => null }));
vi.mock('./HolidaysPanel', () => ({ default: () => <p>holiday panel</p> }));

describe('HolidaysPage', () => {
    it('shows the holidays panel under a heading', () => {
        render(<HolidaysPage />);
        expect(
            screen.getByRole('heading', { name: 'Annual leave', level: 1 })
        ).toBeInTheDocument();
        expect(screen.getByText('holiday panel')).toBeInTheDocument();
    });
});
