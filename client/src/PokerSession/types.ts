import { UserModel } from '../User/User';

export interface PokerSessionProps {
  roomName: string;
}

export interface VoteModel {
  userSub: string | undefined;
  vote: number;
}

export interface VoteReceivedSocketModel {
  ticketId: string;
  vote: number;
  userSub: string;
}

export interface TicketsAndUsers {
  tickets: TicketForVoting[];
  users: UserModel[];
  adminId: number;
}

export interface TicketForVoting {
  ticketId: string;
  ticketNumber: string;
  ticketUrl: string;
  votes: VoteModel[];
  averageVote?: number;
  standardDeviation?: number;
  chosenEstimate?: number;
}
