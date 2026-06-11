export default function Modal({ open, title, children, onClose, className = '' }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={onClose}>
      <section
        className={`forgot-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="modal-close" type="button" aria-label="閉じる" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
