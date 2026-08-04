import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950">
      <div className="max-w-5xl mx-auto flex items-center gap-6 px-4 py-3">
        <Link to="/" className="font-bold text-slate-100">
          CodeForge
        </Link>
        <Link to="/problems" className="text-slate-400 hover:text-slate-100">
          Problems
        </Link>
        <Link to="/submissions" className="text-slate-400 hover:text-slate-100">
          Submissions
        </Link>
        <Link to="/leaderboard" className="text-slate-400 hover:text-slate-100">
          Leaderboard
        </Link>
        <div className="ml-auto flex gap-4">
          <Link to="/login" className="text-slate-400 hover:text-slate-100">
            Login
          </Link>
          <Link to="/register" className="text-slate-400 hover:text-slate-100">
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
