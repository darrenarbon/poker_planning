import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import JoinRoomPage from './features/joinRoom/JoinRoomPage';
import PokerSessionPage from './features/pokerSession/PokerSessionPage';
import SetTicketsPage from './features/setTickets/SetTicketsPage';
import { paths } from './routes';

const App = () => (
    <BrowserRouter>
        <Routes>
            <Route path={paths.home} element={<JoinRoomPage />} />
            <Route path={paths.roomTickets} element={<SetTicketsPage />} />
            <Route path={paths.roomVoting} element={<PokerSessionPage />} />
        </Routes>
    </BrowserRouter>
);

export default App;
