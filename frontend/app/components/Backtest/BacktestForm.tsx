'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  Chip,
  Paper,
  Collapse,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { BacktestConfig } from '../../types/trading.types';
import { backtestApi } from '../../lib/api';

interface BacktestFormProps {
  onSubmit: (config: BacktestConfig) => void;
  loading: boolean;
}

interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export const BacktestForm: React.FC<BacktestFormProps> = ({
  onSubmit,
  loading,
}) => {
  // 오늘 기준 날짜 계산
  const getDefaultDates = () => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];

    // 시작일: 1개월 전
    const startDateObj = new Date(today);
    startDateObj.setMonth(startDateObj.getMonth() - 1);
    const startDate = startDateObj.toISOString().split('T')[0];

    return { startDate, endDate };
  };

  const defaultDates = getDefaultDates();

  const [config, setConfig] = useState<BacktestConfig>({
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate,
    initialBalance: 10000,
    strategies: ['Smart Money Concepts'],
  });

  const [availableSymbols, setAvailableSymbols] = useState<BinanceSymbol[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [symbolsExpanded, setSymbolsExpanded] = useState(false);
  const [randomCount, setRandomCount] = useState<number>(10);

  useEffect(() => {
    fetchSymbols();
  }, []);

  const fetchSymbols = async () => {
    try {
      setLoadingSymbols(true);
      const response = await backtestApi.getSymbols();
      setAvailableSymbols(response.data.symbols || []);
    } catch (error) {
      console.error('Failed to fetch symbols:', error);
      // 기본 심볼 목록 사용
      setAvailableSymbols([
        { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
        { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
        { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT' },
        { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT' },
      ]);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const handleSymbolToggle = (symbol: string) => {
    const currentSymbols = config.symbols;
    if (currentSymbols.includes(symbol)) {
      setConfig({
        ...config,
        symbols: currentSymbols.filter((s) => s !== symbol),
      });
    } else {
      setConfig({
        ...config,
        symbols: [...currentSymbols, symbol],
      });
    }
  };

  const handleRandomSelect = () => {
    const count = Math.min(randomCount, availableSymbols.length);
    const shuffled = [...availableSymbols].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count).map((s) => s.symbol);
    setConfig({
      ...config,
      symbols: selected,
    });
  };

  const handleSelectAll = () => {
    setConfig({
      ...config,
      symbols: availableSymbols.map((s) => s.symbol),
    });
  };

  const handleDeselectAll = () => {
    setConfig({
      ...config,
      symbols: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Backtest Configuration
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Date Range */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={config.startDate}
                onChange={(e) =>
                  setConfig({ ...config, startDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={config.endDate}
                onChange={(e) =>
                  setConfig({ ...config, endDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Initial Balance */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Initial Balance (USDT)"
                type="number"
                value={config.initialBalance}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    initialBalance: parseFloat(e.target.value),
                  })
                }
              />
            </Grid>

            {/* Strategy Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Strategies</InputLabel>
                <Select
                  multiple
                  value={config.strategies}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      strategies: e.target.value as string[],
                    })
                  }
                >
                  <MenuItem value="Smart Money Concepts">Smart Money Concepts (SMC)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Symbol Selection */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Symbol Selection ({config.symbols.length} selected)
                  </Typography>
                  <IconButton
                    onClick={() => setSymbolsExpanded(!symbolsExpanded)}
                    size="small"
                  >
                    {symbolsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                {/* Selected Symbols Display */}
                <Box mb={2} display="flex" flexWrap="wrap" gap={1}>
                  {config.symbols.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No symbols selected
                    </Typography>
                  ) : (
                    config.symbols.map((symbol) => (
                      <Chip
                        key={symbol}
                        label={symbol}
                        onDelete={() => handleSymbolToggle(symbol)}
                        size="small"
                        color="primary"
                      />
                    ))
                  )}
                </Box>

                <Collapse in={symbolsExpanded}>
                  {/* Random Selection */}
                  <Box mb={2} display="flex" gap={2} alignItems="center">
                    <TextField
                      label="Random Count"
                      type="number"
                      value={randomCount}
                      onChange={(e) => setRandomCount(parseInt(e.target.value) || 0)}
                      size="small"
                      sx={{ width: 150 }}
                      inputProps={{ min: 1, max: availableSymbols.length }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleRandomSelect}
                      size="small"
                    >
                      Random Select
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleSelectAll}
                      size="small"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleDeselectAll}
                      size="small"
                    >
                      Clear
                    </Button>
                  </Box>

                  {/* Symbol Checkboxes */}
                  {loadingSymbols ? (
                    <Typography variant="body2" color="text.secondary">
                      Loading symbols...
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        maxHeight: 300,
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      <Grid container spacing={1}>
                        {availableSymbols.map((symbolData) => (
                          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={symbolData.symbol}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={config.symbols.includes(symbolData.symbol)}
                                  onChange={() => handleSymbolToggle(symbolData.symbol)}
                                  size="small"
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {symbolData.symbol}
                                </Typography>
                              }
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Collapse>
              </Paper>
            </Grid>

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || config.symbols.length === 0}
                fullWidth
              >
                {loading ? 'Running Backtest...' : 'Run Backtest'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};
