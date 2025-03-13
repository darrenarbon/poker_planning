import { useParams } from 'react-router-dom';

import SetTickets from './SetTickets';

export type SetTicketsParams = { roomName: string };

const SetTicketsFromParams = (): JSX.Element => {
  const { roomName } = useParams() as SetTicketsParams;
  return <SetTickets roomName={roomName} />;
};

export default SetTicketsFromParams;
