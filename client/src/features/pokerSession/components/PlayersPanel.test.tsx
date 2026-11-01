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
            onlineSubs: ['user-1', 'bob'],
        });
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('1 of 2 online voted')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '1'
        );
    });

    it('only counts players who are online, and lists offline ones last', () => {
        renderWithSession(<PlayersPanel />, {
            currentTicket: makeTicket({
                votes: [{ usersub: 'gone', vote: 5 }],
            }),
            users: [
                makeUserModel({ auth0_sub: 'gone', given_name: 'Gone' }),
                makeUserModel({ auth0_sub: 'here', given_name: 'Here' }),
            ],
            onlineSubs: ['here'],
        });
        expect(screen.getByText('0 of 1 online voted')).toBeInTheDocument();
        const rows = screen.getAllByRole('listitem');
        expect(rows[0]).toHaveTextContent('Here');
        expect(rows[1]).toHaveTextContent('Gone Lovelace (offline)');
        expect(rows[1]).toHaveClass('player-offline');
    });
});
