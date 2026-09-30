import { Info } from 'lucide-react';

export default function PhaseNotice({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#dedecb] bg-[#f5f5e9] p-4 text-sm leading-6 text-[#64654b]">
      <Info className="mt-1 shrink-0" size={17} />
      <p>
        <strong className="font-semibold">A preview of what’s ahead. </strong>
        {children}
      </p>
    </div>
  );
}
