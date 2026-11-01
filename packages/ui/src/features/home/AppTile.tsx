import { AppInfo } from '../../apps';

/** A card on the homepage that opens one of the apps */
const AppTile = ({ app }: { app: AppInfo }) => (
    <div
        className={`card h-100 dashboard-card app-tile${app.comingSoon ? ' app-tile-soon' : ''}`}
    >
        <div className="card-body d-flex flex-column">
            <div className="d-flex align-items-start justify-content-between mb-3">
                <span className="app-tile-icon" aria-hidden="true">
                    {app.icon}
                </span>
                {app.comingSoon && (
                    <span className="badge text-bg-secondary">Coming soon</span>
                )}
            </div>
            <h2 className="h5 card-title fw-semibold mb-1">
                <a className="stretched-link app-tile-link" href={app.path}>
                    {app.name}
                </a>
            </h2>
            <p className="small text-primary fw-semibold mb-2">{app.tagline}</p>
            <p className="card-text text-secondary mb-0">{app.description}</p>
        </div>
    </div>
);

export default AppTile;
