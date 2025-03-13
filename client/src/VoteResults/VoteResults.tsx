interface VoteResultsProps {
  votes: {
    [ticket: string]: (string | number)[];
  };
}

const VoteResults = ({ votes }: VoteResultsProps) => {
  return (
    <div>
      {Object.keys(votes).map((ticket) => (
        <div key={ticket}>
          <h4>{ticket}</h4>
          <p>{votes[ticket].join(', ')}</p>
        </div>
      ))}
    </div>
  );
};

export default VoteResults;
