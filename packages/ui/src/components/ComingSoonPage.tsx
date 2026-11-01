import { AppInfo } from '../apps';
import { paths } from '../routes';
import NavBar from './NavBar';

/** Placeholder for an app that is still being built */
const ComingSoonPage = ({ app }: { app: AppInfo }) => (
    <>
        <NavBar />
        <div className="container mt-4 pb-5">
            <a className="small" href={paths.home}>
                &larr; All apps
            </a>
            <div className="text-center py-5">
                <div className="coming-soon-icon mb-3" aria-hidden="true">
                    {app.icon}
                </div>
                <span className="badge text-bg-secondary mb-3">
                    Coming soon
                </span>
                <h1 className="display-6 fw-bold">{app.name}</h1>
                <p className="lead text-secondary mx-auto welcome-lead">
                    {app.description}
                </p>
                <p className="text-secondary">
                    We&apos;re still building this one. Check back soon.
                </p>
            </div>
        </div>
    </>
);

export default ComingSoonPage;
