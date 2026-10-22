import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeRoom, makeUserModel } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import FacilitatorsPanel from './FacilitatorsPanel';

const owner = makeUserModel({ auth0_sub: 'admin-1', given_name: 'Owner' });
const bob = makeUserModel({ auth0_sub: 'bob', given_name: 'Bob' });
const cat = makeUserModel({ auth0_sub: 'cat', given_name: 'Cat' });

const renderPanel = () =>
    renderWithSession(<FacilitatorsPanel />, {
        isOwner: true,
        isAdmin: true,
        room: makeRoom({ adminSub: 'admin-1', coFacilitatorSubs: ['cat'] }),
        users: [owner, bob, cat],
    });

describe('FacilitatorsPanel', () => {
    it('is only shown to the owner', () => {
        const { container } = renderWithSession(<FacilitatorsPanel />, {
            isAdmin: true,
        });
        expect(container).toBeEmptyDOMElement();
    });

    it('lists the owner and co-facilitators', () => {
        renderPanel();
        expect(screen.getByText('Owner Lovelace (owner)')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')[1]).toHaveTextContent(
            'Cat Lovelace'
        );
    });

    it('adds and removes co-facilitators', () => {
        const { session } = renderPanel();
        fireEvent.change(screen.getByLabelText('Player'), {
            target: { value: 'bob' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Make co-facilitator' })
        );
        expect(session.addCoFacilitator).toHaveBeenCalledWith('bob');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Remove Cat Lovelace as co-facilitator',
            })
        );
        expect(session.removeCoFacilitator).toHaveBeenCalledWith('cat');
    });

    it('hands the room over after confirming', () => {
        const { session } = renderPanel();
        fireEvent.change(screen.getByLabelText('Player'), {
            target: { value: 'bob' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Hand over room' }));
        expect(session.handOver).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Hand over' }));
        expect(session.handOver).toHaveBeenCalledWith('bob');
    });

    it('is hidden in refinement mode', () => {
        const { container } = renderWithSession(<FacilitatorsPanel />, {
            isOwner: true,
            isAdmin: true,
            refinementMode: true,
        });
        expect(container).toBeEmptyDOMElement();
    });
});
