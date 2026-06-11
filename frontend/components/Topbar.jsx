import { Link } from 'react-router-dom';

export default function Topbar({ actions, brandExtra, children, brandTo = '/home' }) {
  return (
    <header className="topbar">
      <Link className="brand" to={brandTo} aria-label="JP TAXI">
        <span className="brand-icon" aria-hidden="true">🚕</span>
        <span>
          JP TAXI
          {brandExtra && <small>{brandExtra}</small>}
        </span>
      </Link>

      {children || (actions && <nav className="header-actions">{actions}</nav>)}
    </header>
  );
}
