import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeRoom } from '../../../test/factories';
import RoomHeader from './RoomHeader';

describe('RoomHeader', () => {
    it('shows the friendly name and room name', () => {
        render(<RoomHeader room={makeRoom()} />);
        expect(
            screen.getByRole('heading', { name: 'Sprint Planning (room-abc)' })
        ).toBeInTheDocument();
    });
});
