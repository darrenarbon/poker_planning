import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getApp } from '../apps';
import ComingSoonPage from './ComingSoonPage';

vi.mock('./NavBar', () => ({ default: () => <nav /> }));

describe('ComingSoonPage', () => {
    it('describes the app and links back to the homepage', () => {
        render(<ComingSoonPage app={getApp('sprintCapacity')} />);
        expect(
            screen.getByRole('heading', { name: 'Sprint Capacity Planner' })
        ).toBeInTheDocument();
        expect(screen.getByText('Coming soon')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute(
            'href',
            '/'
        );
    });
});
