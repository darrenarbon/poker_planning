import { useAuth0, User } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

interface NavBarProps {
    auth0User?: User;
}

const NavBar = ({ auth0User }: NavBarProps) => {
    const navigate = useNavigate();

    const { logout, loginWithRedirect, getAccessTokenSilently } = useAuth0();

    const buttonInitials = auth0User?.given_name
        ? `${auth0User?.given_name?.substring(
              0,
              1
          )}${auth0User?.family_name?.substring(0, 1)}`
        : auth0User?.nickname
              ?.split('.')
              .map((n: string) => n.substring(0, 1))
              .join('')
              .toUpperCase();

    const createRoom = async () => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${config.apiUrl}/newroom`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        const { roomId } = await response.json();
        navigate(`/room/${roomId}/tickets`);
    };

    return (
        <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
            <div className="container-fluid">
                <a className="navbar-brand" href="#">
                    Ticket Tally
                </a>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div
                    className="collapse navbar-collapse"
                    id="navbarTogglerDemo01"
                >
                    <ul className="navbar-nav me-auto">
                        {auth0User && (
                            <li className="nav-item">
                                <button
                                    className="btn btn-outline-light"
                                    onClick={createRoom}
                                >
                                    Create room
                                </button>
                            </li>
                        )}
                    </ul>
                    <div className="d-flex">
                        {!auth0User && (
                            <button
                                className="btn btn-outline-light"
                                type="button"
                                onClick={() => loginWithRedirect()}
                            >
                                Login
                            </button>
                        )}
                        {auth0User && (
                            <>
                                <div className="btn btn-light me-3">
                                    {buttonInitials}
                                </div>
                                <button
                                    className="btn btn-outline-light"
                                    type="button"
                                    onClick={() => logout()}
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
