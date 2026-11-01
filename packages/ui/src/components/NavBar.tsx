import { useAuth0 } from '@auth0/auth0-react';
import { apps, findCurrentApp } from '../apps';
import { useLogin, useTheme } from '../hooks';
import { paths } from '../routes';
import { getInitials } from '../utils';

const SHORTCUTS_MODAL_ID = 'shortcutsModal';

const shortcuts: [keys: string[], action: string][] = [
    [['1', '2', '3', '5', '8'], 'Vote that number'],
    [['1', '3'], 'Type two digits quickly to vote 13 (or 2 1 for 21)'],
    [['0'], 'Vote No Idea (? works too)'],
    [['Tab', 'Enter'], 'Move to a ticket and select it'],
    [['Esc'], 'Close a dialog or cancel adding a ticket'],
];

/** Two fanned cards, echoing the cards on the landing page */
const Logo = () => (
    <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        className="navbar-logo"
    >
        <rect
            x="4"
            y="5"
            width="13"
            height="18"
            rx="2.5"
            transform="rotate(-12 10 14)"
            className="navbar-logo-back"
        />
        <rect
            x="11"
            y="5"
            width="13"
            height="18"
            rx="2.5"
            transform="rotate(8 17 14)"
            className="navbar-logo-front"
        />
    </svg>
);

const ShortcutsModal = () => (
    <div
        className="modal fade"
        id={SHORTCUTS_MODAL_ID}
        tabIndex={-1}
        aria-labelledby="shortcutsModalLabel"
        aria-hidden="true"
    >
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
                <div className="modal-header">
                    <h1 className="modal-title fs-5" id="shortcutsModalLabel">
                        Keyboard shortcuts
                    </h1>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    />
                </div>
                <div className="modal-body">
                    <dl className="shortcut-list mb-0">
                        {shortcuts.map(([keys, action]) => (
                            <div key={action} className="d-contents">
                                <dt>
                                    {keys.map((k) => (
                                        <kbd key={k}>{k}</kbd>
                                    ))}
                                </dt>
                                <dd>{action}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="small text-secondary mt-3 mb-0">
                        Voting shortcuts work on the voting screen, unless
                        you&apos;re typing in a box.
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const NavBar = () => {
    const { user, logout } = useAuth0();
    const login = useLogin();
    const { theme, toggleTheme } = useTheme();
    const otherTheme = theme === 'dark' ? 'light' : 'dark';
    const currentApp = findCurrentApp(window.location.pathname);
    // the keyboard shortcuts are for voting, so only planning poker has them
    const hasShortcuts = !!user && currentApp?.id === 'planningPoker';

    return (
        <>
            <nav
                className="navbar navbar-expand-md sticky-top app-navbar"
                data-bs-theme="dark"
            >
                <div className="container-fluid">
                    <a
                        className="navbar-brand d-flex align-items-center gap-2"
                        href="/"
                    >
                        <Logo />
                        <span className="navbar-wordmark">Teamdeck</span>
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
                        id="navbarSupportedContent"
                    >
                        <ul className="navbar-nav me-auto">
                            {user &&
                                apps.map((app) => {
                                    const active = app.id === currentApp?.id;
                                    return (
                                        <li key={app.id} className="nav-item">
                                            <a
                                                className={`nav-link${active ? ' active' : ''}`}
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                                href={app.path}
                                            >
                                                {app.name}
                                                {app.comingSoon && (
                                                    <span className="badge rounded-pill navbar-soon-badge ms-1">
                                                        Soon
                                                    </span>
                                                )}
                                            </a>
                                        </li>
                                    );
                                })}
                        </ul>
                        <div className="d-flex align-items-center gap-2 py-2 py-md-0">
                            {hasShortcuts && (
                                <button
                                    className="btn navbar-icon-btn"
                                    type="button"
                                    data-bs-toggle="modal"
                                    data-bs-target={`#${SHORTCUTS_MODAL_ID}`}
                                    aria-label="Keyboard shortcuts"
                                    title="Keyboard shortcuts"
                                >
                                    ⌨️
                                </button>
                            )}
                            <button
                                className="btn navbar-icon-btn"
                                type="button"
                                onClick={toggleTheme}
                                aria-label={`Switch to ${otherTheme} mode`}
                                title={`Switch to ${otherTheme} mode`}
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                            {user ? (
                                <div className="dropdown">
                                    <button
                                        className="btn navbar-avatar"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                        aria-label="Account menu"
                                    >
                                        {getInitials(user)}
                                    </button>
                                    <ul
                                        className="dropdown-menu dropdown-menu-end shadow"
                                        data-bs-theme={theme}
                                    >
                                        <li className="px-3 py-2">
                                            <div className="fw-semibold">
                                                {user.name}
                                            </div>
                                            {user.email && (
                                                <div className="small text-secondary">
                                                    {user.email}
                                                </div>
                                            )}
                                        </li>
                                        <li>
                                            <hr className="dropdown-divider" />
                                        </li>
                                        <li>
                                            <a
                                                className="dropdown-item"
                                                href={paths.settings}
                                            >
                                                Settings
                                            </a>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                type="button"
                                                onClick={() => logout()}
                                            >
                                                Log out
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-light btn-sm px-3"
                                    type="button"
                                    onClick={login}
                                >
                                    Log in
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            {hasShortcuts && <ShortcutsModal />}
        </>
    );
};

export default NavBar;
