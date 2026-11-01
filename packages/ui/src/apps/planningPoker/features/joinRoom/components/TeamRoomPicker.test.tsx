import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamRoomPicker from './TeamRoomPicker';

const getTeam = vi.fn();

// stable references, like the real hooks, or the picker's effect re-runs forever
const auth = { user: { sub: 'me' } };
const api = { getTeam };
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => auth }));
vi.mock('../../../../../hooks', () => ({ useApi: () => api }));

const teams = [
    {
        team_id: 4,
        name: 'Platform',
        created_at: '',
        role: 'owner',
        member_count: 3,
    },
] as never;

const member = (sub: string, givenName: string) => ({
    userId: 1,
    sub,
    givenName,
    familyName: 'X',
    role: 'member',
    joinedAt: '',
});

describe('TeamRoomPicker', () => {
    const onChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        getTeam.mockResolvedValue({
            members: [
                member('me', 'Me'),
                member('a', 'Ann'),
                member('b', 'Bob'),
            ],
        });
    });

    it('starts with no team', () => {
        render(<TeamRoomPicker teams={teams} onChange={onChange} />);
        expect(onChange).toHaveBeenLastCalledWith(undefined);
        expect(screen.queryByText(/Add people/)).not.toBeInTheDocument();
    });

    it('ticks everyone but the creator once a team is chosen', async () => {
        render(<TeamRoomPicker teams={teams} onChange={onChange} />);
        await userEvent.selectOptions(screen.getByLabelText('Team'), '4');

        expect(await screen.findByLabelText('Ann X')).toBeChecked();
        expect(screen.getByLabelText('Bob X')).toBeChecked();
        expect(screen.queryByLabelText('Me X')).not.toBeInTheDocument();
        await waitFor(() =>
            expect(onChange).toHaveBeenLastCalledWith({
                teamId: 4,
                memberSubs: ['a', 'b'],
                coFacilitatorSubs: [],
            })
        );
    });

    it('lets people be left out or made co-facilitators', async () => {
        render(<TeamRoomPicker teams={teams} onChange={onChange} />);
        await userEvent.selectOptions(screen.getByLabelText('Team'), '4');
        await screen.findByLabelText('Ann X');

        await userEvent.click(screen.getByLabelText('Bob X'));
        await userEvent.click(screen.getAllByLabelText('Co-facilitator')[0]);
        await waitFor(() =>
            expect(onChange).toHaveBeenLastCalledWith({
                teamId: 4,
                memberSubs: ['a'],
                coFacilitatorSubs: ['a'],
            })
        );
    });

    it('keeps co-facilitators in the room', async () => {
        render(<TeamRoomPicker teams={teams} onChange={onChange} />);
        await userEvent.selectOptions(screen.getByLabelText('Team'), '4');
        await screen.findByLabelText('Ann X');
        await userEvent.click(screen.getAllByLabelText('Co-facilitator')[0]);
        // leaving them out takes the co-facilitator role away too
        await userEvent.click(screen.getByLabelText('Ann X'));
        await waitFor(() =>
            expect(onChange).toHaveBeenLastCalledWith({
                teamId: 4,
                memberSubs: ['b'],
                coFacilitatorSubs: [],
            })
        );
    });
});
