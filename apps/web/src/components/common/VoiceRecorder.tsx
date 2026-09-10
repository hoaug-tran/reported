import React, { useState, useRef, useEffect } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { Trash2, Send, AlertCircle, Pause, Play } from "lucide-react";
import { useThemeContext } from "../../contexts/ThemeContext";
import {
  uploadFileWithChunking,
  UploadAttachmentResult,
} from "../../utils/chunkedUpload";

interface VoiceRecorderProps {
  onRecorded: (result: UploadAttachmentResult) => void;
  onCancel: () => void;
  targetType?: string;
  targetId?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecorded,
  onCancel,
  targetType,
  targetId,
}) => {
  const { tokens } = useThemeContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [audioLevels, setAudioLevels] = useState<number[]>([
    0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15,
    0.15, 0.15,
  ]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const meterAnimRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const elapsedOffsetRef = useRef<number>(0);

  const stopMic = () => {
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {}
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      if (isCancelledRef.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        return;
      }

      streamRef.current = stream;

      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const audioCtx = new AudioCtxClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          if (!analyserRef.current || isPausedRef.current) {
            meterAnimRef.current = requestAnimationFrame(updateMeter);
            return;
          }
          analyserRef.current.getByteFrequencyData(dataArray);
          const bars: number[] = [];
          const step = Math.max(1, Math.floor(bufferLength / 14));
          for (let i = 0; i < 14; i++) {
            const val = dataArray[i * step] || 0;
            const normalized = Math.max(0.15, Math.min(1.0, (val / 255) * 1.5));
            bars.push(normalized);
          }
          setAudioLevels(bars);
          meterAnimRef.current = requestAnimationFrame(updateMeter);
        };
        meterAnimRef.current = requestAnimationFrame(updateMeter);
      } catch (audioErr) {
        console.warn("AudioContext visualization failed", audioErr);
      }

      let chosenMime = "audio/webm;codecs=opus";
      if (
        typeof MediaRecorder !== "undefined" &&
        !MediaRecorder.isTypeSupported(chosenMime)
      ) {
        chosenMime = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      }

      const mediaRecorder = chosenMime
        ? new MediaRecorder(stream, {
            mimeType: chosenMime,
            audioBitsPerSecond: 64000,
          })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;
      setRecordingTime(0);
      startTimeRef.current = Date.now();
      elapsedOffsetRef.current = 0;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        const elapsed =
          Math.floor((Date.now() - startTimeRef.current) / 1000) +
          elapsedOffsetRef.current;
        setRecordingTime(elapsed);
      }, 250);
    } catch (err: unknown) {
      setError(
        "Không thể truy cập Microphone. Vui lòng cấp quyền trong trình duyệt.",
      );
      console.error(err);
    }
  };

  useEffect(() => {
    isCancelledRef.current = false;
    startRecording();
    return () => {
      isCancelledRef.current = true;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    isCancelledRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    stopMic();
  };

  const handleTogglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      isPausedRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      elapsedOffsetRef.current += Math.floor(
        (Date.now() - startTimeRef.current) / 1000,
      );
    } else if (recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
      isPausedRef.current = false;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed =
          Math.floor((Date.now() - startTimeRef.current) / 1000) +
          elapsedOffsetRef.current;
        setRecordingTime(elapsed);
      }, 250);
    }
  };

  const handleStopAndSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentElapsed = isPausedRef.current
      ? elapsedOffsetRef.current
      : Math.floor((Date.now() - startTimeRef.current) / 1000) +
        elapsedOffsetRef.current;
    const durationSecs = Math.max(1, currentElapsed);

    recorder.onstop = async () => {
      stopMic();

      const mime = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      const filename = `voice_${Date.now()}.webm`;

      setIsUploading(true);
      try {
        const result = await uploadFileWithChunking(audioBlob, filename, {
          targetType,
          targetId,
        });
        const separator = result.url.includes("?") ? "&" : "?";
        result.url = `${result.url}${separator}d=${durationSecs}`;
        const inlineSeparator = result.inlineUrl.includes("?") ? "&" : "?";
        result.inlineUrl = `${result.inlineUrl}${inlineSeparator}d=${durationSecs}`;
        result.isVoiceNote = true;
        onRecorded(result);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Lỗi khi tải lên file ghi âm";
        setError(msg);
        setIsUploading(false);
      }
    };

    recorder.stop();
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleCancel = () => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    onCancel();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        p: 1.5,
        borderRadius: "8px",
        backgroundColor: `${tokens.error}10`,
        border: `1px solid ${tokens.error}40`,
        my: 1,
      }}
    >
      {error ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: tokens.error,
            width: "100%",
          }}
        >
          <AlertCircle size={18} />
          <Typography variant="body2">{error}</Typography>
          <Button size="small" onClick={handleCancel} sx={{ ml: "auto" }}>
            Đóng
          </Button>
        </Box>
      ) : isUploading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
            justifyContent: "center",
            py: 0.5,
          }}
        >
          <CircularProgress size={18} />
          <Typography
            variant="body2"
            sx={{ color: tokens.textSecondary, fontWeight: 500 }}
          >
            Đang tải lên và xử lý bản ghi âm...
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: tokens.error,
                opacity: isPaused ? 0.4 : 1,
                animation: isPaused
                  ? "none"
                  : "pulse 1.2s infinite ease-in-out",
                "@keyframes pulse": {
                  "0%": { transform: "scale(0.8)", opacity: 0.7 },
                  "50%": { transform: "scale(1.25)", opacity: 1 },
                  "100%": { transform: "scale(0.8)", opacity: 0.7 },
                },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontFamily: "monospace",
                color: tokens.error,
                fontSize: "0.9375rem",
              }}
            >
              {formatTime(recordingTime)}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                height: 22,
                px: 1,
                py: 0.2,
                backgroundColor: "rgba(0,0,0,0.04)",
                borderRadius: "4px",
              }}
            >
              {audioLevels.map((lvl, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 3,
                    height: isPaused ? "15%" : `${Math.round(lvl * 100)}%`,
                    backgroundColor: tokens.error,
                    borderRadius: "2px",
                    transition: "height 0.08s ease-out",
                  }}
                />
              ))}
            </Box>

            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isPaused
                ? "Đang tạm dừng"
                : "Đang thu âm... (nói vào microphone của bạn)"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={isPaused ? <Play size={14} /> : <Pause size={14} />}
              onClick={handleTogglePause}
              sx={{
                textTransform: "none",
                borderRadius: "6px",
                fontSize: "0.75rem",
                height: 32,
              }}
            >
              {isPaused ? "Tiếp tục" : "Tạm dừng"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<Trash2 size={14} />}
              onClick={handleCancel}
              sx={{
                textTransform: "none",
                borderRadius: "6px",
                fontSize: "0.75rem",
                height: 32,
              }}
            >
              Hủy
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<Send size={14} />}
              onClick={handleStopAndSend}
              sx={{
                textTransform: "none",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                height: 32,
              }}
            >
              Gửi Voice
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};
