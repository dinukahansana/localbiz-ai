export default function LoadState({ resource, label }) {
  if (resource.loading)
    return (
      <p role="status" className="panel p-6 text-sm text-muted">
        Loading {label}…
      </p>
    );
  if (!resource.error) return null;
  return (
    <div className="panel space-y-3 p-6">
      <p role="alert" className="text-sm text-red-700">
        {resource.error}
      </p>
      <button className="button-secondary" onClick={resource.reload}>
        Try again
      </button>
    </div>
  );
}
