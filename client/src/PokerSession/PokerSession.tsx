import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Voting from '../Voting';
import { UserModel } from '../Users/SingleUser/SingleUser';
import NavBar from '../NavBar';
import { useAuth0 } from '@auth0/auth0-react';
import config from '../config';

import {
    PokerSessionProps,
    TicketForVoting,
    TicketsAndUsers,
    VoteReceivedSocketModel,
} from './types';
import { socket_showVotes, socket_voteReceived } from './socketHelper';
import Tickets from '../Tickets';
import VotingComplete from '../VotingComplete';
import TicketEstimateAdminPanel from '../TicketEstimateAdminPanel';

const socket = io(config.apiUrl);

const fetchTicketsAndUsers = async (roomId: string) => {
    const response = await fetch(`${config.apiUrl}/room/${roomId}`);
    return await response.json();
};

const PokerSession = ({ roomName }: PokerSessionProps) => {
    const [tickets, setTickets] = useState<TicketForVoting[]>([]);
    const [users, setUsers] = useState<UserModel[]>([]);
    const [showVotes, setShowVotes] = useState<boolean>(false);
    const [currentTicket, setCurrentTicket] =
        useState<TicketForVoting | null>();
    const [adminId, setAdminId] = useState<number>();
    const { user } = useAuth0();

    useEffect(() => {
        async function fetchData() {
            const ticketsAndUsers: TicketsAndUsers = await fetchTicketsAndUsers(
                roomName
            );
            const { tickets, users, adminId } = ticketsAndUsers;
            setTickets(tickets);
            setUsers(users);
            setAdminId(adminId);
        }
        fetchData();
    }, [roomName]);

    useEffect(() => {
        if (user) {
            socket.emit('join', { roomName, userSub: user.sub });
        }
    }, [roomName, user]);

    useEffect(() => {
        socket.on('userJoined', ({ users }) => {
            setUsers(users);
        });
        socket.on(
            'voteReceived',
            ({ ticketId, vote, userSub }: VoteReceivedSocketModel) => {
                const ticket = tickets.find((t) => t.ticket_id === ticketId);
                if (!ticket) {
                    return;
                }
                const updatedTicket = socket_voteReceived(
                    ticket,
                    vote,
                    userSub
                );
                setTickets((prevTickets) =>
                    prevTickets.map((t) =>
                        t.ticket_id === ticketId ? updatedTicket : t
                    )
                );
            }
        );
        socket.on('showVotes', ({ ticketId }) => {
            if (currentTicket && ticketId === currentTicket?.ticket_id) {
                const updatedTicket = socket_showVotes(currentTicket);
                setCurrentTicket(updatedTicket);
                setTickets((prevTickets) =>
                    prevTickets.map((t) =>
                        t.ticket_id === ticketId ? updatedTicket : t
                    )
                );
                setShowVotes(true);
            }
        });
        socket.on('showEstimate', ({ currentTicket }) => {
            setTickets((prevTickets) =>
                prevTickets.map((t) =>
                    t.ticket_id === currentTicket.ticket_id ? currentTicket : t
                )
            );
            setCurrentTicket(currentTicket);
        });
    }, [currentTicket, roomName, tickets, user]);

    const selectTicket = (ticket: TicketForVoting) => {
        setCurrentTicket(ticket);
        setShowVotes(false);
    };

    const submitVote = (vote: number) => {
        socket.emit('vote', {
            roomName,
            ticketId: currentTicket?.ticket_id,
            vote,
            userSub: user?.sub,
        });
        const ticket = tickets.find(
            (t) => t.ticket_number === currentTicket?.ticket_number
        );
        if (!ticket) {
            return;
        }
        const voteForUser = ticket.votes.find((v) => v.usersub === user?.sub);
        if (voteForUser) {
            voteForUser.vote = vote;
        } else {
            ticket.votes.push({
                vote,
                usersub: user?.sub,
            });
        }
        setTickets((prevTickets) =>
            prevTickets.map((t) =>
                t.ticket_number === currentTicket?.ticket_number ? ticket : t
            )
        );
        setCurrentTicket(ticket);
    };

    const setEstimate = async (estimate: number) => {
        if (currentTicket) {
            currentTicket.chosen_estimate = estimate;

            setTickets((prevTickets) =>
                prevTickets.map((t) =>
                    t.ticket_number === currentTicket.ticket_number
                        ? currentTicket
                        : t
                )
            );
            socket.emit('setEstimate', { roomName, currentTicket });
        }
    };

    const isAdmin = user?.sub === adminId;

    return (
        <main>
            <NavBar auth0User={user} />
            {user && (
                <>
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-2 border-end">
                                <Tickets
                                    tickets={tickets}
                                    selectTicket={selectTicket}
                                    currentTicket={currentTicket}
                                    loggedInUser={user}
                                />
                            </div>
                            <div className="col-10">
                                {currentTicket ? (
                                    <>
                                        {currentTicket.chosen_estimate &&
                                        !isAdmin ? (
                                            <VotingComplete
                                                currentTicket={currentTicket}
                                            />
                                        ) : (
                                            <Voting
                                                allUsers={users}
                                                submitVote={submitVote}
                                                currentTicket={currentTicket}
                                                userSub={user.sub}
                                                showVotes={showVotes}
                                            />
                                        )}
                                        {isAdmin && currentTicket && (
                                            <TicketEstimateAdminPanel
                                                roomName={roomName}
                                                currentTicket={currentTicket}
                                                setEstimate={setEstimate}
                                                socket={socket}
                                                showVotes={showVotes}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <h4 className="text-center">
                                        Select a ticket to start voting
                                    </h4>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
};

export default PokerSession;
