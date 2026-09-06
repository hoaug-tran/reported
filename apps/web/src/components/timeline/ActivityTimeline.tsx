import React from 'react';
import { Box } from '@mui/material';
import {
  CircleDot,
  UserPlus,
  GitMerge,
  RefreshCw,
  Eye,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { ActivityTimelineDto } from '@reported/contracts';

interface ActivityTimelineProps {
  activities: ActivityTimelineDto[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';

  if (!activities || activities.length === 0) return null;

  const filteredActivities = activities.filter(act => act.actionType !== 'COMMENT_ADDED');
  if (filteredActivities.length === 0) return null;

  const deduped: ActivityTimelineDto[] = [];
  filteredActivities.forEach((act, idx) => {
    if (idx === 0) {
      deduped.push(act);
      return;
    }
    const prev = deduped[deduped.length - 1];
    const sameActor = prev.actor.id === act.actor.id;
    const sameAction = prev.actionType === act.actionType;
    const sameTime = Math.abs(new Date(prev.createdAt).getTime() - new Date(act.createdAt).getTime()) < 60000;
    if (!(sameActor && sameAction && sameTime)) {
      deduped.push(act);
    }
  });

  const renderAction = (act: ActivityTimelineDto) => {
    const meta = (act.metadata || {}) as Record<string, unknown>;
    const assignedUser = typeof meta.assignedUser === 'string' ? meta.assignedUser : '';
    const fromStatus = typeof meta.from === 'string' ? meta.from : '';
    const toStatus = typeof meta.to === 'string' ? meta.to : '';
    const prNumber = typeof meta.prNumber === 'number' || typeof meta.prNumber === 'string' ? String(meta.prNumber) : '';
    const decision = typeof meta.decision === 'string' ? meta.decision : '';
    const note = typeof meta.note === 'string' ? meta.note : '';

    switch (act.actionType) {
      case 'CREATED':
        return (
          <>
            <CircleDot size={15} color={tokens.primary} />
            <span>{isVi ? 'đã tạo mục này' : 'created this work item'}</span>
          </>
        );
      case 'ASSIGNED':
        return (
          <>
            <UserPlus size={15} color={tokens.textSecondary} />
            <span>{isVi ? 'đã phân công cho ' : 'assigned '}<strong>@{assignedUser || (isVi ? 'thành viên' : 'someone')}</strong></span>
          </>
        );
      case 'STATUS_CHANGED':
        return (
          <>
            <RefreshCw size={15} color={tokens.warning} />
            <span>
              {isVi ? 'đã đổi trạng thái từ ' : 'changed status from '}<code>{fromStatus}</code>{isVi ? ' sang ' : ' to '}<code>{toStatus}</code>
            </span>
          </>
        );
      case 'PR_LINKED':
        return (
          <>
            <LinkIcon size={15} color={tokens.info} />
            <span>{isVi ? 'đã liên kết pull request ' : 'linked pull request '}<strong>#{prNumber}</strong></span>
          </>
        );
      case 'PR_MERGED':
        return (
          <>
            <GitMerge size={15} color="#a371f7" />
            <span>{isVi ? 'đã gộp pull request ' : 'merged linked pull request '}<strong>#{prNumber}</strong></span>
          </>
        );
      case 'REVIEW_SUBMITTED':
        return (
          <>
            <Eye size={15} color={decision === 'APPROVED' ? tokens.success : tokens.error} />
            <span>
              {isVi ? 'đã gửi kết quả review: ' : 'submitted review decision: '}<strong>{decision}</strong>
              {note && ` ("${note}")`}
            </span>
          </>
        );
      case 'DELETED':
      case 'COMMENT_DELETED':
        return (
          <>
            <Trash2 size={15} color={tokens.error} />
            <span>{isVi ? 'đã xóa mục này' : 'deleted this item'}</span>
          </>
        );
      default:
        return (
          <>
            <RefreshCw size={15} color={tokens.textSecondary} />
            <span>{isVi ? 'đã cập nhật thông tin' : 'updated details'}</span>
          </>
        );
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      {deduped.map((act) => (
        <Box
          key={act.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 0.75,
            fontSize: '0.8125rem',
            color: tokens.textSecondary
          }}
        >
          <UserAvatar user={act.actor} size={20} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: tokens.textPrimary }}>
              {act.actor.displayName}
            </span>
            {renderAction(act)}
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              • {new Date(act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

