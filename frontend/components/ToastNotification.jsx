import { useEffect, useState } from 'react';

export default function ToastNotification({ message, score, onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const getBorderColor = () => {
    if (!score) return '#4caf50';
    if (score >= 4) return '#4caf50'; // Green for good
    if (score === 3) return '#ff9800'; // Orange for neutral
    return '#f44336'; // Red for bad
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#fff',
        color: '#333',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderLeft: `4px solid ${getBorderColor()}`,
        zIndex: 9999,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-20px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{ fontSize: '24px' }}>⭐</div>
      <div style={{ fontSize: '15px', fontWeight: '500', lineHeight: 1.4 }}>
        {message}
      </div>
      <button 
        onClick={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          color: '#999',
          marginLeft: '8px'
        }}
      >
        ×
      </button>
    </div>
  );
}
