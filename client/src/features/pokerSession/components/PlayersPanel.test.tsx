import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTicket, makeUserModel } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import PlayersPanel from './PlayersPanel';

describe('PlayersPanel', () => {
    it('renders nothing without a current ticket', () => {
        const { container } = renderWithSession(<PlayersPanel />);
        expect(container).toBeEmptyDOMElement();
    });

    it('lists players and how many have voted', () => {
        renderWithSession(<PlayersPanel />, {
            currentTicket: makeTicket({
                votes: [{ usersub: 'user-1', vote: 5 }],
            }),
            users: [
                makeUserModel(),
                makeUserModel({ auth0_sub: 'bob', given_name: 'Bob' }),
            ],
        });
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('1 of 2 voted')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '1'
        );
    });
});
