import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  solvedCount: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<LeaderboardEntry[]>('/leaderboard')
      .then((res) => setEntries(res.data))
      .catch(() => setError('Could not load the leaderboard.'));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="text-slate-400 mt-2">Ranked by distinct problems solved.</p>

      {error && <p className="text-red-400 mt-4">{error}</p>}

      {!error && !entries && <p className="text-slate-400 mt-4">Loading…</p>}

      {entries && entries.length === 0 && (
        <p className="text-slate-400 mt-4">No accepted submissions yet.</p>
      )}

      {entries && entries.length > 0 && (
        <table className="w-full mt-4 text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="py-2 pr-4">Rank</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2">Solved</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.userId} className="border-b border-slate-800">
                <td className="py-2 pr-4">{entry.rank}</td>
                <td className="py-2 pr-4">{entry.name}</td>
                <td className="py-2">{entry.solvedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
