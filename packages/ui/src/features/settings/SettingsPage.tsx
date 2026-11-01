import NavBar from '../../components/NavBar';
import { paths } from '../../routes';
import PlanningPokerSettings from './PlanningPokerSettings';
import ProfileSettings from './ProfileSettings';

/** Account settings, followed by a section for each app */
const SettingsPage = () => (
    <>
        <NavBar />
        <div className="container mt-4 pb-5">
            <div className="dashboard">
                <a className="small" href={paths.home}>
                    &larr; Dashboard
                </a>
                <header className="mt-2 mb-4">
                    <h1 className="h3 fw-bold mb-1">Settings</h1>
                    <p className="text-secondary mb-0">
                        Saved to your account.
                    </p>
                </header>
                <div className="col-lg-8">
                    <ProfileSettings />
                    <PlanningPokerSettings />
                </div>
            </div>
        </div>
    </>
);

export default SettingsPage;
