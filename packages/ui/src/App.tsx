import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import PlanningPokerRoutes from './apps/planningPoker/PlanningPokerRoutes';
import SkillsMatrixPage from './apps/skillsMatrix/SkillsMatrixPage';
import { skillsPaths } from './apps/skillsMatrix/routes';
import SprintCapacityPage from './apps/sprintCapacity/SprintCapacityPage';
import SprintPage from './apps/sprintCapacity/SprintPage';
import TeamCapacityPage from './apps/sprintCapacity/TeamCapacityPage';
import { capacityPaths } from './apps/sprintCapacity/routes';
import AuthProvider from './components/AuthProvider';
import RequireLogin from './components/RequireLogin';
import HomePage from './features/home/HomePage';
import HolidaysPage from './features/holidays/HolidaysPage';
import InvitePage from './features/teams/InvitePage';
import TeamPage from './features/teams/TeamPage';
import TeamsPage from './features/teams/TeamsPage';
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
                <Route path={paths.home} element={<HomePage />} />
                <Route
                    path={paths.settings}
                    element={
                        <RequireLogin>
                            <SettingsPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.holidays}
                    element={
                        <RequireLogin>
                            <HolidaysPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.teams}
                    element={
                        <RequireLogin>
                            <TeamsPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.team}
                    element={
                        <RequireLogin>
                            <TeamPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={paths.invite}
                    element={
                        <RequireLogin>
                            <InvitePage />
                        </RequireLogin>
                    }
                />
                {PlanningPokerRoutes()}
                <Route
                    path={capacityPaths.home}
                    element={
                        <RequireLogin>
                            <SprintCapacityPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={capacityPaths.team}
                    element={
                        <RequireLogin>
                            <TeamCapacityPage />
                        </RequireLogin>
                    }
                />
                <Route
                    path={capacityPaths.sprint}
                    element={
                        <RequireLogin>
                            <SprintPage />
                        </RequireLogin>
                    }
                />
                <Route path={skillsPaths.home} element={<SkillsMatrixPage />} />
            </Routes>
        </AuthProvider>
    </BrowserRouter>
);

export default App;
