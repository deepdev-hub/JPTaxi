import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  error,
  errorId,
  inputRef,
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = `${generatedId}-password`;
  const messageId = errorId || `${generatedId}-error`;

  function togglePassword() {
    setVisible((current) => !current);
    window.setTimeout(() => inputRef?.current?.focus(), 0);
  }

  return (
    <label>
      <span>{label}</span>
      <span className="password-field">
        <input
          ref={inputRef}
          id={inputId}
          className={error ? 'input-error' : ''}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-invalid={String(Boolean(error))}
          aria-describedby={messageId}
          autoComplete="current-password"
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? 'パスワードを隠す' : 'パスワードを表示'}
          aria-pressed={String(visible)}
          onClick={togglePassword}
        >
          {visible ? <Eye size={18} strokeWidth={2.2} /> : <EyeOff size={18} strokeWidth={2.2} />}
        </button>
      </span>
      <span className="field-error" id={messageId} aria-live="polite">
        {error || ''}
      </span>
    </label>
  );
}
