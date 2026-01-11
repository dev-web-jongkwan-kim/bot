'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { ClosedTrade, TradesSummary } from '../../types/trading.types';

interface ClosedTradesProps {
  trades: ClosedTrade[];
  summary: TradesSummary | null;
}

export const ClosedTrades: React.FC<ClosedTradesProps> = ({ trades, summary }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Total Trades
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {summary.totalTrades}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Today: {summary.todayTrades}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
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
              <Typography variant="caption" color="textSecondary">
                {summary.wins}W / {summary.losses}L
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
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
              <Typography variant="caption" color="textSecondary">
                Today: ${summary.todayPnl.toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                ROI
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={summary.roi >= 0 ? 'success.main' : 'error.main'}
              >
                {summary.roi.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Today WR: {summary.todayWinRate.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Trades Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Closed Trades ({trades.length})
          </Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell>Leverage</TableCell>
                  <TableCell>Entry</TableCell>
                  <TableCell>Exit</TableCell>
                  <TableCell>PnL</TableCell>
                  <TableCell>Closed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {trade.symbol}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {trade.strategy}
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
                    <TableCell>${trade.entryPrice.toFixed(4)}</TableCell>
                    <TableCell>${trade.exitPrice.toFixed(4)}</TableCell>
                    <TableCell>
                      <Typography
                        color={trade.realizedPnl >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        ${trade.realizedPnl.toFixed(2)}
                        <br />
                        <Typography variant="caption">
                          ({trade.pnlPercent >= 0 ? '+' : ''}
                          {trade.pnlPercent.toFixed(2)}%)
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(trade.closedAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {trades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No closed trades yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
