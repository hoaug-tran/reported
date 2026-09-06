import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box,
  Typography, RadioGroup, FormControlLabel, Radio, Alert
} from '@mui/material';
import { CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { ReviewerDecision } from '@reported/contracts';
import { apiFetch } from '../../api/client';
import { useThemeContext } from '../../contexts/ThemeContext';

interface ReviewDecisionDialogProps {
  open: boolean;
  reviewId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewDecisionDialog: React.FC<ReviewDecisionDialogProps> = ({
  open,
  reviewId,
  onClose,
  onSuccess
}) => {
  const { tokens } = useThemeContext();
  const [decision, setDecision] = useState<ReviewerDecision>(ReviewerDecision.APPROVED);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/reviews/${reviewId}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          decisionNote: note || undefined
        })
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to submit review decision';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: `1px solid ${tokens.border}`, pb: 1.5, fontWeight: 600 }}>
        Submit Review Decision
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <RadioGroup
          value={decision}
          onChange={(e) => setDecision(e.target.value as ReviewerDecision)}
          sx={{ mb: 2 }}
        >
          <FormControlLabel
            value={ReviewerDecision.APPROVED}
            control={<Radio color="success" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle2 size={18} color={tokens.success} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Approve</Typography>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Submit feedback and approve merging or implementation.</Typography>
                </Box>
              </Box>
            }
            sx={{ mb: 1.5, alignItems: 'flex-start' }}
          />

          <FormControlLabel
            value={ReviewerDecision.CHANGES_REQUESTED}
            control={<Radio color="error" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertCircle size={18} color={tokens.error} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Request Changes</Typography>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Submit feedback that must be addressed before approval.</Typography>
                </Box>
              </Box>
            }
            sx={{ mb: 1.5, alignItems: 'flex-start' }}
          />

          <FormControlLabel
            value={ReviewerDecision.COMMENTED}
            control={<Radio color="default" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MessageSquare size={18} color={tokens.textSecondary} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Comment</Typography>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Submit general feedback without explicit approval or rejection.</Typography>
                </Box>
              </Box>
            }
            sx={{ alignItems: 'flex-start' }}
          />
        </RadioGroup>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Decision Note (Optional)"
          placeholder="Leave a short note or summary of your decision..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${tokens.border}` }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={decision === ReviewerDecision.APPROVED ? 'success' : decision === ReviewerDecision.CHANGES_REQUESTED ? 'error' : 'primary'}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Decision'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

