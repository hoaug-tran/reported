import React from 'react';
import { Avatar, Tooltip } from '@mui/material';
import { UserSummaryDto } from '@reported/contracts';

interface UserAvatarProps {
  user?: Partial<UserSummaryDto> | null;
  size?: number;
  showTooltip?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 24,
  showTooltip = true
}) => {
  if (!user) {
    return (
      <Avatar
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          backgroundColor: '#8b949e',
          color: '#ffffff'
        }}
      >
        ?
      </Avatar>
    );
  }

  const initials = (user.displayName || user.username || 'U')
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const avatar = (
    <Avatar
      src={user.avatarUrl || undefined}
      alt=""
      aria-hidden="true"
      imgProps={{ alt: '', 'aria-hidden': true }}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        fontWeight: 600,
        backgroundColor: '#30363d',
        color: '#f0f6fc',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        userSelect: 'none'
      }}
    >
      {initials}
    </Avatar>
  );

  if (!showTooltip) return avatar;

  return (
    <Tooltip title={`${user.displayName || user.username} (@${user.username})`}>
      {avatar}
    </Tooltip>
  );
};

