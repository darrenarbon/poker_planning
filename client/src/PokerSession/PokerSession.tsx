import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Voting from '../Voting';
import { UserModel } from '../Users/SingleUser/SingleUser';
import NavBar from '../NavBar';
import { useAuth0 } from '@auth0/auth0-react';
import config from '../config';

import {
    JiraTicket,
    PokerSessionProps,
    Room,
    TicketForVoting,
    TicketsAndUsers,
    VoteReceivedSocketModel,
} from './types';
import { socket_showVotes, socket_voteReceived } from './socketHelper';
import Tickets from '../Tickets';
import VotingComplete from '../VotingComplete';
import TicketEstimateAdminPanel from '../TicketEstimateAdminPanel';
import AverageVote from '../AverageVote';
import RoomHeader from '../RoomHeader';
import Loading from '../Loading';
import { useSearchParams } from 'react-router-dom';

const socket = io(config.apiUrl);

const fetchTicketsAndUsers = async (roomId: string, token: string) => {
    const response = await fetch(`${config.apiUrl}/rooms/${roomId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    return await response.json();
};

const PokerSession = ({ roomName }: PokerSessionProps) => {
    const [tickets, setTickets] = useState<TicketForVoting[]>([]);
    const [users, setUsers] = useState<UserModel[]>([]);
    const [showVotes, setShowVotes] = useState<boolean>(false);
    const [currentTicket, setCurrentTicket] =
        useState<TicketForVoting | null>();
    const [jiraTicketData, setJiraTicketData] = useState<JiraTicket>({
        summary: '',
        description: '',
        creator: '',
        parent: '',
        priority: '',
    });
    const [room, setRoom] = useState<Room>();
    const { user, getAccessTokenSilently } = useAuth0();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        async function fetchData() {
            const token = await getAccessTokenSilently();
            const ticketsAndUsers: TicketsAndUsers = await fetchTicketsAndUsers(
                roomName,
                token
            );
            const { tickets, users, room } = ticketsAndUsers;
            setTickets(tickets);
            setUsers(users);
            setRoom(room);
        }
        fetchData();
    }, [roomName, getAccessTokenSilently]);

    useEffect(() => {
        if (user) {
            socket.emit('join', { roomName, userSub: user.sub });
        }
    }, [roomName, user]);

    useEffect(() => {
        async function fetchTicketData() {
            if (!currentTicket?.ticket_number) {
                return;
            }
            const token = await getAccessTokenSilently();
            const response = await fetch(
                `${config.apiUrl}/jira-tickets/${currentTicket.ticket_number}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const jiraTicketInformation = await response.json();
            const jiraTicket: JiraTicket = {
                summary: jiraTicketInformation.fields.summary,
                description: jiraTicketInformation.renderedFields.description,
                creator: jiraTicketInformation.fields.creator.displayName,
                parent:
                    jiraTicketInformation.fields.parent?.fields.summary || '',
                priority: jiraTicketInformation.fields.priority.name,
            };
            setJiraTicketData(jiraTicket);
        }
        fetchTicketData();
    }, [roomName, getAccessTokenSilently, currentTicket?.ticket_number]);

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

    const deleteCurrentTicket = async () => {
        if (!currentTicket) {
            return;
        }
        const conf = confirm(
            `Are you sure you want to delete ticket ${currentTicket?.ticket_number}? This action cannot be undone.`
        );
        if (!conf) {
            return;
        }
        const token = await getAccessTokenSilently();
        const response = await fetch(
            `${config.apiUrl}/tickets/${currentTicket.ticket_id}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        if (!response.ok) {
            console.error('Failed to delete ticket');
            return;
        }
        setTickets((prevTickets) =>
            prevTickets.filter((t) => t.ticket_id !== currentTicket.ticket_id)
        );
        setCurrentTicket(null);
    };

    const addNewTicket = async (ticketNumber: string) => {
        if (!ticketNumber) {
            return;
        }
        const token = await getAccessTokenSilently();
        const response = await fetch(
            `${config.apiUrl}/rooms/${roomName}/ticket`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ticketNumber,
                }),
            }
        );
        if (!response.ok) {
            console.error('Failed to add new ticket');
            return;
        }
        const newTicket: TicketForVoting = await response.json();
        newTicket.votes = [];
        setTickets((prevTickets) => [newTicket, ...prevTickets]);
    };

    const isAdmin =
        user?.sub === room?.adminSub || searchParams.get('admin') === 'true';

    return (
        <main>
            <NavBar auth0User={user} />
            {user && room ? (
                <>
                    <div className="container-fluid">
                        <div className="row" style={{ height: '90vh' }}>
                            <div
                                className="col-2 border-end"
                                style={{ overflowY: 'auto', height: '90vh' }}
                            >
                                <Tickets
                                    tickets={tickets}
                                    selectTicket={selectTicket}
                                    currentTicket={currentTicket}
                                    loggedInUser={user}
                                    isAdmin={isAdmin}
                                    addNewTicket={addNewTicket}
                                    ticketBaseUrl={room?.ticketBaseUrl}
                                />
                            </div>
                            <div
                                className="col-10"
                                style={{ overflowY: 'auto', height: '90vh' }}
                            >
                                <RoomHeader room={room} />
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
                                                jiraTicketData={jiraTicketData}
                                            />
                                        )}
                                        {showVotes && currentTicket && (
                                            <AverageVote
                                                currentTicket={currentTicket}
                                            />
                                        )}
                                        {isAdmin && currentTicket && (
                                            <TicketEstimateAdminPanel
                                                roomName={roomName}
                                                currentTicket={currentTicket}
                                                setEstimate={setEstimate}
                                                socket={socket}
                                                deleteCurrentTicket={
                                                    deleteCurrentTicket
                                                }
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
            ) : (
                <Loading />
            )}
        </main>
    );
};

export default PokerSession;
