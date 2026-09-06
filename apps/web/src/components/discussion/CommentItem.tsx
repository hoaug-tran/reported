import React, { useState } from 'react';
import { Box, Typography, IconButton, Button, Tooltip, Menu, MenuItem } from '@mui/material';
import { Reply, Quote, Edit2, Trash2, Smile } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { CommentDto, ReactionType } from '@reported/contracts';
import { apiFetch } from '../../api/client';

interface CommentItemProps {
  comment: CommentDto;
  onRefresh: () => void;
  onQuote: (quoteText: string) => void;
  isNested?: boolean;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  [ReactionType.LIKE]: '👍',
  [ReactionType.USEFUL]: '💡',
  [ReactionType.AGREE]: '✅',
  [ReactionType.DISAGREE]: '❌',
  [ReactionType.EYES]: '👀'
};

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onRefresh,
  onQuote,
  isNested = false
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const { user } = useAuthContext();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [reactionAnchor, setReactionAnchor] = useState<null | HTMLElement>(null);

  const canModify = user && (user.id === comment.author.id || user.role === 'ADMIN');

  const handleToggleReaction = async (reaction: ReactionType) => {
    setReactionAnchor(null);
    try {
      await apiFetch(`/comments/${comment.id}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reaction })
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await apiFetch(`/comments/${comment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editContent })
      });
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await apiFetch(`/comments/${comment.id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify({
          targetType: comment.targetType,
          targetId: comment.targetId,
          parentId: comment.id,
          content: replyContent
        })
      });
      setReplyContent('');
      setIsReplying(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: isNested ? 'none' : `1px solid ${tokens.divider}`,
        ml: isNested ? 3 : 0,
        pl: isNested ? 1.5 : 0,
        borderLeft: isNested ? `2px solid ${tokens.border}` : 'none'
      }}
    >

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UserAvatar user={comment.author} size={24} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary }}>
            {comment.author.displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
            @{comment.author.username}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
            • {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>

        <Menu
          anchorEl={reactionAnchor}
          open={Boolean(reactionAnchor)}
          onClose={() => setReactionAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
            <MenuItem
              key={type}
              onClick={() => handleToggleReaction(type as ReactionType)}
              sx={{ fontSize: '1.1rem', py: 0.5 }}
            >
              {emoji} <Typography variant="caption" sx={{ ml: 1, textTransform: 'capitalize' }}>{type.toLowerCase()}</Typography>
            </MenuItem>
          ))}
        </Menu>

        {!comment.isDeleted && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Quote reply">
              <IconButton
                size="small"
                onClick={() => {
                  const cleanBody = comment.content.trim().split('\n').map(l => `> ${l}`).join('\n');
                  onQuote(`${cleanBody}\n\n@${comment.author.username} `);
                }}
                sx={{ color: tokens.textSecondary }}
              >
                <Quote size={16} />
              </IconButton>
            </Tooltip>

            {!isNested && (
              <Tooltip title="Reply">
                <IconButton size="small" onClick={() => setIsReplying(!isReplying)} sx={{ color: tokens.textSecondary }}>
                  <Reply size={16} />
                </IconButton>
              </Tooltip>
            )}

            {canModify && (
              <>
                <Tooltip title="Edit comment">
                  <IconButton size="small" onClick={() => setIsEditing(!isEditing)} sx={{ color: tokens.textSecondary }}>
                    <Edit2 size={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete comment">
                  <IconButton size="small" onClick={handleDelete} sx={{ color: tokens.textSecondary }}>
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        )}
      </Box>

      {comment.isDeleted ? (
        <Box sx={{ pl: 0.5, py: 0.5 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: tokens.textSecondary }}>
            [Bình luận đã bị xóa bởi người dùng]
          </Typography>
        </Box>
      ) : isEditing ? (
        <Box sx={{ my: 1 }}>
          <MarkdownEditor value={editContent} onChange={setEditContent} minRows={3} />
          <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
            <Button size="small" variant="text" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button size="small" variant="contained" onClick={handleSaveEdit}>Save changes</Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ pl: 0.5 }}>
          <MarkdownRenderer content={comment.content} />
        </Box>
      )}

      {!comment.isDeleted && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.6, mt: 1.2 }}>
          {comment.reactions && comment.reactions.map((r) => (
            <Tooltip
              key={r.reaction}
              title={`${r.users.map(u => u.displayName).join(', ')} (${r.reaction})`}
            >
              <Box
                onClick={() => handleToggleReaction(r.reaction)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 0.8,
                  py: 0.3,
                  borderRadius: '6px',
                  backgroundColor: r.hasReacted ? tokens.selected : tokens.surfaceSecondary,
                  border: `1px solid ${r.hasReacted ? tokens.primary : tokens.border}`,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  userSelect: 'none',
                  transition: 'all 0.12s ease',
                  '&:hover': {
                    backgroundColor: tokens.hover,
                    borderColor: tokens.primary
                  }
                }}
              >
                <span>{REACTION_EMOJIS[r.reaction]}</span>
                <span style={{ color: r.hasReacted ? tokens.primary : tokens.textSecondary }}>
                  {r.count}
                </span>
              </Box>
            </Tooltip>
          ))}

          <Tooltip title="Add reaction">
            <Box
              onClick={(e) => setReactionAnchor(e.currentTarget)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                px: 0.8,
                py: 0.3,
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: `1px dashed ${tokens.border}`,
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: tokens.textSecondary,
                userSelect: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: tokens.primary,
                  color: tokens.primary,
                  backgroundColor: tokens.hover
                }
              }}
            >
              <Smile size={13} />
              <span>React</span>
            </Box>
          </Tooltip>
        </Box>
      )}

      {isReplying && (
        <Box sx={{ mt: 1.5, ml: 2 }}>
          <MarkdownEditor
            value={replyContent}
            onChange={setReplyContent}
            placeholder={`Reply to @${comment.author.username}...`}
            minRows={2}
            onSubmit={handleSubmitReply}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
            <Button size="small" variant="text" onClick={() => setIsReplying(false)}>Cancel</Button>
            <Button size="small" variant="contained" onClick={handleSubmitReply}>Submit Reply</Button>
          </Box>
        </Box>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onRefresh={onRefresh}
              onQuote={onQuote}
              isNested={true}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

