import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody,
  TableCell, TableHead, TableRow, Select, MenuItem, Typography, Box, Alert
} from '@mui/material';
import { NotificationType, NotificationChannel } from '@reported/contracts';
import { apiFetch } from '../../api/client';
import { useThemeContext } from '../../contexts/ThemeContext';

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  [NotificationType.MENTIONED]: 'When someone @mentions you in an issue or comment',
  [NotificationType.ASSIGNED]: 'When you are assigned to an issue',
  [NotificationType.REVIEW_REQUESTED]: 'When someone requests your review on code or architecture',
  [NotificationType.COMMENTED]: 'When someone comments on your issue or review request',
  [NotificationType.ISSUE_STATUS_CHANGED]: 'When the status of your issue changes (e.g. Open → In Progress → Resolved)',
  [NotificationType.REVIEW_STATUS_CHANGED]: 'When review request decision is submitted (Approved / Changes Requested)'
};

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({ open, onClose }) => {
  const { tokens } = useThemeContext();
  const [preferences, setPreferences] = useState<Record<string, NotificationChannel>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<Record<string, NotificationChannel>>('/notifications/preferences')
      .then(setPreferences)
      .catch(console.error);
  }, [open]);

  const handleChannelChange = (eventType: string, channel: NotificationChannel) => {
    setPreferences(prev => ({ ...prev, [eventType]: channel }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences })
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: `1px solid ${tokens.border}`, pb: 1.5 }}>
        Notification & Email Preferences
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
          Configure how Reported notifies you for different collaboration triggers. Emails are dispatched asynchronously via the Transactional Outbox.
        </Typography>

        {savedSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Preferences saved successfully!
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: tokens.textPrimary }}>Trigger Event</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.textPrimary, width: 160 }}>Channel</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(EVENT_LABELS).map(([eventType, label]) => (
              <TableRow key={eventType}>
                <TableCell sx={{ fontSize: '0.84rem' }}>{label}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={preferences[eventType] || NotificationChannel.BOTH}
                    onChange={(e) => handleChannelChange(eventType, e.target.value as NotificationChannel)}
                    sx={{ fontSize: '0.8125rem', height: 32 }}
                  >
                    <MenuItem value={NotificationChannel.IN_APP}>In-App Only</MenuItem>
                    <MenuItem value={NotificationChannel.EMAIL}>Email Only</MenuItem>
                    <MenuItem value={NotificationChannel.BOTH}>Both (App & Email)</MenuItem>
                    <MenuItem value={NotificationChannel.DISABLED}>Disabled</MenuItem>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: `1px solid ${tokens.border}` }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

