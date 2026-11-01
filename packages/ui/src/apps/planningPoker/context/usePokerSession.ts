import { useContext } from 'react';
import {
    PokerSessionContext,
    PokerSessionContextValue,
} from './PokerSessionContext';

export const usePokerSession = (): PokerSessionContextValue => {
    const context = useContext(PokerSessionContext);
    if (!context) {
        throw new Error(
            'usePokerSession must be used within a PokerSessionProvider'
        );
    }
    return context;
};
