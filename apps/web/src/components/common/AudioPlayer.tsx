import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Box, IconButton, Slider, Typography, Tooltip } from '@mui/material';
import { Play, Pause, Volume2, VolumeX, Mic } from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';

interface AudioPlayerProps {
  src: string;
  durationSeconds?: number;
  label?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  durationSeconds,
  label = 'Tin nhắn thoại'
}) => {
  const { tokens } = useThemeContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initialDuration = useMemo(() => {
    try {
      const url = new URL(src, window.location.href);
      const d = url.searchParams.get('d') || url.searchParams.get('duration');
      if (d && !isNaN(Number(d)) && Number(d) > 0) {
        return Math.round(Number(d));
      }
    } catch {}
    return durationSeconds || 0;
  }, [src, durationSeconds]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (initialDuration > 0 && duration === 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration));
      } else if (audio.duration === Infinity && initialDuration === 0) {
        audio.currentTime = 1e101;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          if (isFinite(audio.duration) && audio.duration > 0) {
            setDuration(Math.round(audio.duration));
          }
          audio.currentTime = 0;
        };
      }
    };

    const onTimeUpdate = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      if (duration > 0 && audio.currentTime >= duration) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = 0;
        setCurrentTime(0);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      const loop = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.ended || (duration > 0 && Math.abs(audio.currentTime - duration) < 0.2)) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const handleSliderChange = (_: Event, val: number | number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Array.isArray(val) ? val[0] : val;
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const total = Math.floor(secs);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1,
        px: 1.5,
        my: 0.5,
        borderRadius: '8px',
        backgroundColor: tokens.surfaceSecondary,
        border: `1px solid ${tokens.border}`,
        maxWidth: 360,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <audio ref={audioRef} src={src} preload="auto" />

      <IconButton
        size="small"
        onClick={togglePlay}
        sx={{
          backgroundColor: tokens.primary,
          color: '#fff',
          width: 32,
          height: 32,
          flexShrink: 0,
          '&:hover': {
            backgroundColor: tokens.primary,
            filter: 'brightness(1.1)'
          }
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: -0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textPrimary, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Mic size={12} color={tokens.primary} />
            {label}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Box>

        <Slider
          size="small"
          value={Math.min(currentTime, duration || 1)}
          min={0}
          max={duration || 1}
          onChange={handleSliderChange}
          sx={{
            color: tokens.primary,
            height: 4,
            p: '6px 0',
            '& .MuiSlider-thumb': {
              width: 10,
              height: 10,
              transition: 'none',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0px 0px 0px 6px ${tokens.primary}20`
              }
            },
            '& .MuiSlider-rail': {
              opacity: 0.28
            }
          }}
        />
      </Box>

      <Tooltip title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}>
        <IconButton
          size="small"
          onClick={toggleMute}
          sx={{
            color: isMuted ? tokens.error : tokens.textSecondary,
            p: 0.5,
            flexShrink: 0,
            '&:hover': {
              color: tokens.textPrimary
            }
          }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};
