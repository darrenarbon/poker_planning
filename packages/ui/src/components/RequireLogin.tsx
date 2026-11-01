import { useAuth0 } from '@auth0/auth0-react';
import { ReactNode } from 'react';
import Loading from './Loading';
import LoginPrompt from './LoginPrompt';
import NavBar from './NavBar';

type RequireLoginProps = {
    children: ReactNode;
    /** shown to logged-out visitors instead of the generic login prompt */
    loggedOut?: ReactNode;
};

/** Shows the page once logged in, otherwise a login prompt that returns here */
const RequireLogin = ({
    children,
    loggedOut = <LoginPrompt />,
}: RequireLoginProps) => {
    const { isLoading, isAuthenticated } = useAuth0();

    if (isAuthenticated) return <>{children}</>;

    return (
        <>
            <NavBar />
            <div className="container mt-4">
                {isLoading ? <Loading /> : loggedOut}
            </div>
        </>
    );
};

export default RequireLogin;
