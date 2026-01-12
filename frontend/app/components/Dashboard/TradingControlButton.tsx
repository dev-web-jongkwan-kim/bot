'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  alpha,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { tradingControlApi } from '../../lib/api';

interface TradingStatus {
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING';
  isRunning: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  reason?: string;
}

interface TradingControlButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export default function TradingControlButton({
  size = 'md',
  showStatus = true,
}: TradingControlButtonProps) {
  const [status, setStatus] = useState<TradingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 상태 조회
  const fetchStatus = useCallback(async () => {
    try {
      const response = await tradingControlApi.getStatus();
      setStatus(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch trading status:', err);
      setError('Failed to fetch status');
    }
  }, []);

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // 5초마다 상태 확인
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // 시작/종료 토글
  const handleToggle = async () => {
    if (loading || !status) return;

    const isStarting = status.status === 'STOPPED';
    const confirmMessage = isStarting
      ? 'Start live trading?'
      : 'Stop live trading? All pending orders will continue to be monitored.';

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    setError(null);

    try {
      if (isStarting) {
        await tradingControlApi.start();
      } else {
        await tradingControlApi.stop('Manual stop from UI');
      }
      await fetchStatus();
    } catch (err: any) {
      console.error('Failed to toggle trading:', err);
      setError(err.message || 'Failed to toggle trading');
    } finally {
      setLoading(false);
    }
  };

  // 사이즈별 스타일
  const sizeStyles = {
    sm: { px: 2, py: 0.75, fontSize: '0.875rem' },
    md: { px: 2.5, py: 1, fontSize: '1rem' },
    lg: { px: 3, py: 1.5, fontSize: '1.125rem' },
  };

  // 버튼 텍스트
  const getButtonText = () => {
    if (loading) return 'Processing...';
    if (!status) return 'Loading...';

    switch (status.status) {
      case 'RUNNING':
        return 'Stop Trading';
      case 'STOPPED':
        return 'Start Trading';
      case 'STARTING':
        return 'Starting...';
      case 'STOPPING':
        return 'Stopping...';
      default:
        return 'Unknown';
    }
  };

  // 운영 시간 표시
  const getUptime = () => {
    if (!status?.startedAt || status.status !== 'RUNNING') return null;

    const startTime = new Date(status.startedAt);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const isRunning = status?.status === 'RUNNING';
  const isStopped = status?.status === 'STOPPED';
  const isTransitioning = status?.status === 'STARTING' || status?.status === 'STOPPING';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* 상태 표시 */}
      {showStatus && status && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 상태 인디케이터 */}
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isRunning
                ? 'success.main'
                : isStopped
                ? 'error.main'
                : 'warning.main',
              animation: isTransitioning ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            {isRunning ? 'Live Trading' : 'Trading Stopped'}
          </Typography>
          {isRunning && (
            <Typography
              variant="body2"
              sx={{ color: 'text.disabled', ml: 0.5 }}
            >
              ({getUptime()})
            </Typography>
          )}
        </Box>
      )}

      {/* 시작/종료 버튼 */}
      <Button
        onClick={handleToggle}
        disabled={loading || !status || isTransitioning}
        variant="contained"
        sx={{
          ...sizeStyles[size],
          bgcolor: isRunning
            ? 'error.main'
            : isStopped
            ? 'success.main'
            : 'grey.600',
          '&:hover': {
            bgcolor: isRunning
              ? 'error.dark'
              : isStopped
              ? 'success.dark'
              : 'grey.700',
          },
          '&:disabled': {
            bgcolor: (theme) => alpha(theme.palette.grey[600], 0.5),
            color: 'grey.400',
          },
          fontWeight: 600,
          textTransform: 'none',
          minWidth: 140,
        }}
        startIcon={
          loading || isTransitioning ? (
            <CircularProgress size={16} color="inherit" />
          ) : isRunning ? (
            <PauseIcon />
          ) : (
            <PlayArrowIcon />
          )
        }
      >
        {getButtonText()}
      </Button>

      {/* 에러 표시 */}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
