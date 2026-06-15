import { useState } from 'react';
import ToastNotification from './ToastNotification.jsx';
import { useRideSocket } from '../hooks/useRideSocket.js';
import { getAuthRole } from '../utils/session.js';

export default function DriverNotificationWrapper({ children }) {
  const [toastData, setToastData] = useState(null);
  const role = getAuthRole();

  useRideSocket({
    handlers: {
      driver_received_rating: (data) => {
        if (role === 'driver') {
          setToastData({
            score: data.score,
            tripId: data.tripId,
          });
        }
      },
    },
  });

  return (
    <>
      {children}
      {toastData && (
        <ToastNotification
          message={`Bạn vừa được đánh giá ${toastData.score} sao cho chuyến đi #${toastData.tripId}.`}
          score={toastData.score}
          onClose={() => setToastData(null)}
        />
      )}
    </>
  );
}
