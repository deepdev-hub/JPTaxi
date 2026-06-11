import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { verifyAuthSession } from '../utils/authVerify.js';
import {
  getAuthToken,
  isCustomerRole,
  isDriverRole,
  onAuthChange,
} from '../utils/session.js';

/**
 * Chỉ cho phép truy cập khi JWT còn hợp lệ trên server (không chỉ có trong localStorage).
 * Tái kiểm tra khi bfcache (nút Back), đổi tab, hoặc session bị xóa ở trang login.
 */
export default function RequireAuth({ role, children }) {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const runVerify = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setAllowed(false);
      setChecked(true);
      return;
    }

    if (role === 'customer' && !isCustomerRole()) {
      setAllowed(false);
      setChecked(true);
      return;
    }

    if (role === 'driver' && !isDriverRole()) {
      setAllowed(false);
      setChecked(true);
      return;
    }

    const verifiedRole = await verifyAuthSession();
    setAllowed(verifiedRole === role);
    setChecked(true);
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    setChecked(false);

    (async () => {
      await runVerify();
      if (cancelled) {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runVerify]);

  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) {
        setChecked(false);
        runVerify();
      }
    };

    const onStorage = (event) => {
      if (event.key === 'jpTaxiToken' || event.key === 'jpTaxiRole' || event.key === null) {
        setChecked(false);
        runVerify();
      }
    };

    const unsubscribeAuth = onAuthChange(() => {
      setChecked(false);
      runVerify();
    });

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
      unsubscribeAuth();
    };
  }, [runVerify]);

  if (!checked) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        読み込み中...
      </div>
    );
  }

  if (!allowed) {
    const token = getAuthToken();
    if (token && role === 'customer' && isDriverRole()) {
      return <Navigate to="/driver-home" replace />;
    }
    if (token && role === 'driver' && isCustomerRole()) {
      return <Navigate to="/home" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
