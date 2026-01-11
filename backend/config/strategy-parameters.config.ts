/**
 * Tier-based Strategy Parameters Configuration
 *
 * Different tiers have different risk profiles:
 * - Tier 1: Conservative (BTC, ETH, BNB, etc.) - Most stable, tighter stops
 * - Tier 2: Balanced (Major altcoins) - Standard parameters
 * - Tier 3: Moderate Risk (Mid-caps) - Slightly wider ranges
 * - Tier 4: Higher Risk (Small-caps, volatile) - Wider stops, higher volatility tolerance
 */

export interface TierStrategyParams {
  tier: 1 | 2 | 3 | 4;

  // Bollinger Bands
  bbPeriod: number;
  bbStdDev: number;
  bbStopLossMargin: number; // Multiplier beyond BB for stop loss (e.g., 1.005 = 0.5% beyond)

  // ATR (Average True Range)
  atrPeriod: number;
  atrMultiplier: number; // For stop loss calculation

  // RSI
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;

  // ADX (Market regime detection)
  adxPeriod: number;
  adxRangingThreshold: number; // ADX < threshold = ranging market

  // EMA
  emaFast: number;
  emaMedium: number;
  emaSlow: number;

  // MACD
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  macdHistogramThreshold: number;

  // Keltner Channels
  keltnerPeriod: number;
  keltnerMultiplier: number;

  // Stochastic RSI
  stochRsiPeriod: number;
  stochRsiOversold: number;
  stochRsiOverbought: number;

  // Risk Management
  stopLossMultiplier: number; // Multiplier for SL calculation
  takeProfitMultiplier: number; // Multiplier for TP calculation
  minRiskReward: number; // Minimum Risk/Reward ratio

  // Position Sizing
  maxPositionRisk: number; // % of capital to risk per trade

  // Volume
  minVolumeMultiplier: number; // Minimum volume as multiplier of average
}

// Tier 1: Conservative Parameters (Ultra Large-cap)
// BTC, ETH, BNB, SOL, XRP, ADA, DOGE, DOT, MATIC, AVAX
const TIER1_PARAMS: TierStrategyParams = {
  tier: 1,

  // Bollinger Bands - Tighter bands for stable assets
  bbPeriod: 20,
  bbStdDev: 2.0, // Standard 2.0
  bbStopLossMargin: 1.003, // 0.3% beyond BB

  // ATR - Conservative stop loss
  atrPeriod: 14,
  atrMultiplier: 1.5, // Conservative

  // RSI - Standard thresholds
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,

  // ADX - Stricter regime detection
  adxPeriod: 14,
  adxRangingThreshold: 25, // More conservative

  // EMA - Standard periods
  emaFast: 9,
  emaMedium: 21,
  emaSlow: 50,

  // MACD - Standard settings
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  macdHistogramThreshold: 0.0001, // Tight threshold

  // Keltner Channels
  keltnerPeriod: 20,
  keltnerMultiplier: 2.0,

  // Stochastic RSI
  stochRsiPeriod: 14,
  stochRsiOversold: 20,
  stochRsiOverbought: 80,

  // Risk Management - Conservative
  stopLossMultiplier: 1.5,
  takeProfitMultiplier: 2.5,
  minRiskReward: 1.0, // Relaxed from 1.5

  // Position Sizing
  maxPositionRisk: 0.01, // 1% risk per trade

  // Volume
  minVolumeMultiplier: 1.2,
};

// Tier 2: Balanced Parameters (Large-cap)
// LINK, LTC, ATOM, UNI, ETC, FIL, APT, ARB, OP, NEAR, etc.
const TIER2_PARAMS: TierStrategyParams = {
  tier: 2,

  // Bollinger Bands - Wider bands for more volatility
  bbPeriod: 20,
  bbStdDev: 2.3, // Wider bands
  bbStopLossMargin: 1.005, // 0.5% beyond BB

  // ATR - Moderate stop loss
  atrPeriod: 14,
  atrMultiplier: 1.8,

  // RSI - Relaxed thresholds
  rsiPeriod: 14,
  rsiOversold: 35, // More relaxed
  rsiOverbought: 65, // More relaxed

  // ADX - Moderate regime detection
  adxPeriod: 14,
  adxRangingThreshold: 28,

  // EMA - Standard periods
  emaFast: 9,
  emaMedium: 21,
  emaSlow: 50,

  // MACD - Relaxed settings
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  macdHistogramThreshold: 0.0003, // More relaxed

  // Keltner Channels
  keltnerPeriod: 20,
  keltnerMultiplier: 2.3,

  // Stochastic RSI
  stochRsiPeriod: 14,
  stochRsiOversold: 25,
  stochRsiOverbought: 75,

  // Risk Management - Balanced
  stopLossMultiplier: 1.8,
  takeProfitMultiplier: 2.8,
  minRiskReward: 1.0,

  // Position Sizing
  maxPositionRisk: 0.01, // 1% risk per trade

  // Volume
  minVolumeMultiplier: 1.3,
};

