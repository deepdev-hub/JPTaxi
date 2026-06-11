import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getActiveDriverRide, getActiveRide } from '../api/rides.js';
import { getActiveRideRedirect, syncActiveRideSession } from '../utils/activeRideNavigation.js';

function getStoredRole() {
  return localStorage.getItem('jpTaxiRole');
}

function getStoredToken(role) {
  if (role === 'driver') {
    return localStorage.getItem('jpTaxiDriverToken') || localStorage.getItem('jpTaxiToken');
  }
  if (role === 'customer' || role === 'user') {
    return localStorage.getItem('jpTaxiCustomerToken') || localStorage.getItem('jpTaxiToken');
  }
  return null;
}

function loadActiveRide(role) {
  return role === 'driver' ? getActiveDriverRide() : getActiveRide();
}

export default function ActiveRideNavigationGuard({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ checking: true, role: null, activeRide: null });
  const storedRole = getStoredRole();
  const role = storedRole === 'user' ? 'customer' : storedRole;
  const token = getStoredToken(role);

  useEffect(() => {
    let ignored = false;

    if (!token || !['customer', 'driver'].includes(role)) {
      setState({ checking: false, role, activeRide: null });
      return undefined;
    }

    sessionStorage.setItem('jpTaxiActiveRole', role);
    setState((current) => ({ ...current, checking: true, role }));

    loadActiveRide(role)
      .then((activeRide) => {
        if (ignored) return;
        syncActiveRideSession(activeRide);
        setState({ checking: false, role, activeRide });
      })
      .catch(() => {
        if (!ignored) {
          setState({ checking: false, role, activeRide: null });
        }
      });

    return () => {
      ignored = true;
    };
  }, [location.pathname, role, token]);

  if (state.checking) {
    return <div className="auth-loading" role="status" aria-live="polite">Loading...</div>;
  }

  const redirectPath = getActiveRideRedirect(state.role, state.activeRide, location.pathname);
  if (redirectPath && redirectPath !== location.pathname) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
