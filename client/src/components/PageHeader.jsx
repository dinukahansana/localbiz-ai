export default function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[32px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
