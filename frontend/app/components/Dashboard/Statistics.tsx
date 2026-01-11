'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { tradesApi, dashboardApi } from '../../lib/api';
import { DailyStats, ClosedTrade, TradesSummary } from '../../types/trading.types';

interface DayRowProps {
  day: DailyStats;
  trades: ClosedTrade[];
  isLoading: boolean;
  onExpand: () => void;
  isExpanded: boolean;
}

const DayRow: React.FC<DayRowProps> = ({ day, trades, isLoading, onExpand, isExpanded }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
        onClick={onExpand}
      >
        <TableCell>
          <IconButton size="small">
            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography fontWeight="bold">{formatDate(day.date)}</Typography>
        </TableCell>
        <TableCell align="center">{day.trades}</TableCell>
        <TableCell align="center">
          <Typography color="success.main">{day.wins}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography color="error.main">{day.losses}</Typography>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={`${day.winRate.toFixed(1)}%`}
            size="small"
            color={day.winRate >= 50 ? 'success' : 'error'}
          />
        </TableCell>
        <TableCell align="right">
          <Typography
            fontWeight="bold"
            color={day.pnl >= 0 ? 'success.main' : 'error.main'}
          >
            ${day.pnl.toFixed(2)}
          </Typography>
        </TableCell>
        <TableCell align="right">${day.avgPnl.toFixed(2)}</TableCell>
        <TableCell align="right">
          <Typography color="success.main">${day.maxWin.toFixed(2)}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography color="error.main">${day.maxLoss.toFixed(2)}</Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom>
                {formatDate(day.date)} Trades
              </Typography>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : trades.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Side</TableCell>
                      <TableCell>Leverage</TableCell>
                      <TableCell align="right">Entry</TableCell>
                      <TableCell align="right">Exit</TableCell>
                      <TableCell align="right">PnL</TableCell>
                      <TableCell align="right">PnL %</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
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
                          />
                        </TableCell>
                        <TableCell>{trade.leverage}x</TableCell>
                        <TableCell align="right">${trade.entryPrice.toFixed(4)}</TableCell>
                        <TableCell align="right">${trade.exitPrice.toFixed(4)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            color={trade.realizedPnl >= 0 ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            ${trade.realizedPnl.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={trade.pnlPercent >= 0 ? 'success.main' : 'error.main'}
                          >
                            {trade.pnlPercent >= 0 ? '+' : ''}
                            {trade.pnlPercent.toFixed(2)}%
                          </Typography>
                        </TableCell>
                        <TableCell>{formatTime(trade.closedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="textSecondary" sx={{ p: 2 }}>
                  No trades for this day
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const Statistics: React.FC = () => {
  const [summary, setSummary] = useState<TradesSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [dayTrades, setDayTrades] = useState<{ [key: string]: ClosedTrade[] }>({});
  const [loadingTrades, setLoadingTrades] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [summaryRes, dailyRes, balanceRes] = await Promise.all([
        tradesApi.getSummary(),
        tradesApi.getDailyStats(),
        dashboardApi.getAccountBalance(),
      ]);
      setSummary(summaryRes.data);
      setDailyStats(dailyRes.data);
      setAccountBalance(balanceRes.data.totalWalletBalance || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandDay = async (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
      return;
    }

    setExpandedDate(date);

    // 이미 로드된 데이터가 있으면 다시 로드하지 않음
    if (dayTrades[date]) {
      return;
    }

    setLoadingTrades(date);
    try {
      const res = await tradesApi.getByDate(date);
      setDayTrades((prev) => ({ ...prev, [date]: res.data }));
    } catch (err: any) {
      console.error('Failed to fetch trades for date:', date, err);
    } finally {
      setLoadingTrades(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Account Balance
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                ${accountBalance.toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Total PnL
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={summary.totalPnl >= 0 ? 'success.main' : 'error.main'}
              >
                ${summary.totalPnl.toFixed(2)}
              </Typography>
              <Typography
                variant="caption"
                color={summary.roi >= 0 ? 'success.main' : 'error.main'}
              >
                ROI: {summary.roi.toFixed(2)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Total Trades
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {summary.totalTrades}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {summary.wins}W / {summary.losses}L
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Win Rate
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={summary.winRate >= 50 ? 'success.main' : 'error.main'}
              >
                {summary.winRate.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Today PnL
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={summary.todayPnl >= 0 ? 'success.main' : 'error.main'}
              >
                ${summary.todayPnl.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {summary.todayTrades} trades
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Today Win Rate
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={summary.todayWinRate >= 50 ? 'success.main' : 'error.main'}
              >
                {summary.todayWinRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {summary.todayWins}W / {summary.todayLosses}L
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Daily Stats Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Daily Performance (Last 30 Days)
        </Typography>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell>Date</TableCell>
                <TableCell align="center">Trades</TableCell>
                <TableCell align="center">Wins</TableCell>
                <TableCell align="center">Losses</TableCell>
                <TableCell align="center">Win Rate</TableCell>
                <TableCell align="right">PnL</TableCell>
                <TableCell align="right">Avg PnL</TableCell>
                <TableCell align="right">Max Win</TableCell>
                <TableCell align="right">Max Loss</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyStats.length > 0 ? (
                dailyStats.map((day) => (
                  <DayRow
                    key={day.date}
                    day={day}
                    trades={dayTrades[day.date] || []}
                    isLoading={loadingTrades === day.date}
                    onExpand={() => handleExpandDay(day.date)}
                    isExpanded={expandedDate === day.date}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No trading history found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
