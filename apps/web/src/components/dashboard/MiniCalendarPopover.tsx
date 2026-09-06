import React, { useState } from 'react';
import { Box, Popover, Typography, IconButton, Grid, Button } from '@mui/material';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sun } from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';

interface MiniCalendarPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  weatherTemp?: number;
  weatherDesc?: string;
  isVi?: boolean;
}

export const MiniCalendarPopover: React.FC<MiniCalendarPopoverProps> = ({
  open,
  anchorEl,
  onClose,
  weatherTemp,
  weatherDesc,
  isVi = true
}) => {
  const { tokens } = useThemeContext();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysOfWeekVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const daysOfWeekEn = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const daysHeader = isVi ? daysOfWeekVi : daysOfWeekEn;

  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const monthNamesVi = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = isVi ? monthNamesVi[currentMonth] : monthNamesEn[currentMonth];

  const calendarDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear();
    calendarDays.push({ day: d, isCurrentMonth: true, isToday });
  }
  const totalSlots = Math.ceil(calendarDays.length / 7) * 7;
  let nextMonthDay = 1;
  while (calendarDays.length < totalSlots) {
    calendarDays.push({ day: nextMonthDay++, isCurrentMonth: false, isToday: false });
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right'
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right'
      }}
      PaperProps={{
        sx: {
          mt: 1,
          p: 2,
          width: 310,
          borderRadius: '10px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          boxShadow: '0 12px 36px rgba(0,0,0,0.18)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
          {monthName} {currentYear}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevMonth} sx={{ color: tokens.textSecondary }}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton size="small" onClick={handleNextMonth} sx={{ color: tokens.textSecondary }}>
            <ChevronRight size={16} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1, textAlign: 'center' }}>
        {daysHeader.map((h, i) => (
          <Typography
            key={i}
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.6875rem',
              color: i >= 5 ? tokens.warning : tokens.textSecondary
            }}
          >
            {h}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
        {calendarDays.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: item.isToday ? 800 : item.isCurrentMonth ? 500 : 400,
              backgroundColor: item.isToday
                ? tokens.primary
                : 'transparent',
              color: item.isToday
                ? '#fff'
                : item.isCurrentMonth
                ? tokens.textPrimary
                : `${tokens.textSecondary}60`,
              boxShadow: item.isToday ? `0 2px 8px ${tokens.primary}40` : 'none',
              cursor: item.isCurrentMonth ? 'pointer' : 'default',
              transition: 'all 0.12s ease',
              '&:hover': {
                backgroundColor: item.isToday
                  ? tokens.primary
                  : item.isCurrentMonth
                  ? tokens.hover
                  : 'transparent'
              }
            }}
          >
            {item.day}
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${tokens.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <CalendarIcon size={14} color={tokens.primary} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
            {today.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Typography>
        </Box>

        <Button
          size="small"
          variant="text"
          onClick={handleGoToday}
          sx={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'none', p: 0 }}
        >
          {isVi ? 'Hôm nay' : 'Today'}
        </Button>
      </Box>
    </Popover>
  );
};
