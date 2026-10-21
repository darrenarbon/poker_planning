import io, { Socket } from 'socket.io-client';
import config from '../config';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

export type PokerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: PokerSocket = io(config.apiUrl);
