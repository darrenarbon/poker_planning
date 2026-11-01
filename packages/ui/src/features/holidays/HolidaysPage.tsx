import NavBar from '../../components/NavBar';
import { paths } from '../../routes';
import HolidaysPanel from './HolidaysPanel';

/** Your time off: add, change and remove holidays, and fetch bank holidays */
const HolidaysPage = () => (
    <>
        <NavBar />
        <div className="container mt-4 pb-5">
            <div className="dashboard">
                <a className="small" href={paths.home}>
                    &larr; Dashboard
                </a>
                <header className="mt-2 mb-4">
                    <h1 className="h3 fw-bold mb-1">Annual leave</h1>
                    <p className="text-secondary mb-0">
                        Let your teams know when you are away.
                    </p>
                </header>
                <div className="col-lg-8">
                    <HolidaysPanel />
                </div>
            </div>
        </div>
    </>
);

export default HolidaysPage;
