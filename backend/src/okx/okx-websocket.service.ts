import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';
import { CandleAggregatorService, CandleData } from '../websocket/candle-aggregator.service';

interface StreamConfig {
  symbol: string;
  timeframe: string;
  instId: string;
}

@Injectable()
export class OkxWebSocketService implements OnModuleDestroy {
  private readonly logger = new Logger(OkxWebSocketService.name);
  private readonly RECONNECT_DELAY = 1000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  // OKX WebSocket URL
  private readonly WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private isShuttingDown = false;

  private streams: StreamConfig[] = [];
  private currentCandles: Map<string, CandleData> = new Map();
  private currentMarkPrices: Map<string, any> = new Map();

  constructor(private candleAggregator: CandleAggregatorService) {}

  async onModuleDestroy() {
    this.isShuttingDown = true;
    await this.disconnectAll();
  }

  /**
   * Convert Binance symbol to OKX instId
   * BTCUSDT -> BTC-USDT-SWAP
   */
  private toOkxInstId(symbol: string): string {
    const base = symbol.replace('USDT', '');
    return `${base}-USDT-SWAP`;
  }

  /**
   * Convert OKX instId to Binance symbol
   * BTC-USDT-SWAP -> BTCUSDT
   */
  private fromOkxInstId(instId: string): string {
    const parts = instId.split('-');
    return `${parts[0]}USDT`;
  }

  /**
   * Subscribe to all symbols
   */
  async subscribeAll(symbols: string[], timeframes: string[] = ['5m', '15m']) {
    this.logger.log(
      `Subscribing to ${symbols.length} symbols:\n` +
      `  - Timeframes: ${timeframes.join(', ')}\n` +
      `  - Total streams: ${symbols.length * timeframes.length}`
    );

    // Build stream configs
    this.streams = [];
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const instId = this.toOkxInstId(symbol);
        this.streams.push({ symbol, timeframe, instId });
      }
    }

    // Connect to WebSocket
    await this.connect();
  }

  /**
   * Connect to OKX WebSocket
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log('Connecting to OKX WebSocket...');

      this.ws = new WebSocket(this.WS_URL);

      this.ws.on('open', () => {
        this.logger.log('OKX WebSocket connected');
        this.reconnectAttempts = 0;

        // Subscribe to channels
        this.subscribeToChannels();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error('Error parsing message:', error);
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
        if (!this.isShuttingDown) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('close', () => {
        this.logger.warn('WebSocket closed');
        if (!this.isShuttingDown) {
          this.scheduleReconnect();
        }
      });

      // Ping every 15 seconds to keep connection alive
      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, 15000);
    });
  }

  /**
   * Subscribe to OKX channels
   */
  private subscribeToChannels() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Group by unique instIds
    const instIds = [...new Set(this.streams.map(s => s.instId))];

    // Subscribe to candles for each timeframe
    const timeframes = ['5m', '15m'];

    for (const timeframe of timeframes) {
      // OKX uses "candle5m", "candle15m" format
      const channel = `candle${timeframe}`;

      const subscribeMsg = {
        op: 'subscribe',
        args: instIds.map(instId => ({
          channel,
          instId,
        })),
      };

      this.logger.log(`Subscribing to ${channel} for ${instIds.length} instruments`);
      this.ws.send(JSON.stringify(subscribeMsg));
    }

    // Subscribe to mark price
    const markPriceMsg = {
      op: 'subscribe',
      args: instIds.map(instId => ({
        channel: 'mark-price',
        instId,
      })),
    };

    this.logger.log(`Subscribing to mark-price for ${instIds.length} instruments`);
    this.ws.send(JSON.stringify(markPriceMsg));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any) {
    // Pong response
    if (message === 'pong') {
      return;
    }

    // Subscription confirmation
    if (message.event === 'subscribe') {
      this.logger.debug(`Subscribed to ${message.arg?.channel}`);
      return;
    }

    // Error
    if (message.event === 'error') {
      this.logger.error(`OKX WS error: ${message.msg}`);
      return;
    }

    // Data message
    if (message.data && message.arg) {
      const { channel, instId } = message.arg;
      const symbol = this.fromOkxInstId(instId);

      // Mark price data
      if (channel === 'mark-price') {
        const markPriceData = message.data[0];
        this.currentMarkPrices.set(symbol, {
          markPrice: parseFloat(markPriceData.markPx),
          timestamp: new Date(parseInt(markPriceData.ts)),
        });
        return;
      }

      // Candle data
      if (channel.startsWith('candle')) {
        const timeframe = channel.replace('candle', '');  // candle5m -> 5m

        for (const candleData of message.data) {
          // OKX candle format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
          const [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm] = candleData;

          const candle: CandleData = {
            timestamp: new Date(parseInt(ts)),
            open: parseFloat(o),
            high: parseFloat(h),
            low: parseFloat(l),
            close: parseFloat(c),
            volume: parseFloat(vol),
          };

          const key = `${symbol}_${timeframe}`;

          // Candle is complete (confirm = "1")
          if (confirm === '1') {
            const changePercent = ((candle.close - candle.open) / candle.open * 100).toFixed(2);
            const direction = candle.close >= candle.open ? '📈' : '📉';

            this.logger.log(
              `[FLOW-1] OKX WebSocket → Candle | ${symbol} ${timeframe} ` +
              `${direction} ${changePercent}% | O:${candle.open.toFixed(2)} C:${candle.close.toFixed(2)} ` +
              `V:${(candle.volume/1000).toFixed(0)}K`
            );

            // Notify candle aggregator
            this.candleAggregator.onCandleClose(symbol, timeframe, candle);
          } else {
            // Update current candle
            this.currentCandles.set(key, candle);
          }
        }
      }
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.connect().catch(error => {
          this.logger.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Disconnect all
   */
  async disconnectAll(): Promise<void> {
    this.logger.log('Disconnecting OKX WebSocket...');

    if (this.ws) {
      // Unsubscribe all
      if (this.ws.readyState === WebSocket.OPEN) {
        const instIds = [...new Set(this.streams.map(s => s.instId))];

        for (const timeframe of ['5m', '15m']) {
          const unsubMsg = {
            op: 'unsubscribe',
            args: instIds.map(instId => ({
              channel: `candle${timeframe}`,
              instId,
            })),
          };
          this.ws.send(JSON.stringify(unsubMsg));
        }
      }

      this.ws.close();
      this.ws = null;
    }

    this.streams = [];
    this.currentCandles.clear();
    this.currentMarkPrices.clear();

    this.logger.log('OKX WebSocket disconnected');
  }

  /**
   * Resubscribe to new symbols
   */
  async resubscribe(newSymbols: string[], timeframes: string[] = ['5m', '15m']) {
    this.logger.log('Resubscribing...');
    await this.disconnectAll();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.subscribeAll(newSymbols, timeframes);
    this.logger.log('Resubscription complete');
  }

  /**
   * Get current candle
   */
  getCurrentCandle(symbol: string, timeframe: string): CandleData | null {
    const key = `${symbol}_${timeframe}`;
    return this.currentCandles.get(key) || null;
  }

  /**
   * Get current mark price
   */
  getCurrentMarkPrice(symbol: string): any | null {
    return this.currentMarkPrices.get(symbol) || null;
  }

  /**
   * Get all mark prices
   */
  getAllMarkPrices(): Map<string, any> {
    return this.currentMarkPrices;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection count (always 1 for OKX)
   */
  getConnectionCount(): number {
    return this.isConnected() ? 1 : 0;
  }
}
