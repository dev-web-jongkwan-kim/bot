'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  Chip,
  Box,
  Paper,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  alpha,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { dashboardApi, signalsApi, tradesApi } from '../../lib/api';
import { ClosedTrade, TradesSummary, Position } from '../../types/trading.types';

type SignalStatus = 'PENDING' | 'FILLED' | 'SKIPPED' | 'CANCELED' | 'FAILED';

interface Signal {
  id?: number;
  strategy: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  score: number;
  timestamp: string;
  status?: SignalStatus;
}

interface SystemStatus {
  status: string;
  subscribedSymbols: string[];
  totalStreams: number;
  activeStrategies: string[];
  signalStats: {
    totalLast24h: number;
  };
  uptime: number;
}

export const SignalsFeed: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [tradesSummary, setTradesSummary] = useState<TradesSummary | null>(null);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [symbolsExpanded, setSymbolsExpanded] = useState(false);
  const [positionsExpanded, setPositionsExpanded] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const { messages } = useWebSocket(apiUrl);

  // PostgreSQL decimal 타입을 number로 변환하는 헬퍼 함수
  const normalizeSignal = (signal: any): Signal => ({
    ...signal,
    entryPrice: parseFloat(signal.entryPrice),
    stopLoss: parseFloat(signal.stopLoss),
    takeProfit1: parseFloat(signal.takeProfit1),
    score: parseFloat(signal.score),
    status: signal.status || 'PENDING',
  });

  const normalizeTrade = (trade: any): ClosedTrade => ({
    ...trade,
    entryPrice: parseFloat(trade.entryPrice),
    exitPrice: parseFloat(trade.exitPrice),
    quantity: parseFloat(trade.quantity),
    realizedPnl: parseFloat(trade.realizedPnl),
    pnlPercent: parseFloat(trade.pnlPercent),
  });

  const normalizePosition = (position: any): Position => ({
    ...position,
    entryPrice: parseFloat(position.entryPrice),
    currentPrice: parseFloat(position.currentPrice),
    quantity: parseFloat(position.quantity),
    unrealizedPnl: parseFloat(position.unrealizedPnl),
    unrealizedPnlPercent: parseFloat(position.unrealizedPnlPercent),
    stopLoss: parseFloat(position.stopLoss || 0),
    takeProfit1: position.takeProfit1 ? parseFloat(position.takeProfit1) : undefined,
    takeProfit2: position.takeProfit2 ? parseFloat(position.takeProfit2) : undefined,
  });

  // WebSocket 신호 수신
  useEffect(() => {
    const signalMessages = messages.filter((msg) => msg.type === 'signal');

    if (signalMessages.length > 0) {
      const rawSignal = signalMessages[signalMessages.length - 1].data;
      const newSignal = normalizeSignal(rawSignal);
      setSignals((prev) => [newSignal, ...prev].slice(0, 20));
    }
  }, [messages]);

  // HTTP API로 초기 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [signalsRes, statusRes, closedTradesRes, summaryRes, positionsRes] = await Promise.all([
          signalsApi.getAll(),
          dashboardApi.getSystemStatus(),
          tradesApi.getClosed(),
          tradesApi.getSummary(),
          dashboardApi.getPositions(),
        ]);

        setSignals(signalsRes.data.map(normalizeSignal));
        setSystemStatus(statusRes.data);
        // 중복 제거: ID 기준으로 유니크한 트레이드만 유지
        const uniqueTrades = closedTradesRes.data.filter(
          (trade: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => t.id === trade.id)
        );
        setClosedTrades(uniqueTrades.map(normalizeTrade));
        setTradesSummary(summaryRes.data);
        setActivePositions(positionsRes.data.map(normalizePosition));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (openedAt: string, closedAt: string) => {
    const start = new Date(openedAt).getTime();
    const end = new Date(closedAt).getTime();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  // 신호 상태별 아이콘 및 색상
  const getStatusInfo = (status?: SignalStatus) => {
    switch (status) {
      case 'FILLED':
        return { icon: <CheckCircleIcon fontSize="small" />, color: 'success', label: 'Executed' };
      case 'SKIPPED':
        return { icon: <SkipNextIcon fontSize="small" />, color: 'warning', label: 'Skipped' };
      case 'CANCELED':
        return { icon: <CancelIcon fontSize="small" />, color: 'error', label: 'Canceled' };
      case 'FAILED':
        return { icon: <CancelIcon fontSize="small" />, color: 'error', label: 'Failed' };
      case 'PENDING':
      default:
        return { icon: <HourglassEmptyIcon fontSize="small" />, color: 'default', label: 'Pending' };
    }
  };

  // 신호 필터링: 실제 체결된 것 vs 나머지
  const filledSignals = signals.filter(s => s.status === 'FILLED');
  const otherSignals = signals.filter(s => s.status !== 'FILLED');

  return (
    <Box>
      {/* 시스템 상태 */}
      {systemStatus && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                System Status
              </Typography>
              <Typography variant="h6" color="success.main" fontWeight="bold">
                {systemStatus.status}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Subscribed Symbols
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {systemStatus.subscribedSymbols.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Signals (24h)
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {systemStatus.signalStats.totalLast24h}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Uptime
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatUptime(systemStatus.uptime)}
              </Typography>
            </Paper>
          </Grid>

          {/* 모니터링 심볼 - 접기/펴기 */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ cursor: 'pointer' }}
                onClick={() => setSymbolsExpanded(!symbolsExpanded)}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Monitoring Symbols ({systemStatus.subscribedSymbols.length})
                </Typography>
                <IconButton size="small">
                  {symbolsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={symbolsExpanded}>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={1.5}>
                  {systemStatus.subscribedSymbols.map((symbol) => (
                    <Chip
                      key={symbol}
                      label={symbol}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              </Collapse>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 활성 포지션 섹션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => setPositionsExpanded(!positionsExpanded)}
          >
            <Typography variant="h6" fontWeight="bold">
              Active Positions ({activePositions.length})
            </Typography>
            <IconButton size="small">
              {positionsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          <Collapse in={positionsExpanded}>
            {activePositions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No active positions
              </Typography>
            ) : (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Side</TableCell>
                      <TableCell align="right">Entry</TableCell>
                      <TableCell align="right">Current</TableCell>
                      <TableCell align="right">Size</TableCell>
                      <TableCell align="right">Unrealized PnL</TableCell>
                      <TableCell align="right">ROI</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activePositions.map((position) => (
                      <TableRow
                        key={position.id || position.symbol}
                        sx={{
                          bgcolor: (theme) =>
                            position.unrealizedPnl >= 0
                              ? alpha(theme.palette.success.main, 0.08)
                              : alpha(theme.palette.error.main, 0.08),
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {position.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {position.strategy}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={position.side}
                            size="small"
                            color={position.side === 'LONG' ? 'success' : 'error'}
                            sx={{ minWidth: 60 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontFamily="monospace">
                            ${formatPrice(position.entryPrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontFamily="monospace">
                            ${formatPrice(position.currentPrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontFamily="monospace">
                            {position.quantity.toFixed(4)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {position.leverage}x
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={position.unrealizedPnl >= 0 ? 'success.main' : 'error.main'}
                            fontFamily="monospace"
                          >
                            {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={position.unrealizedPnlPercent >= 0 ? 'success.main' : 'error.main'}
                          >
                            {position.unrealizedPnlPercent >= 0 ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* 완료된 매매 요약 */}
      {tradesSummary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Completed Trades
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center" p={1}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total Trades
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {tradesSummary.totalTrades}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today: {tradesSummary.todayTrades}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center" p={1}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Win Rate
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={tradesSummary.winRate >= 50 ? 'success.main' : 'error.main'}
                  >
                    {tradesSummary.winRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tradesSummary.wins}W / {tradesSummary.losses}L
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center" p={1}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total PnL
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={tradesSummary.totalPnl >= 0 ? 'success.main' : 'error.main'}
                  >
                    ${tradesSummary.totalPnl.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today: ${tradesSummary.todayPnl.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center" p={1}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    ROI
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={tradesSummary.roi >= 0 ? 'success.main' : 'error.main'}
                  >
                    {tradesSummary.roi.toFixed(2)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today WR: {tradesSummary.todayWinRate.toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* 완료된 매매 테이블 */}
            <Divider sx={{ my: 2 }} />
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Side</TableCell>
                    <TableCell align="right">Entry</TableCell>
                    <TableCell align="right">Exit</TableCell>
                    <TableCell align="right">PnL</TableCell>
                    <TableCell align="right">ROI</TableCell>
                    <TableCell align="right">Duration</TableCell>
                    <TableCell align="right">Closed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {closedTrades.slice(0, 10).map((trade) => (
                    <TableRow
                      key={trade.id}
                      sx={{
                        bgcolor: (theme) =>
                          trade.realizedPnl >= 0
                            ? alpha(theme.palette.success.main, 0.08)
                            : alpha(theme.palette.error.main, 0.08),
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {trade.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.side}
                          size="small"
                          color={trade.side === 'LONG' ? 'success' : 'error'}
                          sx={{ minWidth: 60 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace">
                          ${formatPrice(trade.entryPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace">
                          ${formatPrice(trade.exitPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={trade.realizedPnl >= 0 ? 'success.main' : 'error.main'}
                          fontFamily="monospace"
                        >
                          {trade.realizedPnl >= 0 ? '+' : ''}${trade.realizedPnl.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={trade.pnlPercent >= 0 ? 'success.main' : 'error.main'}
                        >
                          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                          <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption">
                            {formatDuration(trade.openedAt, trade.closedAt)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(trade.closedAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {closedTrades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" py={2}>
                          No completed trades yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 실제 체결된 주문 (Executed Orders) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6" fontWeight="bold">
              Executed Orders ({filledSignals.length})
            </Typography>
          </Box>
          {filledSignals.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No executed orders yet. Orders will appear here when signals are filled on Binance.
            </Typography>
          ) : (
            <List disablePadding>
              {filledSignals.slice(0, 10).map((signal, index) => (
                <Paper
                  key={`filled-${signal.id || index}`}
                  sx={{
                    mb: 1.5,
                    p: 2,
                    border: '2px solid',
                    borderColor: 'success.main',
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.05),
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Box
                        sx={{
                          p: 0.5,
                          borderRadius: 1,
                          bgcolor: (theme) =>
                            signal.side === 'LONG'
                              ? alpha(theme.palette.success.main, 0.2)
                              : alpha(theme.palette.error.main, 0.2),
                        }}
                      >
                        {signal.side === 'LONG' ? (
                          <TrendingUpIcon color="success" />
                        ) : (
                          <TrendingDownIcon color="error" />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {signal.symbol}
                        </Typography>
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Chip
                            label={signal.side}
                            size="small"
                            color={signal.side === 'LONG' ? 'success' : 'error'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Executed"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(signal.timestamp)}
                    </Typography>
                  </Box>

                  {/* Entry, SL, TP 정보 */}
                  <Box
                    display="flex"
                    gap={3}
                    mt={2}
                    sx={{
                      '& > div': {
                        flex: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Entry
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                        ${formatPrice(signal.entryPrice)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="error.main" display="block">
                        Stop Loss
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="error.main"
                        fontFamily="monospace"
                      >
                        ${formatPrice(signal.stopLoss)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="success.main" display="block">
                        Take Profit
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="success.main"
                        fontFamily="monospace"
                      >
                        ${formatPrice(signal.takeProfit1)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 신호 히스토리 (모든 신호) */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Signal History ({otherSignals.length})
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Signals that were not executed (skipped, canceled, or pending)
          </Typography>
          <List disablePadding>
            {otherSignals.length === 0 ? (
              <ListItem>
                <Typography variant="body2" color="text.secondary">
                  No pending signals. The system is monitoring{' '}
                  {systemStatus?.subscribedSymbols.length || 10} symbols.
                </Typography>
              </ListItem>
            ) : (
              otherSignals.slice(0, 20).map((signal, index) => {
                const statusInfo = getStatusInfo(signal.status);
                return (
                  <Paper
                    key={`signal-${signal.id || index}`}
                    sx={{
                      mb: 1.5,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: '4px solid',
                      borderLeftColor: signal.side === 'LONG' ? 'success.main' : 'error.main',
                      opacity: signal.status === 'SKIPPED' || signal.status === 'CANCELED' ? 0.7 : 1,
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                          sx={{
                            p: 0.5,
                            borderRadius: 1,
                            bgcolor: (theme) =>
                              signal.side === 'LONG'
                                ? alpha(theme.palette.success.main, 0.1)
                                : alpha(theme.palette.error.main, 0.1),
                          }}
                        >
                          {signal.side === 'LONG' ? (
                            <TrendingUpIcon color="success" />
                          ) : (
                            <TrendingDownIcon color="error" />
                          )}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {signal.symbol}
                          </Typography>
                          <Box display="flex" gap={0.5} alignItems="center">
                            <Chip
                              label={signal.side}
                              size="small"
                              color={signal.side === 'LONG' ? 'success' : 'error'}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Chip
                              icon={statusInfo.icon}
                              label={statusInfo.label}
                              size="small"
                              color={statusInfo.color as any}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(signal.timestamp)}
                      </Typography>
                    </Box>

                    {/* Entry, SL, TP 정보 */}
                    <Box
                      display="flex"
                      gap={3}
                      mt={2}
                      sx={{
                        '& > div': {
                          flex: 1,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Entry
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                          ${formatPrice(signal.entryPrice)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="error.main" display="block">
                          Stop Loss
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="error.main"
                          fontFamily="monospace"
                        >
                          ${formatPrice(signal.stopLoss)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="success.main" display="block">
                          Take Profit
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="success.main"
                          fontFamily="monospace"
                        >
                          ${formatPrice(signal.takeProfit1)}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};
