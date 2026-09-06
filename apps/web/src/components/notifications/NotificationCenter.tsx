import React, { useState, useEffect } from 'react';
import {
  Popover, Box, Typography, Button, IconButton, Tabs, Tab, List, ListItemButton,
  ListItemAvatar, ListItemText, Tooltip, Divider, Badge
} from '@mui/material';
import { Bell, CheckCheck, Settings, MailCheck, Bug, Eye, AtSign, Monitor } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../../contexts/ThemeContext';
import { UserAvatar } from '../common/UserAvatar';
import { NotificationDto, NotificationType } from '@reported/contracts';
import { apiFetch } from '../../api/client';
import {
  isDesktopNotificationSupported,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  showDesktopNotification
} from '../../utils/desktopNotification';

interface NotificationCenterProps {
  notifications: NotificationDto[];
  unreadCount: number;
  onRefresh: () => void;
  onOpenPreferences: () => void;
  onOpenEmailInspector: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onRefresh,
  onOpenPreferences,
  onOpenEmailInspector
}) => {
  const { tokens } = useThemeContext();
  const [, setLocation] = useLocation();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('unread');
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setDesktopPerm(getDesktopNotificationPermission());
  }, [open]);

  const handleEnableDesktop = async () => {
    const res = await requestDesktopNotificationPermission();
    setDesktopPerm(res);
    if (res === 'granted') {
      showDesktopNotification('Reported Notification', {
        body: 'Thông báo Desktop đã được kết nối trực tiếp với Windows!',
        onClick: () => window.focus()
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickNotification = async (n: NotificationDto) => {
    if (!n.isRead) {
      try {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
      } catch (err) {
        console.error(err);
      }
    }
    setAnchorEl(null);
    onRefresh();
    setLocation(n.link);
  };

  const filtered = notifications.filter(n => (filterTab === 'unread' ? !n.isRead : true));

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.MENTIONED:
        return <AtSign size={16} color={tokens.primary} />;
      case NotificationType.ASSIGNED:
        return <Bug size={16} color={tokens.warning} />;
      case NotificationType.REVIEW_REQUESTED:
      case NotificationType.REVIEW_APPROVED:
        return <Eye size={16} color="#a371f7" />;
      default:
        return <Bell size={16} color={tokens.textSecondary} />;
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: tokens.textSecondary }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Bell size={20} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }
        }}
      >

        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${tokens.border}` }}>
          <Typography variant="h4" sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isDesktopNotificationSupported() && (
              <Tooltip title={desktopPerm === 'granted' ? 'Thông báo Windows đang bật (Bấm để thử)' : 'Bật thông báo đẩy về Windows'}>
                <IconButton
                  size="small"
                  onClick={desktopPerm === 'granted' ? () => {
                    showDesktopNotification('Reported Windows Notification', {
                      body: 'Hệ thống thông báo đẩy trực tiếp về Windows đang hoạt động tốt!',
                      onClick: () => window.focus()
                    });
                  } : handleEnableDesktop}
                  sx={{ color: desktopPerm === 'granted' ? tokens.primary : tokens.textSecondary }}
                >
                  <Monitor size={18} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Email Outbox Inspector">
              <IconButton size="small" onClick={() => { setAnchorEl(null); onOpenEmailInspector(); }} sx={{ color: tokens.textSecondary }}>
                <MailCheck size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Preferences">
              <IconButton size="small" onClick={() => { setAnchorEl(null); onOpenPreferences(); }} sx={{ color: tokens.textSecondary }}>
                <Settings size={18} />
              </IconButton>
            </Tooltip>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={handleMarkAllRead} sx={{ color: tokens.textSecondary }}>
                  <CheckCheck size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Tabs
          value={filterTab}
          onChange={(_, v) => setFilterTab(v)}
          sx={{ minHeight: 36, borderBottom: `1px solid ${tokens.border}`, px: 1 }}
        >
          <Tab value="unread" label={`Unread (${unreadCount})`} sx={{ minHeight: 36, py: 0.5, fontSize: '0.75rem' }} />
          <Tab value="all" label="All" sx={{ minHeight: 36, py: 0.5, fontSize: '0.75rem' }} />
        </Tabs>

        {desktopPerm !== 'granted' && isDesktopNotificationSupported() && (
          <Box sx={{
            px: 1.5,
            py: 1,
            backgroundColor: `${tokens.primary}14`,
            borderBottom: `1px solid ${tokens.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Monitor size={15} color={tokens.primary} />
              <Typography sx={{ fontSize: '0.75rem', color: tokens.textPrimary, fontWeight: 500 }}>
                Nhận thông báo đẩy trên Windows
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              onClick={handleEnableDesktop}
              sx={{
                fontSize: '0.6875rem',
                py: 0.25,
                px: 1.2,
                minWidth: 'auto',
                textTransform: 'none',
                backgroundColor: tokens.primary,
                color: '#ffffff'
              }}
            >
              Bật ngay
            </Button>
          </Box>
        )}

        <List dense sx={{ py: 0, maxHeight: 380, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: tokens.textSecondary, fontSize: '0.8125rem' }}>
              No {filterTab === 'unread' ? 'unread ' : ''}notifications.
            </Box>
          ) : (
            filtered.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => handleClickNotification(item)}
                sx={{
                  py: 1,
                  px: 1.5,
                  borderBottom: `1px solid ${tokens.divider}`,
                  backgroundColor: item.isRead ? 'transparent' : tokens.hover,
                  alignItems: 'flex-start',
                  gap: 1.5
                }}
              >
                <ListItemAvatar sx={{ minWidth: 28, mt: 0.5 }}>
                  {item.actor ? (
                    <UserAvatar user={item.actor} size={26} showTooltip={false} />
                  ) : (
                    renderIcon(item.type)
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: item.isRead ? 500 : 700, fontSize: '0.8125rem' }}>
                        {item.title}
                      </Typography>
                      {!item.isRead && (
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tokens.primary, ml: 1, flexShrink: 0 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', mt: 0.2 }}>
                        {item.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, opacity: 0.8, fontSize: '0.6875rem' }}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))
          )}
        </List>
      </Popover>
    </>
  );
};

