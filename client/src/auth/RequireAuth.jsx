import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.js';
import Brand from '../components/Brand.jsx';

export default function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading || (!auth.user && auth.error))
    return (
      <main className="mx-auto max-w-md space-y-6 px-6 py-20">
        <Brand />
        {auth.loading ? (
          <p role="status">Checking your session…</p>
        ) : (
          <>
            <p role="alert" className="text-sm text-red-700">
              {auth.error}
            </p>
            <button className="button-primary" onClick={auth.reload}>
              Try again
            </button>
          </>
        )}
      </main>
    );
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // Remount workspace state when the signed-in account changes.
  return <Outlet key={auth.user.id} />;
}
