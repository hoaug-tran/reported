import React, { useState } from 'react';
import { Box, Typography, IconButton, Button, Tooltip, Menu, MenuItem } from '@mui/material';
import { Reply, Quote, Edit2, Trash2, Smile } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { CommentDto, ReactionType } from '@reported/contracts';
import { apiFetch } from '../../api/client';

interface CommentItemProps {
  comment: CommentDto;
  onRefresh: () => void;
  onQuote: (quoteText: string) => void;
  isNested?: boolean;
}

const AVAILABLE_REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: ReactionType.LIKE, emoji: '👍', label: 'Like' },
  { type: ReactionType.DISLIKE, emoji: '👎', label: 'Dislike' },
  { type: ReactionType.HEART, emoji: '❤️', label: 'Love' },
  { type: ReactionType.HOORAY, emoji: '🎉', label: 'Hooray' },
  { type: ReactionType.ROCKET, emoji: '🚀', label: 'Rocket' },
  { type: ReactionType.EYES, emoji: '👀', label: 'Eyes' },
  { type: ReactionType.FIRE, emoji: '🔥', label: 'Fire' },
  { type: ReactionType.USEFUL, emoji: '💡', label: 'Idea' },
  { type: ReactionType.AGREE, emoji: '✅', label: 'Agree' },
  { type: ReactionType.DISAGREE, emoji: '❌', label: 'Disagree' },
  { type: ReactionType.BUG, emoji: '🐛', label: 'Bug' },
  { type: ReactionType.CONFUSED, emoji: '😕', label: 'Confused' }
];

const REACTION_EMOJIS: Record<string, string> = {
  [ReactionType.LIKE]: '👍',
  [ReactionType.DISLIKE]: '👎',
  [ReactionType.HEART]: '❤️',
  [ReactionType.HOORAY]: '🎉',
  [ReactionType.ROCKET]: '🚀',
  [ReactionType.EYES]: '👀',
  [ReactionType.FIRE]: '🔥',
  [ReactionType.USEFUL]: '💡',
  [ReactionType.AGREE]: '✅',
  [ReactionType.DISAGREE]: '❌',
  [ReactionType.BUG]: '🐛',
  [ReactionType.CONFUSED]: '😕'
};

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onRefresh,
  onQuote,
  isNested = false
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspace();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [reactionAnchor, setReactionAnchor] = useState<null | HTMLElement>(null);

  const isLeader = activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN' || user?.role === 'ADMIN';
  const canModify = user && (user.id === comment.author.id || isLeader);

  const handleToggleReaction = async (reaction: ReactionType | string) => {
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
        my: 1.5,
        ml: isNested ? { xs: 2, sm: 3.5 } : 0,
        position: 'relative'
      }}
    >
      <Box
        sx={{
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          overflow: 'hidden',
          transition: 'border-color 0.15s ease',
          '&:hover': {
            borderColor: tokens.primary
          }
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: tokens.surfaceSecondary,
            borderBottom: `1px solid ${tokens.border}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <UserAvatar user={comment.author} size={22} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary, fontSize: '0.84rem' }}>
              {comment.author.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.78rem' }}>
              @{comment.author.username}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.75rem' }}>
              • {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>


          {!comment.isDeleted && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              <Tooltip title="Quote reply">
                <IconButton
                  size="small"
                  onClick={() => {
                    const cleanBody = comment.content.trim().split('\n').map(l => `> ${l}`).join('\n');
                    onQuote(`${cleanBody}\n\n@${comment.author.username} `);
                  }}
                  sx={{ color: tokens.textSecondary, p: 0.6 }}
                >
                  <Quote size={14} />
                </IconButton>
              </Tooltip>

              {!isNested && (
                <Tooltip title="Reply">
                  <IconButton size="small" onClick={() => setIsReplying(!isReplying)} sx={{ color: tokens.textSecondary, p: 0.6 }}>
                    <Reply size={14} />
                  </IconButton>
                </Tooltip>
              )}

              {canModify && (
                <>
                  <Tooltip title="Edit comment">
                    <IconButton size="small" onClick={() => setIsEditing(!isEditing)} sx={{ color: tokens.textSecondary, p: 0.6 }}>
                      <Edit2 size={14} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete comment">
                    <IconButton size="small" onClick={handleDelete} sx={{ color: tokens.textSecondary, p: 0.6 }}>
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {comment.isDeleted ? (
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: tokens.textSecondary }}>
              [Bình luận đã bị xóa]
            </Typography>
          ) : isEditing ? (
            <Box>
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                targetType={comment.targetType}
                targetId={comment.targetId}
                minRows={3}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
                <Button size="small" variant="text" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="small" variant="contained" onClick={handleSaveEdit}>Save changes</Button>
              </Box>
            </Box>
          ) : (
            <MarkdownRenderer content={comment.content} />
          )}
        </Box>

        {!comment.isDeleted && (
          <Box
            sx={{
              px: 2,
              pb: 1.5,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.6
            }}
          >
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
                    py: 0.25,
                    borderRadius: '12px',
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
                  <span style={{ color: r.hasReacted ? tokens.primary : tokens.textSecondary, fontSize: '0.72rem' }}>
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
                  py: 0.25,
                  borderRadius: '12px',
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

            <Menu
              anchorEl={reactionAnchor}
              open={Boolean(reactionAnchor)}
              onClose={() => setReactionAnchor(null)}
              PaperProps={{
                sx: {
                  p: 0.5,
                  borderRadius: '12px',
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }
              }}
              transformOrigin={{ horizontal: 'left', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5, p: 0.5 }}>
                {AVAILABLE_REACTIONS.map((item) => (
                  <Tooltip key={item.type} title={item.label}>
                    <Box
                      onClick={() => handleToggleReaction(item.type)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 34,
                        fontSize: '1.25rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s, background-color 0.1s',
                        '&:hover': {
                          backgroundColor: tokens.hover,
                          transform: 'scale(1.2)'
                        }
                      }}
                    >
                      {item.emoji}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Menu>
          </Box>
        )}
      </Box>

      {isReplying && (
        <Box sx={{ mt: 1.5, ml: { xs: 1, sm: 3 } }}>
          <MarkdownEditor
            value={replyContent}
            onChange={setReplyContent}
            targetType={comment.targetType}
            targetId={comment.targetId}
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

