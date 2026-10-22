import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import AuthProvider from './components/AuthProvider';
import RequireLogin from './components/RequireLogin';
import JoinRoomPage from './features/joinRoom/JoinRoomPage';
import PokerSessionPage from './features/pokerSession/PokerSessionPage';
import SetTicketsPage from './features/setTickets/SetTicketsPage';
import { paths } from './routes';

const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <Routes>
                <Route path={paths.home} element={<JoinRoomPage />} />
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
