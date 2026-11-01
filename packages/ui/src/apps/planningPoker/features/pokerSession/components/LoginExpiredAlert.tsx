import { useLogin } from '../../../../../hooks';

/** Shown when the server refuses the room's connection because the login expired */
const LoginExpiredAlert = () => {
    const login = useLogin();

    return (
        <div
            className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 my-3"
            role="alert"
        >
            <span>
                Your login has expired, so you&apos;re no longer connected to
                this room.
            </span>
            <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={login}
            >
                Log in again
            </button>
        </div>
    );
};

export default LoginExpiredAlert;
