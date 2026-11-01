import { SprintForecast } from '../../../types';
import { confidenceLabels, formatNumber, formatRange } from '../sprintLabels';

/** What a sprint could hold: capacity from velocity and leave, less carry-over */
const ForecastCard = ({ forecast }: { forecast: SprintForecast }) => {
    const { velocity, capacity, newPoints } = forecast;

    return (
        <div
            className="card dashboard-card mb-3"
            aria-label="Capacity forecast"
        >
            <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <h3 className="h5 fw-semibold mb-0">Capacity forecast</h3>
                    <span
                        className={`badge ${velocity.confidence === 'normal' ? 'text-bg-success' : 'text-bg-warning'}`}
                    >
                        {confidenceLabels[velocity.confidence]}
                    </span>
                </div>

                {!capacity || !newPoints ? (
                    <p className="text-secondary mb-0">
                        We need at least 2 closed sprints to estimate what the
                        team can take on. Add past sprints, or close this one to
                        start building a history.
                    </p>
                ) : (
                    <>
                        <div className="display-6 fw-bold">
                            {formatNumber(newPoints.expected)}
                            <span className="fs-5 fw-normal text-secondary">
                                {' '}
                                new points to add
                            </span>
                        </div>
                        <p className="text-secondary">
                            Likely range {formatRange(newPoints)} points
                        </p>
                        <dl className="row mb-0 small">
                            <dt className="col-7 fw-normal text-secondary">
                                Team capacity (after {forecast.bufferPercent}%
                                buffer)
                            </dt>
                            <dd className="col-5 text-end mb-1">
                                {formatNumber(capacity.expected)} points (
                                {formatRange(capacity)})
                            </dd>
                            <dt className="col-7 fw-normal text-secondary">
                                Already carried over
                            </dt>
                            <dd className="col-5 text-end mb-1">
                                {formatNumber(forecast.carriedOverPoints)}{' '}
                                points
                            </dd>
                        </dl>
                    </>
                )}
                <hr />
                <dl className="row mb-0 small">
                    <dt className="col-7 fw-normal text-secondary">
                        Working days in sprint
                    </dt>
                    <dd className="col-5 text-end mb-1">
                        {forecast.workingDays}
                    </dd>
                    <dt className="col-7 fw-normal text-secondary">
                        Available person-days (after leave)
                    </dt>
                    <dd className="col-5 text-end mb-1">
                        {formatNumber(forecast.availablePersonDays)}
                    </dd>
                    {velocity.perPersonDay !== null && (
                        <>
                            <dt className="col-7 fw-normal text-secondary">
                                Velocity per person-day (last{' '}
                                {velocity.sprintsUsed} sprints)
                            </dt>
                            <dd className="col-5 text-end mb-0">
                                {velocity.perPersonDay.toFixed(2)} points
                            </dd>
                        </>
                    )}
                </dl>
            </div>
        </div>
    );
};

export default ForecastCard;
