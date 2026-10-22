import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeTicket, makeUserModel } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import SessionStats from './SessionStats';

const ticket = (id: string, ada: number, bob: number) =>
    makeTicket({
        ticket_id: id,
        votes_revealed: true,
        votes: [
            { usersub: 'ada', vote: ada },
            { usersub: 'bob', vote: bob },
        ],
    });

describe('SessionStats', () => {
    it('names the award winners', () => {
        renderWithSession(<SessionStats />, {
            tickets: [ticket('1', 5, 5), ticket('2', 2, 8), ticket('3', 3, 3)],
            users: [
                makeUserModel({ auth0_sub: 'ada', given_name: 'Ada' }),
                makeUserModel({
                    auth0_sub: 'bob',
                    given_name: 'Bob',
                    family_name: 'Smith',
                }),
            ],
        });
        expect(screen.getByText("That's a wrap! 🎉")).toBeInTheDocument();
        expect(
            screen.getByText('Ada Lovelace & Bob Smith')
        ).toBeInTheDocument();
        expect(
            screen.getByText('2 points apart on average')
        ).toBeInTheDocument();
        expect(screen.getByText('1 in a row')).toBeInTheDocument();
        expect(
            screen.getByText('2 of 3 tickets unanimous')
        ).toBeInTheDocument();
    });

    it('closes when dismissed', async () => {
        const { session } = renderWithSession(<SessionStats />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Close sprint stats' })
        );
        expect(session.closeStats).toHaveBeenCalled();
    });

    it('explains how each award is worked out', () => {
        renderWithSession(<SessionStats />);
        expect(
            screen.getByRole('img', {
                name: /How consensus streak is worked out/,
            })
        ).toBeInTheDocument();
        expect(screen.getAllByRole('img', { name: /^How / })).toHaveLength(3);
    });
});
