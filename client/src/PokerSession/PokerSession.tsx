import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Ticket from '../Ticket';
import User from '../User';
import Voting from '../Voting';
import SetEstimate from '../SetEstimate';
import { UserModel } from '../User/User';
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
        socket.emit('join', { roomName, userSub: user?.sub });
        socket.on('userJoined', ({ users }) => {
            setUsers(users);
        });
        socket.on(
            'voteReceived',
            ({ ticketId, vote, userSub }: VoteReceivedSocketModel) => {
                const ticket = tickets.find((t) => t.ticketId === ticketId);
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
                        t.ticketId === ticketId ? updatedTicket : t
                    )
                );
            }
        );
        socket.on('showVotes', ({ ticketId }) => {
            if (currentTicket && ticketId === currentTicket?.ticketId) {
                const updatedTicket = socket_showVotes(currentTicket);
                setCurrentTicket(updatedTicket);
                setTickets((prevTickets) =>
                    prevTickets.map((t) =>
                        t.ticketId === ticketId ? updatedTicket : t
                    )
                );
                setShowVotes(true);
            }
        });
        socket.on('showEstimate', ({ currentTicket }) => {
            setTickets((prevTickets) =>
                prevTickets.map((t) =>
                    t.ticketId === currentTicket.ticketId ? currentTicket : t
                )
            );
            // this currently wipes the currentTicket reference so will need to handle that
        });
    }, [currentTicket, roomName, tickets, user]);

    const selectTicket = (ticket: TicketForVoting) => {
        setCurrentTicket(ticket);
        setShowVotes(false);
    };

    const submitVote = (vote: number) => {
        socket.emit('vote', {
            roomName,
            ticketId: currentTicket?.ticketId,
            vote,
            userSub: user?.sub,
        });
        const ticket = tickets.find(
            (t) => t.ticketNumber === currentTicket?.ticketNumber
        );
        if (!ticket) {
            return;
        }
        const voteForUser = ticket.votes.find((v) => v.userSub === user?.sub);
        if (voteForUser) {
            voteForUser.vote = vote;
        } else {
            ticket.votes.push({
                vote,
                userSub: user?.sub,
            });
        }
        setTickets((prevTickets) =>
            prevTickets.map((t) =>
                t.ticketNumber === currentTicket?.ticketNumber ? ticket : t
            )
        );
    };

    const setEstimate = async (estimate: number) => {
        if (currentTicket) {
            currentTicket.chosenEstimate = estimate;
            setTickets((prevTickets) =>
                prevTickets.map((t) =>
                    t.ticketNumber === currentTicket.ticketNumber
                        ? currentTicket
                        : t
                )
            );
            socket.emit('setEstimate', { roomName, currentTicket });
        }
    };

    return (
        <main>
            <NavBar auth0User={user} />
            {user && (
                <div>
                    <div>
                        <h3>Players</h3>
                        {users.map((u) => (
                            <User
                                key={u.auth0_sub}
                                userSub={user.sub}
                                user={u}
                            />
                        ))}
                        <hr />
                    </div>
                    <div className="container">
                        <h3>Tickets</h3>
                        <div className="row">
                            {tickets.map((ticket) => (
                                <Ticket
                                    key={ticket.ticketNumber}
                                    ticket={ticket}
                                    selectTicket={selectTicket}
                                    currentTicket={currentTicket}
                                    userSub={user.sub}
                                    adminId={adminId}
                                />
                            ))}
                        </div>
                        <hr />
                    </div>
                    {currentTicket && (
                        <div>
                            <h3>
                                Voting on ticket: {currentTicket.ticketNumber}
                            </h3>
                            <Voting
                                allUsers={users}
                                submitVote={submitVote}
                                currentTicket={currentTicket}
                                userSub={user.sub}
                                showVotes={showVotes}
                            />
                        </div>
                    )}

                    {adminId === user.sub && currentTicket && (
                        <>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() =>
                                    console.log(
                                        'CONVERT TO socket.emit',
                                        'showVotes',
                                        {
                                            roomName,
                                            ticketId: currentTicket?.ticketId,
                                        }
                                    )
                                }
                            >
                                Show Votes
                            </button>
                            <hr />
                            <SetEstimate
                                setEstimate={setEstimate}
                                currentTicket={currentTicket}
                            />
                        </>
                    )}
                </div>
            )}
        </main>
    );
};

export default PokerSession;
