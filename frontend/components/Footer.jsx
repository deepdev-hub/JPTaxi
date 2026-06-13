import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import '../styles/footer.css';
import { getAuthRole } from '../utils/session.js';

import { useChatNotification } from '../contexts/ChatContext.jsx';

export default function Footer() {
  const location = useLocation();
  const { t } = useI18n();
  const { totalUnread } = useChatNotification();
  const isDriver =
    getAuthRole() === 'driver' ||
    location.pathname.startsWith('/driver') ||
    location.pathname === '/messages/customer' ||
    location.pathname === '/xacnhancuocxe';
  const homePath = isDriver ? '/driver-home' : '/home';
  const accountPath = isDriver ? '/driver-info/basic' : '/user-info';
  const messagePath = isDriver ? '/messages/customer' : '/messages/driver';
  const isAccountActive = location.pathname.startsWith('/driver-info') || location.pathname.startsWith('/user-info');

  return (
    <footer className="bottom-nav" aria-label={t('nav.main')}>
      <NavLink className={({ isActive }) => `bottom-item ${isActive && !isAccountActive ? 'active' : ''}`} to={homePath}>
        <span className="bottom-icon" aria-hidden="true">🏠</span>
        <span>{t('common.home')}</span>
      </NavLink>
      <div className="divider"></div>
      <NavLink className={({ isActive }) => `bottom-item ${isActive && !isAccountActive ? 'active' : ''}`} to={messagePath}>
        <span className="icon-with-badge">
          <span className="bottom-icon" aria-hidden="true">💬</span>
          {totalUnread > 0 && <span className="badge-notification">{totalUnread}</span>}
        </span>
        <span>{t('common.messages')}</span>
      </NavLink>
      <div className="divider"></div>
      <NavLink className={({ isActive }) => `bottom-item ${isActive || isAccountActive ? 'active' : ''}`} to={accountPath}>
        <span className="bottom-icon" aria-hidden="true">👤</span>
        <span>{t('common.account')}</span>
      </NavLink>
    </footer>
  );
}
