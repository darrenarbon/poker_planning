import { Navigate, Route, useLocation } from 'react-router-dom';
import RequireLogin from '../../components/RequireLogin';
import JoinRoomPage from './features/joinRoom/JoinRoomPage';
import NewRoomPage from './features/joinRoom/NewRoomPage';
import RoomsPage from './features/joinRoom/RoomsPage';
import LoggedOutWelcome from './features/joinRoom/components/LoggedOutWelcome';
import PokerSessionPage from './features/pokerSession/PokerSessionPage';
import SetTicketsPage from './features/setTickets/SetTicketsPage';
import { legacyPokerPaths, pokerPaths } from './routes';

/** Sends old links (e.g. a room invite shared before the move) to /poker */
const LegacyRedirect = () => {
    const { pathname, search } = useLocation();
    return <Navigate to={`${pokerPaths.home}${pathname}${search}`} replace />;
};

/**
 * Planning poker's pages. Called as a function, not rendered as a component,
 * because <Routes> only accepts <Route> children.
 */
const PlanningPokerRoutes = () => [
    <Route key="home" path={pokerPaths.home} element={<RoomsPage />} />,
    <Route
        key="join"
        path={pokerPaths.joinRoom}
        element={
            <RequireLogin loggedOut={<LoggedOutWelcome />}>
                <JoinRoomPage />
            </RequireLogin>
        }
    />,
    <Route
        key="new"
        path={pokerPaths.newRoom}
        element={
            <RequireLogin loggedOut={<LoggedOutWelcome />}>
                <NewRoomPage />
            </RequireLogin>
        }
    />,
    <Route
        key="tickets"
        path={pokerPaths.roomTickets}
        element={
            <RequireLogin loggedOut={<LoggedOutWelcome />}>
                <SetTicketsPage />
            </RequireLogin>
        }
    />,
    <Route
        key="voting"
        path={pokerPaths.roomVoting}
        element={
            <RequireLogin loggedOut={<LoggedOutWelcome invited />}>
                <PokerSessionPage />
            </RequireLogin>
        }
    />,
    ...legacyPokerPaths.map((path) => (
        <Route key={path} path={path} element={<LegacyRedirect />} />
    )),
];

export default PlanningPokerRoutes;
