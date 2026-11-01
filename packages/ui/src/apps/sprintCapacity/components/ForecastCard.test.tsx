import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SprintForecast } from '../../../types';
import ForecastCard from './ForecastCard';

const forecast = (overrides: Partial<SprintForecast> = {}): SprintForecast => ({
    workingDays: 10,
    people: [],
    availablePersonDays: 36.5,
    velocity: {
        sprintsUsed: 4,
        perPersonDay: 0.5,
        lowPerPersonDay: 0.4,
        highPerPersonDay: 0.6,
        confidence: 'normal',
    },
    bufferPercent: 10,
    carriedOverPoints: 4,
    capacity: { expected: 16.4, low: 13.1, high: 19.7 },
    capacityBeforeBuffer: { expected: 18.3, low: 14.6, high: 21.9 },
    newPoints: { expected: 12.4, low: 9.1, high: 15.7 },
    ...overrides,
});

describe('ForecastCard', () => {
    it('shows the new points that fit, with a range, and how they were reached', () => {
        render(<ForecastCard forecast={forecast()} />);
        expect(screen.getByText('12.4')).toBeInTheDocument();
        expect(screen.getByText(/Likely range 9.1–15.7/)).toBeInTheDocument();
        expect(screen.getByText(/after 10% buffer/)).toBeInTheDocument();
        expect(screen.getByText('36.5')).toBeInTheDocument();
        expect(screen.getByText('0.50 points')).toBeInTheDocument();
        expect(screen.getByText('Based on recent sprints')).toBeInTheDocument();
    });

    it('flags a low-confidence estimate', () => {
        render(
            <ForecastCard
                forecast={forecast({
                    velocity: {
                        sprintsUsed: 2,
                        perPersonDay: 0.5,
                        lowPerPersonDay: 0.4,
                        highPerPersonDay: 0.6,
                        confidence: 'low',
                    },
                })}
            />
        );
        expect(screen.getByText('Low confidence')).toBeInTheDocument();
    });

    it('asks for more history instead of guessing', () => {
        render(
            <ForecastCard
                forecast={forecast({
                    velocity: {
                        sprintsUsed: 1,
                        perPersonDay: null,
                        lowPerPersonDay: null,
                        highPerPersonDay: null,
                        confidence: 'none',
                    },
                    capacity: null,
                    newPoints: null,
                })}
            />
        );
        expect(screen.getByText('Not enough history')).toBeInTheDocument();
        expect(
            screen.getByText(/at least 2 closed sprints/)
        ).toBeInTheDocument();
        expect(screen.queryByText(/new points to add/)).not.toBeInTheDocument();
    });
});
