import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';
import { CandleAggregatorService, CandleData } from './candle-aggregator.service';

interface StreamConfig {
  symbol: string;
  timeframe: string;
  streamName: string;
}

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketService.name);
  private readonly MAX_STREAMS_PER_CONNECTION = 1024; // Binance 공식 제한
  private readonly SAFE_STREAMS_PER_CONNECTION = 100; // 안전 마진 (170 symbols × 3 = 510 streams → 6 connections)
  private readonly RECONNECT_DELAY = 1000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  
  private connections: Map<number, WebSocket> = new Map();
  private streamMap: Map<string, number> = new Map(); // streamName -> connectionId
  private reconnectAttempts: Map<number, number> = new Map();
  private isShuttingDown = false;
  
  private streams: StreamConfig[] = [];
  private currentCandles: Map<string, any> = new Map(); // streamName -> current candle
  private currentMarkPrices: Map<string, any> = new Map(); // symbol -> mark price data

  constructor(private candleAggregator: CandleAggregatorService) {}

  async onModuleInit() {
    // 모듈 초기화 시 자동 시작하지 않음 (수동 시작)
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    for (const [connId, ws] of this.connections.entries()) {
      ws.close();
    }
    this.connections.clear();
  }

  async subscribeAll(symbols: string[], timeframes: string[] = ['5m', '15m']) {
    const klineStreams = symbols.length * timeframes.length;
    const markPriceStreams = symbols.length;
    const totalStreams = klineStreams + markPriceStreams;

    this.logger.log(
      `Subscribing to ${symbols.length} symbols:\n` +
      `  - Kline streams: ${klineStreams} (${timeframes.join(', ')})\n` +
      `  - MarkPrice streams: ${markPriceStreams}\n` +
      `  - Total: ${totalStreams} streams`
    );

    // 스트림 구성
    this.streams = [];
    for (const symbol of symbols) {
      // Kline 스트림
      for (const timeframe of timeframes) {
        const streamName = `${symbol.toLowerCase()}@kline_${timeframe}`;
        this.streams.push({ symbol, timeframe, streamName });
      }

      // MarkPrice 스트림 (실시간 가격 모니터링, 1초마다 업데이트)
      const markPriceStream = `${symbol.toLowerCase()}@markPrice`;
      this.streams.push({ symbol, timeframe: 'markPrice', streamName: markPriceStream });
    }

    // 연결 분산 (안정성을 위해 여러 연결 사용)
    await this.distributeStreams();
  }

  private async distributeStreams() {
    const totalStreams = this.streams.length;
    const streamsPerConnection = this.SAFE_STREAMS_PER_CONNECTION;

    const numConnections = Math.ceil(totalStreams / streamsPerConnection);
    this.logger.log('');
    this.logger.log('='.repeat(80));
    this.logger.log('WEBSOCKET CONNECTION DISTRIBUTION');
    this.logger.log('='.repeat(80));
    this.logger.log(`Total streams: ${totalStreams}`);
    this.logger.log(`Streams per connection: ${streamsPerConnection} (safe limit)`);
    this.logger.log(`Number of connections: ${numConnections}`);
    this.logger.log(`Binance limit: ${this.MAX_STREAMS_PER_CONNECTION} streams/connection`);
    this.logger.log('='.repeat(80));

    for (let i = 0; i < numConnections; i++) {
      const startIdx = i * streamsPerConnection;
      const endIdx = Math.min(startIdx + streamsPerConnection, totalStreams);
      const connectionStreams = this.streams.slice(startIdx, endIdx);
      
      if (connectionStreams.length > 0) {
        await this.createConnection(i, connectionStreams);
        // 연결 간 딜레이 (rate limit 방지)
        await this.delay(100);
      }
    }
  }

  private async createConnection(connId: number, streams: StreamConfig[]) {
    const streamNames = streams.map(s => s.streamName);
    const wsUrl = `wss://fstream.binance.com/stream?streams=${streamNames.join('/')}`;

    this.logger.log(`Connection ${connId}: Creating connection with ${streams.length} streams`);

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        this.logger.log(`Connection ${connId}: Connected`);
        this.connections.set(connId, ws);
        this.reconnectAttempts.set(connId, 0);
        
        // 스트림 매핑 저장
        for (const stream of streams) {
          this.streamMap.set(stream.streamName, connId);
        }
        
        resolve();
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error(`Connection ${connId}: Error parsing message:`, error);
        }
      });

      ws.on('error', (error) => {
        this.logger.error(`Connection ${connId}: WebSocket error:`, error);
        if (!this.isShuttingDown) {
          this.scheduleReconnect(connId, streams);
        }
      });

      ws.on('close', () => {
        this.logger.warn(`Connection ${connId}: Closed`);
        this.connections.delete(connId);
        
        if (!this.isShuttingDown) {
          this.scheduleReconnect(connId, streams);
        }
      });
    });
  }

  private handleMessage(message: any) {
    if (message.stream && message.data) {
      const streamName = message.stream;

      // MarkPrice 데이터 처리 (실시간 가격 모니터링)
      if (streamName.includes('@markPrice')) {
        const markPriceData = message.data;
        const symbol = streamName.split('@')[0].toUpperCase();

        this.currentMarkPrices.set(symbol, {
          markPrice: parseFloat(markPriceData.p),
          indexPrice: parseFloat(markPriceData.i),
          estimatedSettlePrice: parseFloat(markPriceData.P),
          fundingRate: parseFloat(markPriceData.r),
          nextFundingTime: new Date(markPriceData.T),
          timestamp: new Date(markPriceData.E),
        });

        // 디버그 로깅 (필요 시)
        // this.logger.debug(`[${symbol}] MarkPrice: ${markPriceData.p}`);

        return;
      }

      // Kline 데이터 처리
      const klineData = message.data.k;

      if (klineData && klineData.x) { // 캔들 종료
        const streamConfig = this.streams.find(s => s.streamName === streamName);
        if (!streamConfig) return;

        const candle: CandleData = {
          timestamp: new Date(klineData.t),
          open: parseFloat(klineData.o),
          high: parseFloat(klineData.h),
          low: parseFloat(klineData.l),
          close: parseFloat(klineData.c),
          volume: parseFloat(klineData.v),
        };

        // 캔들 변동률 계산
        const changePercent = ((candle.close - candle.open) / candle.open * 100).toFixed(2);
        const direction = candle.close >= candle.open ? '📈' : '📉';

        // [FLOW-1] 캔들 수신 로깅
        this.logger.log(
          `[FLOW-1] WebSocket → Candle | ${streamConfig.symbol} ${streamConfig.timeframe} ` +
          `${direction} ${changePercent}% | O:${candle.open.toFixed(2)} C:${candle.close.toFixed(2)} ` +
          `V:${(candle.volume/1000).toFixed(0)}K`
        );

        this.candleAggregator.onCandleClose(
          streamConfig.symbol,
          streamConfig.timeframe,
          candle
        );
      } else if (klineData) {
        // 진행 중인 캔들 업데이트
        this.currentCandles.set(streamName, {
          timestamp: new Date(klineData.t),
          open: parseFloat(klineData.o),
          high: parseFloat(klineData.h),
          low: parseFloat(klineData.l),
          close: parseFloat(klineData.c),
          volume: parseFloat(klineData.v),
        });
      }
    }
  }

  private scheduleReconnect(connId: number, streams: StreamConfig[]) {
    const attempts = this.reconnectAttempts.get(connId) || 0;
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(`Connection ${connId}: Max reconnect attempts reached`);
      return;
    }

    this.reconnectAttempts.set(connId, attempts + 1);
    const delay = this.RECONNECT_DELAY * Math.pow(2, attempts); // Exponential backoff

    this.logger.log(`Connection ${connId}: Scheduling reconnect in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.createConnection(connId, streams).catch((error) => {
          this.logger.error(`Connection ${connId}: Reconnect failed:`, error);
        });
      }
    }, delay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentCandle(symbol: string, timeframe: string): CandleData | null {
    const streamName = `${symbol.toLowerCase()}@kline_${timeframe}`;
    return this.currentCandles.get(streamName) || null;
  }

  isConnected(): boolean {
    return this.connections.size > 0;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 새로운 종목 리스트로 재구독
   * 기존 연결을 모두 종료하고 새로 시작
   */
  async resubscribe(newSymbols: string[], timeframes: string[] = ['5m', '15m']) {
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('WEBSOCKET RESUBSCRIPTION');
    this.logger.log('='.repeat(80));
    this.logger.log(`Closing ${this.connections.size} existing connections...`);

    // 1. 기존 연결 모두 종료
    for (const [connId, ws] of this.connections.entries()) {
      try {
        ws.close();
        this.logger.log(`Connection ${connId}: Closed`);
      } catch (error) {
        this.logger.error(`Connection ${connId}: Error closing:`, error);
      }
    }

    // 2. 상태 초기화
    this.connections.clear();
    this.streamMap.clear();
    this.reconnectAttempts.clear();
    this.currentCandles.clear();
    this.streams = [];

    this.logger.log('All connections closed and state cleared');

    // 3. 짧은 대기 (연결 완전히 정리되도록)
    await this.delay(2000);

    // 4. 새로운 종목으로 재구독
    this.logger.log(`Resubscribing to ${newSymbols.length} symbols...`);
    await this.subscribeAll(newSymbols, timeframes);

    this.logger.log('='.repeat(80));
    this.logger.log('RESUBSCRIPTION COMPLETE');
    this.logger.log('='.repeat(80) + '\n');
  }

  /**
   * ✅ 모든 WebSocket 연결 해제 (Stop 시 호출)
   */
  async disconnectAll(): Promise<void> {
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('WEBSOCKET DISCONNECTION');
    this.logger.log('='.repeat(80));
    this.logger.log(`Closing ${this.connections.size} connections...`);

    // 모든 연결 종료
    for (const [connId, ws] of this.connections.entries()) {
      try {
        ws.close();
        this.logger.log(`Connection ${connId}: Closed`);
      } catch (error) {
        this.logger.error(`Connection ${connId}: Error closing:`, error);
      }
    }

    // 상태 초기화
    this.connections.clear();
    this.streamMap.clear();
    this.reconnectAttempts.clear();
    this.currentCandles.clear();
    this.currentMarkPrices.clear();
    this.streams = [];

    this.logger.log('All WebSocket connections closed');
    this.logger.log('='.repeat(80) + '\n');
  }

  /**
   * 특정 심볼의 현재 MarkPrice 정보 조회
   */
  getCurrentMarkPrice(symbol: string): any | null {
    return this.currentMarkPrices.get(symbol.toUpperCase()) || null;
  }

  /**
   * 모든 심볼의 MarkPrice 정보 조회
   */
  getAllMarkPrices(): Map<string, any> {
    return this.currentMarkPrices;
  }
}
