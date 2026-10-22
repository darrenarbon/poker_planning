import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import AuthProvider from './components/AuthProvider';
import RequireLogin from './components/RequireLogin';
import JoinRoomPage from './features/joinRoom/JoinRoomPage';
import NewRoomPage from './features/joinRoom/NewRoomPage';
import RoomsPage from './features/joinRoom/RoomsPage';
import PokerSessionPage from './features/pokerSession/PokerSessionPage';
import SetTicketsPage from './features/setTickets/SetTicketsPage';
import SettingsPage from './features/settings/SettingsPage';
import { useUserSettings } from './hooks';
import { paths } from './routes';

/** Applies the logged-in user's saved default theme on any page */
const ThemeDefault = () => {
    const { isAuthenticated } = useAuth0();
    return isAuthenticated ? <LoadSettings /> : null;
};

const LoadSettings = () => {
    useUserSettings();
    return null;
};

const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <ThemeDefault />
            <Routes>
                <Route path={paths.home} element={<RoomsPage />} />
                <Route
                    path={paths.joinRoom}
                    element={
                        <RequireLogin>
                            <JoinRoomPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.newRoom}
                    element={
                        <RequireLogin>
                            <NewRoomPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.settings}
                    element={
                        <RequireLogin>
                            <SettingsPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.roomTickets}
                    element={
                        <RequireLogin>
                            <SetTicketsPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.roomVoting}
                    element={
                        <RequireLogin invited>
                            <PokerSessionPage />
                        </RequireLogin>
                    }
                />
            </Routes>
        </AuthProvider>
    </BrowserRouter>
);

export default App;
