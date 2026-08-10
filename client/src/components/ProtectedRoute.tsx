import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from './ui/States';
import { ButtonLink } from './ui/Button';
import { IconLock } from './icons';

/**
 * Gates a route behind auth, remembering where the user was headed so Login can
 * send them back there (guide 10.1). `adminOnly` is UX only — the server guards
 * are what actually enforce it (13.2).
 */
export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={<IconLock />}
        title="Admin access required"
        description="This page is only available to administrators."
        action={
          <ButtonLink to="/problems" variant="outline" size="sm">
            Back to Problems
          </ButtonLink>
        }
      />
    );
  }

  return <Outlet />;
}