// Tier 3: Moderate Risk Parameters (Mid-cap)
// AAVE, ALGO, AXS, SAND, MANA, GALA, APE, GMX, ROSE, CHZ, etc.
const TIER3_PARAMS: TierStrategyParams = {
  tier: 3,

  // Bollinger Bands - Wider bands
  bbPeriod: 20,
  bbStdDev: 2.5, // Wider for higher volatility
  bbStopLossMargin: 1.007, // 0.7% beyond BB

  // ATR - Wider stop loss
  atrPeriod: 14,
  atrMultiplier: 2.0,

  // RSI - More relaxed thresholds
  rsiPeriod: 14,
  rsiOversold: 40,
  rsiOverbought: 60,

  // ADX - More relaxed regime detection
  adxPeriod: 14,
  adxRangingThreshold: 30,

  // EMA - Standard periods
  emaFast: 9,
  emaMedium: 21,
  emaSlow: 50,

  // MACD - More relaxed settings
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  macdHistogramThreshold: 0.0005,

  // Keltner Channels
  keltnerPeriod: 20,
  keltnerMultiplier: 2.5,

  // Stochastic RSI
  stochRsiPeriod: 14,
  stochRsiOversold: 30,
  stochRsiOverbought: 70,

  // Risk Management - Moderate
  stopLossMultiplier: 2.0,
  takeProfitMultiplier: 3.0,
  minRiskReward: 0.9,

  // Position Sizing
  maxPositionRisk: 0.015, // 1.5% risk per trade

  // Volume
  minVolumeMultiplier: 1.4,
};

// Tier 4: Higher Risk Parameters (Small-cap, volatile)
// ORDI, PYTH, ACE, NFP, AI, XAI, MANTA, ALT, DYM, PIXEL, etc.
const TIER4_PARAMS: TierStrategyParams = {
  tier: 4,

  // Bollinger Bands - Widest bands
  bbPeriod: 20,
  bbStdDev: 3.0, // Very wide for high volatility
  bbStopLossMargin: 1.010, // 1.0% beyond BB

  // ATR - Widest stop loss
  atrPeriod: 14,
  atrMultiplier: 2.5,

  // RSI - Most relaxed thresholds
  rsiPeriod: 14,
  rsiOversold: 45,
  rsiOverbought: 55,

  // ADX - Most relaxed regime detection
  adxPeriod: 14,
  adxRangingThreshold: 35,

  // EMA - Standard periods
  emaFast: 9,
  emaMedium: 21,
  emaSlow: 50,

  // MACD - Most relaxed settings
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  macdHistogramThreshold: 0.001, // Very relaxed

  // Keltner Channels
  keltnerPeriod: 20,
  keltnerMultiplier: 3.0,

  // Stochastic RSI
  stochRsiPeriod: 14,
  stochRsiOversold: 35,
  stochRsiOverbought: 65,

  // Risk Management - Higher risk
  stopLossMultiplier: 2.5,
  takeProfitMultiplier: 3.5,
  minRiskReward: 0.8,

  // Position Sizing
  maxPositionRisk: 0.02, // 2% risk per trade

  // Volume
  minVolumeMultiplier: 1.5,
};

// Export tier parameters mapping
export const TIER_STRATEGY_PARAMS: Record<1 | 2 | 3 | 4, TierStrategyParams> = {
  1: TIER1_PARAMS,
  2: TIER2_PARAMS,
  3: TIER3_PARAMS,
  4: TIER4_PARAMS,
};

// Helper function to get parameters for a specific tier
export function getParametersForTier(tier: 1 | 2 | 3 | 4): TierStrategyParams {
  return TIER_STRATEGY_PARAMS[tier];
}

// Helper function to get tier from symbol (requires symbols.config.ts)
export function getTierForSymbol(symbol: string): 1 | 2 | 3 | 4 {
  const { getSymbolConfig } = require('./symbols.config');
  const config = getSymbolConfig(symbol);
  return config?.tier || 3; // Default to Tier 3 if not found
}

// Helper function to get parameters for a specific symbol
export function getParametersForSymbol(symbol: string): TierStrategyParams {
  const tier = getTierForSymbol(symbol);
  return getParametersForTier(tier);
}

// Default export
export default {
  TIER_STRATEGY_PARAMS,
  getParametersForTier,
  getTierForSymbol,
  getParametersForSymbol,
};
