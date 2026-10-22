import { useAuth0 } from '@auth0/auth0-react';
import { ReactNode } from 'react';
import LoggedOutWelcome from '../features/joinRoom/components/LoggedOutWelcome';
import Loading from './Loading';
import NavBar from './NavBar';

type RequireLoginProps = {
    children: ReactNode;
    /** the visitor followed a shared room link */
    invited?: boolean;
};

/** Shows the page once logged in, otherwise a login prompt that returns here */
const RequireLogin = ({ children, invited = false }: RequireLoginProps) => {
    const { isLoading, isAuthenticated } = useAuth0();

    if (isAuthenticated) return <>{children}</>;

    return (
        <>
            <NavBar />
            <div className="container mt-4">
                {isLoading ? (
                    <Loading />
                ) : (
                    <LoggedOutWelcome invited={invited} />
                )}
            </div>
        </>
    );
};

export default RequireLogin;
