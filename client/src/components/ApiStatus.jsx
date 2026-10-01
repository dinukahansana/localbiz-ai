import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export default function ApiStatus() {
  const [status, setStatus] = useState('checking');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // The timeout also covers a server that accepts a connection but never replies.
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    let mounted = true;

    async function checkHealth() {
      try {
        const response = await fetch(`${apiUrl}/health`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || data.status !== 'ok' || data.service !== 'localbiz-ai-api')
          throw new Error('API unavailable');
        if (mounted) setStatus(data.database === 'connected' ? 'online' : 'databaseOffline');
      } catch {
        if (mounted) setStatus('offline');
      } finally {
        window.clearTimeout(timeout);
      }
    }

    checkHealth();
    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [retry]);

  const labels = {
    checking: 'Checking connection',
    online: 'Server connected',
    offline: 'Server unavailable',
    databaseOffline: 'Database unavailable',
  };
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted">
      <span className="flex items-center gap-2" role="status">
        <span
          className={`size-1.5 rounded-full ${status === 'online' ? 'bg-sage' : status === 'checking' ? 'bg-stone-400' : 'bg-amber-600'}`}
        />
        {labels[status]}
      </span>
      <button
        className="rounded-md p-2 hover:bg-canvas disabled:opacity-40"
        aria-label="Refresh server status"
        disabled={status === 'checking'}
        onClick={() => {
          setStatus('checking');
          setRetry((value) => value + 1);
        }}
      >
        <RefreshCw size={13} className={status === 'checking' ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}
