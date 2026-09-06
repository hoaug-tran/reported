import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import { X, Bug, Eye, HelpCircle, Lightbulb, AlertTriangle, MessageSquare } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';

interface NewPostModalProps {
  open: boolean;
  onClose: () => void;
}

interface IntentOption {
  id: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  route: string;
}

export const NewPostModal: React.FC<NewPostModalProps> = ({ open, onClose }) => {
  const [, setLocation] = useLocation();
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';

  const intents: IntentOption[] = [
    {
      id: 'bug',
      icon: <Bug size={18} color="#ef4444" />,
      color: '#ef4444',
      title: isVi ? 'Báo lỗi' : 'Report Bug',
      description: isVi
        ? 'App lỗi, crash, sai dữ liệu hoặc chạy khác mong đợi.'
        : 'App breaks, crashes, returns wrong data, or behaves oddly.',
      route: '/issues/new?intent=bug'
    },
    {
      id: 'review',
      icon: <Eye size={18} color="#a855f7" />,
      color: '#a855f7',
      title: isVi ? 'Yêu cầu review PR' : 'Review PR',
      description: isVi
        ? 'Chọn repo và PR đã liên kết. Form tự điền link, branch và tiêu đề.'
        : 'Pick linked repo and PR. Form fills link, branch, and title.',
      route: '/reviews/new?intent=review'
    },
    {
      id: 'question',
      icon: <HelpCircle size={18} color="#3b82f6" />,
      color: '#3b82f6',
      title: isVi ? 'Hỏi kỹ thuật' : 'Ask Question',
      description: isVi
        ? 'Hỏi cách làm, lỗi đang kẹt, API, thư viện hoặc setup môi trường.'
        : 'Ask about approach, blocker, API, library, or environment setup.',
      route: '/issues/new?intent=question'
    },
    {
      id: 'idea',
      icon: <Lightbulb size={18} color="#10b981" />,
      color: '#10b981',
      title: isVi ? 'Đề xuất' : 'Proposal',
      description: isVi
        ? 'Gợi ý cải tiến code, hiệu năng, kiến trúc hoặc tính năng nên làm.'
        : 'Suggest code, performance, architecture, or product improvements.',
      route: '/issues/new?intent=idea'
    },
    {
      id: 'help',
      icon: <AlertTriangle size={18} color="#f59e0b" />,
      color: '#f59e0b',
      title: isVi ? 'Cần hỗ trợ gấp' : 'Urgent Help',
      description: isVi
        ? 'Sự cố đang chặn dev, staging hoặc production. Cần người xử lý ngay.'
        : 'Dev, staging, or production blocker. Needs immediate help.',
      route: '/issues/new?intent=help'
    },
    {
      id: 'discussion',
      icon: <MessageSquare size={18} color="#06b6d4" />,
      color: '#06b6d4',
      title: isVi ? 'Bàn kiến trúc' : 'Architecture Talk',
      description: isVi
        ? 'Mở hướng thảo luận trước khi đổi flow, schema hoặc thiết kế lớn.'
        : 'Discuss flow, schema, or design changes before building.',
      route: '/issues/new?intent=discussion'
    }
  ];

  const handleSelect = (route: string) => {
    onClose();
    setLocation(route);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: tokens.surface,
          backgroundImage: 'none',
          border: `1px solid ${tokens.border}`,
          borderRadius: '8px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.38)',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 64px)'
        }
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${tokens.border}`
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', color: tokens.textPrimary }}>
            {isVi ? 'Bạn muốn chia sẻ điều gì?' : 'What do you want to share?'}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', mt: 0.3 }}>
            {isVi
              ? 'Chọn đúng mục đích để đồng nghiệp nắm bắt ngữ cảnh nhanh nhất'
              : 'Choose the conversation format that best fits your context'}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{
            color: tokens.textSecondary,
            mt: -0.5,
            mr: -0.5,
            '&:hover': { color: tokens.textPrimary, backgroundColor: tokens.hover }
          }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: '24px !important', overflowY: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 1.5
          }}
        >
          {intents.map((item) => (
            <Box
              key={item.id}
              onClick={() => handleSelect(item.route)}
              sx={{
                borderRadius: '8px',
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.surfaceSecondary,
                p: 2.2,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                '&:hover': {
                  borderColor: item.color,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 4px 16px -4px ${item.color}30`,
                  backgroundColor: tokens.hover
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${item.color}14`,
                    border: `1px solid ${item.color}28`,
                    flexShrink: 0
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: tokens.textPrimary,
                    lineHeight: 1.3
                  }}
                >
                  {item.title}
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: tokens.textSecondary,
                  fontSize: '0.775rem',
                  lineHeight: 1.5
                }}
              >
                {item.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
