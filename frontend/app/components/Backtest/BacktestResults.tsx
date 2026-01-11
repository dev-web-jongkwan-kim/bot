'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { BacktestResults as BacktestResultsType } from '../../types/trading.types';
import { EquityCurve } from '../Dashboard/EquityCurve';

interface BacktestResultsProps {
  results: BacktestResultsType;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({ results }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const equityData = results.equityCurve.map(eq => ({
    timestamp: eq.timestamp,
    equity: eq.equity,
  }));

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const trades = results.detailedTrades || [];
  const paginatedTrades = trades.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">ROI</Typography>
              <Typography variant="h4" color={results.roi >= 0 ? 'success.main' : 'error.main'}>
                {results.roi >= 0 ? '+' : ''}{results.roi.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Trades</Typography>
              <Typography variant="h4">{results.totalTrades}</Typography>
              <Typography variant="body2" color="text.secondary">
                W: {results.wins} / L: {results.losses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Win Rate</Typography>
              <Typography variant="h4">{results.winRate.toFixed(2)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total PnL</Typography>
              <Typography variant="h4" color={results.totalPnl >= 0 ? 'success.main' : 'error.main'}>
                ${results.totalPnl >= 0 ? '+' : ''}{results.totalPnl.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Initial: ${results.initialBalance.toFixed(2)} → Final: ${results.finalBalance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Equity Curve */}
      <EquityCurve data={equityData} />

      {/* Trade History */}
      {trades.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trade History ({trades.length} trades)
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell>#</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Strategy</TableCell>
                    <TableCell>Side</TableCell>
                    <TableCell>Entry Time</TableCell>
                    <TableCell>Exit Time</TableCell>
                    <TableCell>Hold Time</TableCell>
                    <TableCell align="right">Leverage</TableCell>
                    <TableCell align="right">Position Size</TableCell>
                    <TableCell align="right">Entry Price</TableCell>
                    <TableCell align="right">Exit Price</TableCell>
                    <TableCell align="right">Price Change</TableCell>
                    <TableCell align="right">PnL</TableCell>
                    <TableCell align="right">PnL %</TableCell>
                    <TableCell>Exit Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTrades.map((trade, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: trade.pnl >= 0 ? 'success.light' : 'error.light',
                        opacity: 0.9,
                        '&:hover': {
                          opacity: 1,
                        },
                      }}
                    >
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {trade.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.strategy}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.side}
                          size="small"
                          color={trade.side === 'LONG' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(trade.entryTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(trade.exitTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {trade.holdingTime}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {trade.leverage}x
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${trade.positionSizeUSDT.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${trade.entryPrice.toFixed(6)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${trade.exitPrice.toFixed(6)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={trade.priceChangePercent >= 0 ? 'success.main' : 'error.main'}
                        >
                          {trade.priceChangePercent >= 0 ? '+' : ''}
                          {trade.priceChangePercent.toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={trade.pnl >= 0 ? 'success.main' : 'error.main'}
                        >
                          ${trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
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
                      <TableCell>
                        <Chip
                          label={trade.exitReason}
                          size="small"
                          color={trade.exitReason === 'TP' ? 'success' : trade.exitReason === 'SL' ? 'error' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={trades.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </CardContent>
        </Card>
      )}

      {trades.length === 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              No trades executed during this backtest period.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
