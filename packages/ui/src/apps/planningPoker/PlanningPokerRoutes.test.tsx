import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PlanningPokerRoutes from './PlanningPokerRoutes';

// stand in for each page with the path it was rendered at
const { ShowPath } = await vi.hoisted(async () => {
    const { useLocation } = await import('react-router-dom');
    const ShowPath = () => {
        const { pathname, search } = useLocation();
        return <p>at {pathname + search}</p>;
    };
    return { ShowPath };
});
vi.mock('../../components/RequireLogin', () => ({ default: ShowPath }));
vi.mock('./features/joinRoom/RoomsPage', () => ({ default: ShowPath }));

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>{PlanningPokerRoutes()}</Routes>
        </MemoryRouter>
    );

describe('PlanningPokerRoutes', () => {
    it('serves planning poker under /poker', () => {
        renderAt('/poker/room/abc/voting');
        expect(
            screen.getByText('at /poker/room/abc/voting')
        ).toBeInTheDocument();
    });

    it('redirects room links shared before the move', () => {
        renderAt('/room/abc/voting?x=1');
        expect(
            screen.getByText('at /poker/room/abc/voting?x=1')
        ).toBeInTheDocument();
    });

    it('redirects the old new and join room pages', () => {
        renderAt('/rooms/new');
        expect(screen.getByText('at /poker/rooms/new')).toBeInTheDocument();
    });
});
