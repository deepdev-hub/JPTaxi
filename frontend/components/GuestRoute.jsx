import { useEffect } from 'react';
import { clearOrphanAuthMarkers } from '../utils/session.js';

/** Trang công khai (login/register) — không tự chuyển sang /home khi còn phiên cũ. */
export default function GuestRoute({ children }) {
  useEffect(() => {
    clearOrphanAuthMarkers();
  }, []);

  return children;
}
