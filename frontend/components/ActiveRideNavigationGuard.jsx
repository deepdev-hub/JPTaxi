import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getActiveDriverRide, getActiveRide } from '../api/rides.js';
import { getActiveRideRedirect, syncActiveRideSession } from '../utils/activeRideNavigation.js';
import { getAuthRole, getAuthToken } from '../utils/session.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

function getStoredRole() {
  return getAuthRole();
}

function getStoredToken() {
  return getAuthToken();
}

function loadActiveRide(role) {
  return role === 'driver' ? getActiveDriverRide() : getActiveRide();
}

export default function ActiveRideNavigationGuard({ children }) {
  const { t } = useI18n();
  const location = useLocation();
  const [state, setState] = useState({
    checking: true,
    role: null,
    activeRide: null,
    checkedPath: null,
  });
  const storedRole = getStoredRole();
  const role = storedRole === 'user' ? 'customer' : storedRole;
  const token = getStoredToken();

  useEffect(() => {
    let ignored = false;

    if (!token || !['customer', 'driver'].includes(role)) {
      setState({
        checking: false,
        role,
        activeRide: null,
        checkedPath: location.pathname,
      });
      return undefined;
    }

    setState((current) => ({
      ...current,
      checking: true,
      role,
      checkedPath: location.pathname,
    }));

    loadActiveRide(role)
      .then((activeRide) => {
        if (ignored) return;
        syncActiveRideSession(activeRide);
        setState({
          checking: false,
          role,
          activeRide,
          checkedPath: location.pathname,
        });
      })
      .catch(() => {
        if (!ignored) {
          setState({
            checking: false,
            role,
            activeRide: null,
            checkedPath: location.pathname,
          });
        }
      });

    return () => {
      ignored = true;
    };
  }, [location.pathname, role, token]);

  if (state.checking || state.checkedPath !== location.pathname) {
    return <div className="auth-loading" role="status" aria-live="polite">{t('common.loading')}</div>;
  }

  const redirectPath = getActiveRideRedirect(state.role, state.activeRide, location.pathname);
  if (redirectPath && redirectPath !== location.pathname) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
