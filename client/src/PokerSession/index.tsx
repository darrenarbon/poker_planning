import { useParams } from 'react-router-dom';

import PokerSession from './PokerSession';

export type PokerSessionParams = { roomName: string };

const PokerSessionFromParams = (): JSX.Element => {
  const { roomName } = useParams() as PokerSessionParams;
  return <PokerSession roomName={roomName} />;
};

export default PokerSessionFromParams;
