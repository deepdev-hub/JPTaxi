import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getRideSocketUrl } from '../api/rides.js';
import { getAuthToken } from '../utils/session.js';

const RIDE_EVENTS = [
  'dispatchRadiusUpdated',
  'dispatchOfferCreated',
  'dispatchOfferExpired',
  'dispatchOfferRejected',
  'dispatchReset',
  'rideAccepted',
  'rideRequestCancelled',
  'driverCancelledRide',
  'paymentRequested',
  'tripPaid',
  'locationUpdated',
  'driver_received_rating',
];

export function useRideSocket({ requestId, tripId, handlers = {} } = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return undefined;

    const socket = io(getRideSocketUrl(), {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    for (const event of RIDE_EVENTS) {
      socket.on(event, (payload) => {
        const handler = handlersRef.current?.[event];
        if (typeof handler === 'function') handler(payload);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || (!requestId && !tripId)) return undefined;

    const join = () => socket.emit('joinRideRoom', { requestId, tripId });
    if (socket.connected) join();
    else socket.on('connect', join);

    return () => socket.off('connect', join);
  }, [requestId, tripId]);
}
