import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, busy, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      // React removes the dialog; return keyboard focus to its opener if it still exists.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      else document.getElementById('main-content')?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40 sm:p-8"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="dialog-title" className="mb-6 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
