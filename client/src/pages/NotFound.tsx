import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <p className="text-6xl font-extrabold bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-transparent">
        404
      </p>
      <h1 className="text-xl font-semibold mt-2">Page not found</h1>
      <Link
        to="/"
        className="inline-block mt-6 rounded-md bg-accent hover:bg-accent-soft px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        Back home
      </Link>
    </div>
  );
}
