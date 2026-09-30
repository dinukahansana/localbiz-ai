import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage({ dashboard = false }) {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
      <p className="eyebrow mb-5">A LITTLE OFF THE BEATEN PATH</p>
      <h1 className="display-heading text-6xl text-forest">Page not found.</h1>
      <p className="my-6 text-sm text-muted">This corner of the neighborhood doesn’t exist yet.</p>
      <Link className="button-primary" to={dashboard ? '/dashboard' : '/'}>
        <ArrowLeft size={16} />
        {dashboard ? 'Back to overview' : 'Back home'}
      </Link>
    </div>
  );
}
