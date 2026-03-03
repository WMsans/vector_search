export default function ResultsList({ results }) {
  if (!results || results.length === 0) {
    return <p className="no-results">No results found</p>;
  }

  return (
    <div className="results-list">
      {results.map((result, idx) => (
        <div key={idx} className="result-item">
          <h3>{result.title}</h3>
          <p>{result.text}</p>
        </div>
      ))}
    </div>
  );
}
