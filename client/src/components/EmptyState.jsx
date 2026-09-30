import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, to, linkLabel }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl border border-line bg-canvas text-sage">
        <Icon size={27} strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {to && (
        <Link
          to={to}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
        >
          {linkLabel}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
