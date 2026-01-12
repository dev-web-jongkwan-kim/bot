'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
  alpha,
  CircularProgress,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { OverviewCards } from './components/Dashboard/OverviewCards';
import { EquityCurve } from './components/Dashboard/EquityCurve';
import { ActivePositions } from './components/Dashboard/ActivePositions';
import { ClosedTrades } from './components/Dashboard/ClosedTrades';
import { BacktestForm } from './components/Backtest/BacktestForm';
import { BacktestResults } from './components/Backtest/BacktestResults';
import { SignalsFeed } from './components/LiveTrading/SignalsFeed';
import { Statistics } from './components/Dashboard/Statistics';
import TradingControlButton from './components/Dashboard/TradingControlButton';
import { useThemeMode } from './components/ThemeProvider';
import {
  DashboardMetrics,
  BacktestConfig,
  BacktestResults as BacktestResultsType,
  Position,
  ClosedTrade,
  TradesSummary,
} from './types/trading.types';
import { dashboardApi, backtestApi, tradesApi } from './lib/api';

// SSR-safe wrapper for useThemeMode
function useThemeModeSafe() {
  try {
    return useThemeMode();
  } catch {
    return { mode: 'dark' as const, toggleTheme: () => {} };
  }
}

export default function Home() {
  const { mode, toggleTheme } = useThemeModeSafe();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [tab, setTab] = useState(0);
  const [backtestResults, setBacktestResults] = useState<BacktestResultsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [equityData, setEquityData] = useState<Array<{ timestamp: string; equity: number }>>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [tradesSummary, setTradesSummary] = useState<TradesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // PostgreSQL decimal 타입을 number로 변환하는 헬퍼 함수
  const normalizePosition = (position: any): Position => ({
    ...position,
    entryPrice: parseFloat(position.entryPrice),
    currentPrice: parseFloat(position.currentPrice),
    quantity: parseFloat(position.quantity),
    unrealizedPnl: parseFloat(position.unrealizedPnl),
    unrealizedPnlPercent: parseFloat(position.unrealizedPnlPercent),
    stopLoss: parseFloat(position.stopLoss),
    takeProfit1: position.takeProfit1 ? parseFloat(position.takeProfit1) : undefined,
    takeProfit2: position.takeProfit2 ? parseFloat(position.takeProfit2) : undefined,
  });

  const normalizeMetrics = (metrics: any): DashboardMetrics => ({
    ...metrics,
    accountBalance: parseFloat(metrics.accountBalance),
    equity: parseFloat(metrics.equity),
    dailyPnl: parseFloat(metrics.dailyPnl),
    dailyPnlPercent: parseFloat(metrics.dailyPnlPercent),
    totalPnl: parseFloat(metrics.totalPnl),
    totalPnlPercent: parseFloat(metrics.totalPnlPercent),
    winRateToday: parseFloat(metrics.winRateToday),
  });

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, positionsRes, equityCurveRes, closedTradesRes, summaryRes] =
        await Promise.all([
          dashboardApi.getMetrics(),
          dashboardApi.getPositions(),
          dashboardApi.getEquityCurve(),
          tradesApi.getClosed(),
          tradesApi.getSummary(),
        ]);

      setMetrics(normalizeMetrics(metricsRes.data));
      setPositions(positionsRes.data.map(normalizePosition));
      setEquityData(equityCurveRes.data);
      // 중복 제거: ID 기준으로 유니크한 트레이드만 유지
      const uniqueTrades = closedTradesRes.data.filter(
        (trade: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => t.id === trade.id)
      );
      setClosedTrades(uniqueTrades);
      setTradesSummary(summaryRes.data);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // 10초마다 데이터 갱신 (실시간 모니터링)
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBacktestSubmit = async (config: BacktestConfig) => {
    setLoading(true);
    setError(null);
    try {
      const response = await backtestApi.run(config);
      setBacktestResults(response.data);
      setSuccess('Backtest completed successfully!');
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(err.message || 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (positionId: number) => {
    try {
      await dashboardApi.closePosition(positionId);
      setSuccess('Position closed successfully');

      // 데이터 새로고침
      await fetchDashboardData();
    } catch (err: any) {
      console.error('Error closing position:', err);
      setError(err.message || 'Failed to close position');
    }
  };

  const mockMetrics: DashboardMetrics = metrics || {
    accountBalance: 100,
    equity: 100,
    dailyPnl: 0,
    dailyPnlPercent: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    openPositions: positions.length,
    todayTrades: 0,
    winRateToday: 0,
  };

  // SSR 중에는 로딩 표시
  if (!mounted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShowChartIcon color="primary" />
            </Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              color="text.primary"
              sx={{ letterSpacing: '-0.02em' }}
            >
              Trading Bot
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Trading Control Button */}
          <TradingControlButton size="md" showStatus={true} />

          <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ color: 'text.primary' }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => setError(null)} severity="error" variant="filled">
            {error}
          </Alert>
        </Snackbar>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => setSuccess(null)} severity="success" variant="filled">
            {success}
          </Alert>
        </Snackbar>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
              },
            }}
          >
            <Tab label="Dashboard" />
            <Tab label="Statistics" />
            <Tab label="Backtest" />
            <Tab label="Live Trading" />
          </Tabs>
        </Box>

        {tab === 0 && (
          <Box>
            <OverviewCards metrics={mockMetrics} />
            <Box mt={3}>
              <EquityCurve data={equityData} />
            </Box>
            <Box mt={3}>
              <ActivePositions positions={positions} onClose={handleClosePosition} />
            </Box>
            <Box mt={3}>
              <ClosedTrades trades={closedTrades} summary={tradesSummary} />
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Statistics />
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <BacktestForm onSubmit={handleBacktestSubmit} loading={loading} />
            {backtestResults && (
              <Box mt={3}>
                <BacktestResults results={backtestResults} />
              </Box>
            )}
          </Box>
        )}

        {tab === 3 && (
          <Box>
            {/* Trading Control Section */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                Live Trading Control
              </Typography>
              <TradingControlButton size="lg" showStatus={true} />
            </Box>
            <SignalsFeed />
          </Box>
        )}
      </Container>
    </Box>
  );
}
