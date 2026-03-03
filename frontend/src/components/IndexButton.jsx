import { useState } from 'react';
import api from '../services/api';

export default function IndexButton({ onIndexed }) {
  const [indexing, setIndexing] = useState(false);

  const handleIndex = async () => {
    setIndexing(true);
    try {
      const res = await api.post('/api/index');
      onIndexed(res.data.indexed_documents);
    } catch (err) {
      console.error('Indexing failed:', err);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <button onClick={handleIndex} disabled={indexing} className="index-btn">
      {indexing ? 'Indexing...' : 'Index My Drive'}
    </button>
  );
}
