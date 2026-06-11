import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getStoredProfileLanguage, LANGUAGE_EVENT, profileText } from '../i18n/profileLanguage.js';
import '../styles/footer.css';

export default function Footer() {
  const location = useLocation();
  const [language, setLanguage] = useState(getStoredProfileLanguage);
  const common = (profileText[language] || profileText.ja).common;
  const isDriver =
    localStorage.getItem('jpTaxiRole') === 'driver' ||
    location.pathname.startsWith('/driver') ||
    location.pathname === '/messages/customer' ||
    location.pathname === '/xacnhancuocxe';
  const homePath = isDriver ? '/driver-home' : '/home';
  const accountPath = isDriver ? '/driver-info/basic' : '/user-info';
  const messagePath = isDriver ? '/messages/customer' : '/messages/driver';
  const isAccountActive = location.pathname.startsWith('/driver-info') || location.pathname.startsWith('/user-info');

  useEffect(() => {
    function syncLanguage(event) {
      setLanguage(event.detail?.language || getStoredProfileLanguage());
    }

    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    return () => window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
  }, []);

  return (
    <footer className="bottom-nav" aria-label="Main navigation">
      <NavLink className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`} to={homePath}>
        <span className="bottom-icon" aria-hidden="true">🏠</span>
        <span>{common.home}</span>
      </NavLink>
      <div className="divider"></div>
      <NavLink className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`} to={messagePath}>
        <span className="bottom-icon" aria-hidden="true">💬</span>
        <span>{common.messages}</span>
      </NavLink>
      <div className="divider"></div>
      <NavLink className={({ isActive }) => `bottom-item ${isActive || isAccountActive ? 'active' : ''}`} to={accountPath}>
        <span className="bottom-icon" aria-hidden="true">👤</span>
        <span>{common.account}</span>
      </NavLink>
    </footer>
  );
}
