'use client';

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
} from '@mui/icons-material';
import { DashboardMetrics } from '../../types/trading.types';

interface OverviewCardsProps {
  metrics: DashboardMetrics;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ metrics }) => {
  const cards = [
    {
      title: 'Account Balance',
      value: `$${metrics.accountBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: <AccountBalance />,
      color: '#2196f3',
    },
    {
      title: 'Equity',
      value: `$${metrics.equity.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `Total PnL: ${metrics.totalPnl >= 0 ? '+' : ''}${metrics.totalPnlPercent.toFixed(2)}%`,
      icon: <ShowChart />,
      color: metrics.totalPnl >= 0 ? '#4caf50' : '#f44336',
    },
    {
      title: 'Daily PnL',
      value: `${metrics.dailyPnl >= 0 ? '+' : ''}$${Math.abs(
        metrics.dailyPnl
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `${metrics.dailyPnl >= 0 ? '+' : ''}${metrics.dailyPnlPercent.toFixed(2)}%`,
      icon: metrics.dailyPnl >= 0 ? <TrendingUp /> : <TrendingDown />,
      color: metrics.dailyPnl >= 0 ? '#4caf50' : '#f44336',
    },
    {
      title: 'Today Stats',
      value: `${metrics.todayTrades} Trades`,
      subtitle: `Win Rate: ${metrics.winRateToday.toFixed(1)}%`,
      icon: <ShowChart />,
      color: '#ff9800',
    },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Box
                  sx={{
                    backgroundColor: card.color,
                    borderRadius: '50%',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    mr: 2,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h6" color="textSecondary">
                  {card.title}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: card.color }}>
                {card.value}
              </Typography>
              {card.subtitle && (
                <Typography variant="body2" color="textSecondary" mt={1}>
                  {card.subtitle}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
