import React, { useState } from 'react';
import { Box, Typography, Button, Divider, Alert } from '@mui/material';
import { CommentItem } from './CommentItem';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { CommentDto, TargetType } from '@reported/contracts';
import { apiFetch } from '../../api/client';

interface CommentThreadProps {
  targetType: TargetType;
  targetId: string;
  comments: CommentDto[];
  onRefresh: () => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  targetType,
  targetId,
  comments,
  onRefresh
}) => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          content: newComment
        })
      });
      setNewComment('');
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuote = (quoteText: string) => {
    setNewComment(prev => (prev ? `${prev}\n\n${quoteText}` : quoteText));
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>Discussion</span>
        <span style={{ fontSize: '0.8125rem', color: tokens.textSecondary, fontWeight: 500 }}>
          ({comments.length})
        </span>
      </Typography>

      {comments.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center', color: tokens.textSecondary, fontStyle: 'italic', fontSize: '0.875rem' }}>
          No comments yet. Start the technical discussion below.
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onRefresh={onRefresh}
              onQuote={handleQuote}
            />
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${tokens.divider}` }}>
        {user ? (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: tokens.textPrimary }}>
              Add a response
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <MarkdownEditor
              value={newComment}
              onChange={setNewComment}
              placeholder="Leave technical feedback, paste logs, JSON, code blocks, or tag colleagues with @..."
              minRows={4}
              onSubmit={handleSubmit}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting ? 'Posting...' : 'Comment'}
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center', backgroundColor: tokens.surfaceSecondary, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              Please sign in to participate in this discussion.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

