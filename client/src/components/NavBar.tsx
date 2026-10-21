import { useAuth0 } from '@auth0/auth0-react';
import { getInitials } from '../utils';

const NavBar = () => {
    const { user, logout, loginWithRedirect } = useAuth0();

    return (
        <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
            <div className="container-fluid">
                <a
                    className="navbar-brand"
                    href="/"
                    title="Group Agile Refinement Yielder"
                >
                    &nbsp; G . A . R . Y
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
                    <ul className="navbar-nav me-auto"></ul>
                    <div className="d-flex">
                        {user ? (
                            <>
                                <div className="btn btn-light me-3">
                                    {getInitials(user)}
                                </div>
                                <button
                                    className="btn btn-outline-light"
                                    type="button"
                                    onClick={() => logout()}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-outline-light"
                                type="button"
                                onClick={() => loginWithRedirect()}
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
