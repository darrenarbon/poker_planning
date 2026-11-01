import { useLogin } from '../hooks';

/** Asks a logged-out visitor to log in, then brings them back to this page */
const LoginPrompt = () => {
    const login = useLogin();

    return (
        <div className="text-center py-5">
            <h1 className="h3 fw-bold">Log in to continue</h1>
            <p className="text-secondary">
                You need to be logged in to see this page.
            </p>
            <button
                className="btn btn-primary px-4"
                type="button"
                onClick={login}
            >
                Log in
            </button>
        </div>
    );
};

export default LoginPrompt;
