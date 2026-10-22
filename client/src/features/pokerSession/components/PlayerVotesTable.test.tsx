import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTicket, makeUserModel } from '../../../test/factories';
import PlayerVotesTable from './PlayerVotesTable';

const users = [
    makeUserModel({ auth0_sub: 'me', given_name: 'Ada' }),
    makeUserModel({ auth0_sub: 'bob', given_name: 'Bob', family_name: 'Ross' }),
    makeUserModel({
        auth0_sub: 'cat',
        given_name: undefined,
        nickname: 'cat.nick',
    }),
    makeUserModel({ auth0_sub: 'dan', given_name: 'Dan', family_name: 'D' }),
];

const ticket = makeTicket({
    votes: [
        { usersub: 'me', vote: 3 },
        { usersub: 'bob', vote: 8 },
        { usersub: 'cat', vote: 0 },
    ],
});

const voteFor = (name: string) =>
    screen.getByText(name).closest('li')!.querySelector('.vote-badge')!
        .textContent;

describe('PlayerVotesTable', () => {
    it('hides other players votes until revealed', () => {
        render(
            <PlayerVotesTable
                ticket={ticket}
                users={users}
                currentUserSub="me"
                showVotes={false}
            />
        );
        expect(voteFor('Ada Lovelace')).toBe('3');
        expect(voteFor('Bob Ross')).toBe('Voted');
        expect(voteFor('cat.nick')).toBe('Voted');
        expect(voteFor('Dan D')).toBe('Not Voted');
    });

    it('shows every vote once revealed', () => {
        render(
            <PlayerVotesTable
                ticket={ticket}
                users={users}
                currentUserSub="me"
                showVotes
            />
        );
        expect(voteFor('Bob Ross')).toBe('8');
        expect(voteFor('cat.nick')).toBe('No Idea');
        expect(voteFor('Dan D')).toBe('Not Voted');
    });

    it("hides the current user's vote in refinement mode", () => {
        render(
            <PlayerVotesTable
                ticket={ticket}
                users={users}
                currentUserSub="me"
                showVotes={false}
                hideOwnVote
            />
        );
        expect(voteFor('Ada Lovelace')).toBe('Voted');
    });

    it('bolds the current user', () => {
        render(
            <PlayerVotesTable
                ticket={ticket}
                users={users}
                currentUserSub="me"
                showVotes={false}
            />
        );
        expect(screen.getByText('Ada Lovelace')).toHaveClass('fw-bold');
        expect(screen.getByText('Bob Ross')).not.toHaveClass('fw-bold');
    });
});
