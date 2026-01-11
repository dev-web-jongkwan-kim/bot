-- Historical candles tables for backtesting

CREATE TABLE IF NOT EXISTS historical_candles_5m (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open DECIMAL(20, 8) NOT NULL,
    high DECIMAL(20, 8) NOT NULL,
    low DECIMAL(20, 8) NOT NULL,
    close DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 2) NOT NULL,
    UNIQUE(symbol, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_hist_5m_symbol_timestamp ON historical_candles_5m(symbol, timestamp);

CREATE TABLE IF NOT EXISTS historical_candles_15m (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open DECIMAL(20, 8) NOT NULL,
    high DECIMAL(20, 8) NOT NULL,
    low DECIMAL(20, 8) NOT NULL,
    close DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 2) NOT NULL,
    UNIQUE(symbol, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_hist_15m_symbol_timestamp ON historical_candles_15m(symbol, timestamp);
