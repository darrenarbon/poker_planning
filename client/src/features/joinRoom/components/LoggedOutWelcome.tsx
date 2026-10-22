import { votingValues } from '../../../constants';
import { useLogin } from '../../../hooks';

const steps = [
    {
        title: 'Create a room',
        text: 'Spin up a room for your team and load the tickets you want to refine.',
    },
    {
        title: 'Invite the team',
        text: 'Share the room name so everyone can join from their own device.',
    },
    {
        title: 'Vote together',
        text: 'Everyone picks a card in secret, then reveal and agree on an estimate.',
    },
];

/** Landing screen shown to visitors who have not logged in yet */
type LoggedOutWelcomeProps = {
    /** the visitor followed a shared room link */
    invited?: boolean;
};

const LoggedOutWelcome = ({ invited = false }: LoggedOutWelcomeProps) => {
    const login = useLogin();

    return (
        <div className="logged-out-welcome text-center py-5">
            <div className="welcome-cards mb-4" aria-hidden="true">
                {votingValues.slice(1, 6).map(({ value, label }) => (
                    <span key={value} className="welcome-card">
                        {label}
                    </span>
                ))}
            </div>
            <h1 className="display-5 fw-bold">
                {invited
                    ? "You've been invited to a planning session"
                    : 'Welcome to G.A.R.Y'}
            </h1>
            <p className="lead text-secondary mx-auto welcome-lead">
                {invited
                    ? "Log in and we'll take you straight to the room."
                    : 'The Group Agile Refinement Yielder. Estimate tickets as a team with planning poker — quick, fair and in real time.'}
            </p>
            <button
                className="btn btn-primary btn-lg px-5 mt-2"
                type="button"
                onClick={login}
            >
                {invited ? 'Log in to join' : 'Log in to get started'}
            </button>

            {!invited && (
                <div className="row g-4 mt-5 text-start">
                    {steps.map(({ title, text }, index) => (
                        <div key={title} className="col-md-4">
                            <div className="card h-100 dashboard-card">
                                <div className="card-body">
                                    <div className="welcome-step-number mb-3">
                                        {index + 1}
                                    </div>
                                    <h5 className="card-title">{title}</h5>
                                    <p className="card-text text-secondary">
                                        {text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LoggedOutWelcome;
