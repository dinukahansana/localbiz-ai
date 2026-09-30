import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';

export default function Brand({ light = false }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
      aria-label="LocalBiz AI home"
    >
      <span
        className={`grid size-9 place-items-center rounded-xl ${light ? 'bg-lime text-forest' : 'bg-forest text-lime'}`}
      >
        <Sparkles size={20} strokeWidth={1.8} />
      </span>
      <span className="text-xl">
        LocalBiz
        <span className={`ml-1 text-sm font-medium ${light ? 'text-lime' : 'text-sage'}`}>AI</span>
      </span>
    </Link>
  );
}
