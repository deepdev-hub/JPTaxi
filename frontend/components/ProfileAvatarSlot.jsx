/**
 * Ô avatar có khung cố định — ảnh không tràn layout.
 * slot="1": vị trí #1 sidebar (wireframe)
 * slot="topbar": avatar trên thanh header
 * slot="preview": xem trước trong modal
 */
const SLOT_CLASS = {
  '1': 'profile-avatar--slot-1',
  topbar: 'profile-avatar--topbar',
  tracking: 'profile-avatar--tracking',
  preview: 'profile-avatar--preview',
};

export default function ProfileAvatarSlot({
  src,
  fallbackText = '',
  className = '',
  slot = '1',
}) {
  const fallback = fallbackText.trim().charAt(0) || '?';
  const slotClass = SLOT_CLASS[slot] ?? SLOT_CLASS['1'];

  const inner = (
    <div
      className={`profile-avatar ${slotClass} ${className}`.trim()}
      role={src ? 'img' : undefined}
      aria-label={src ? 'プロフィール画像' : undefined}
    >
      {src ? (
        <img key={src} src={src} alt="" />
      ) : (
        <span className="profile-avatar-fallback" aria-hidden="true">
          {fallback}
        </span>
      )}
    </div>
  );

  if (slot === '1') {
    return (
      <div className="profile-avatar-slot-1" data-profile-slot="1">
        {inner}
      </div>
    );
  }

  if (slot === 'topbar') {
    return (
      <div className="profile-avatar-slot-topbar" data-profile-slot="topbar">
        {inner}
      </div>
    );
  }

  return inner;
}
