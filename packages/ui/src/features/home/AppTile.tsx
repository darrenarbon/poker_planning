import { AppInfo, liveApps } from '../../apps';

/** A card on the homepage that opens one of the apps */
const AppTile = ({ app }: { app: AppInfo }) => (
    <div className="card h-100 dashboard-card app-tile">
        <div className="card-body d-flex flex-column">
            <div className="mb-3">
                <span className="app-tile-icon" aria-hidden="true">
                    {app.icon}
                </span>
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

/** Each app people can use today as a card, for the landing page */
export const AppTiles = () => (
    <div className="row g-4">
        {liveApps.map((app) => (
            <div key={app.id} className="col-md-6 col-lg-4">
                <AppTile app={app} />
            </div>
        ))}
    </div>
);

export default AppTile;
