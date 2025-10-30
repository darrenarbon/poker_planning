import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import PokerSession from './PokerSession';
import SetTickets from './SetTickets';
import JoinRoom from './JoinRoom';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<JoinRoom />} />
                <Route
                    path="/rooms/:roomName/tickets"
                    element={<SetTickets />}
                />
                <Route
                    path="/rooms/:roomName/voting"
                    element={<PokerSession />}
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
