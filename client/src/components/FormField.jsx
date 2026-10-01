export default function FormField({
  name,
  label,
  value,
  onChange,
  error,
  multiline,
  children,
  ...props
}) {
  const id = `field-${name}`;
  const shared = {
    id,
    name,
    value,
    onChange: (event) => onChange(name, event.target.value),
    className: `field mt-2 ${multiline ? 'min-h-28 resize-y' : ''}`,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    ...props,
  };
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children ? (
        <select {...shared}>{children}</select>
      ) : multiline ? (
        <textarea {...shared} />
      ) : (
        <input {...shared} />
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
