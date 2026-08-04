import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div>
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
      <Link to="/" className="text-slate-400 hover:text-slate-100 underline mt-2 inline-block">
        Back home
      </Link>
    </div>
  );
}
