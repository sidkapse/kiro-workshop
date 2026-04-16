import { useState } from 'react';
import { User } from '../types/user';

interface AvatarProps {
  user: Pick<User, 'displayName' | 'avatarUrl'>;
  size: 'sm' | 'lg';
}

/**
 * Extracts up to 2 initials from a display name.
 * Falls back to '?' for empty/whitespace-only strings.
 */
export function getInitials(displayName: string): string {
  const tokens = displayName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '?';
  return tokens.map(t => t[0].toUpperCase()).join('').slice(0, 2);
}

const sizeStyles: Record<'sm' | 'lg', React.CSSProperties> = {
  sm: { width: 40, height: 40, lineHeight: '40px' },
  lg: { width: 80, height: 80, lineHeight: '80px' },
};

/**
 * Displays a user's avatar image, falling back to a coloured initials badge
 * if no avatarUrl is set or the image fails to load.
 */
export default function Avatar({ user, size }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const baseStyle: React.CSSProperties = {
    ...sizeStyles[size],
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  };

  if (user.avatarUrl && !imgError) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        onError={() => setImgError(true)}
        style={{ ...baseStyle, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: '#d97706',
        color: '#fff',
        textAlign: 'center',
        fontWeight: 600,
        fontSize: size === 'lg' ? 28 : 14,
        userSelect: 'none',
      }}
    >
      {getInitials(user.displayName)}
    </div>
  );
}
