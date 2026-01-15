[1:14:34 AM] Starting compilation in watch mode...

[1:14:36 AM] Found 0 errors. Watching for file changes.

(node:75470) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
01:14:36 [NestFactory] info: Starting Nest application...
01:14:36 [ScalpingPositionService] info: [ScalpingPosition] Position service initialized
01:14:36 [InstanceLoader] info: TypeOrmModule dependencies initialized
01:14:36 [InstanceLoader] info: DatabaseModule dependencies initialized
01:14:36 [InstanceLoader] info: ConfigHostModule dependencies initialized
01:14:36 [InstanceLoader] info: DiscoveryModule dependencies initialized
01:14:36 [InstanceLoader] info: TradingControlModule dependencies initialized
01:14:36 [InstanceLoader] info: ConfigModule dependencies initialized
01:14:36 [InstanceLoader] info: ConfigModule dependencies initialized
01:14:36 [InstanceLoader] info: ScheduleModule dependencies initialized
01:14:36 [OkxService] info: OKX client initialized
01:14:36 [BacktestEngineService] info: [BACKTEST ENGINE] Initialized with:
Min Position Size: $15
Fixed Leverage:    20x
Maker Fee:         0.040%
Taker Fee:         0.075%
01:14:36 [InstanceLoader] info: OkxModule dependencies initialized
01:14:36 [InstanceLoader] info: CacheModule dependencies initialized
01:14:36 [InstanceLoader] info: WebSocketModule dependencies initialized
01:14:36 [InstanceLoader] info: SymbolSelectionModule dependencies initialized
01:14:36 [RedisModule] info: ✅ Redis connected
01:14:36 [InstanceLoader] info: TypeOrmCoreModule dependencies initialized
01:14:36 [InstanceLoader] info: TypeOrmModule dependencies initialized
01:14:36 [InstanceLoader] info: TypeOrmModule dependencies initialized
01:14:36 [InstanceLoader] info: TypeOrmModule dependencies initialized
01:14:36 [RiskService] info:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 [RISK SERVICE INITIALIZED]
Initial Balance:   $100.00 (from .env)
Dynamic Balance:   ✅ ENABLED (compound)
Risk Per Trade:    1.00%
Daily Loss Limit:  50.00%
Max Positions:     20 (LONG: 10, SHORT: 10)
Min Position Size: $15 (ENABLED)
Fixed Leverage:    20x (ENABLED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
01:14:36 [ScalpingOrderService] info: [ScalpingOrder] Order service initialized
01:14:36 [InstanceLoader] info: ApiModule dependencies initialized
01:14:36 [InstanceLoader] info: AppModule dependencies initialized
01:14:36 [InstanceLoader] info: StrategiesModule dependencies initialized
01:14:36 [InstanceLoader] info: SyncModule dependencies initialized
01:14:36 [InstanceLoader] info: RiskModule dependencies initialized
01:14:36 [InstanceLoader] info: OrderModule dependencies initialized
01:14:36 [InstanceLoader] info: ScalpingModule dependencies initialized
01:14:36 [SignalProcessorService] info: 🚀 SignalProcessorService initialized, starting queue processor...
01:14:36 [SignalProcessorService] info: ✅ Queue processor started!
01:14:36 [InstanceLoader] info: BacktestModule dependencies initialized
01:14:36 [InstanceLoader] info: SignalModule dependencies initialized
01:14:37 [RoutesResolver] info: AppController {/api}:
01:14:37 [RouterExplorer] info: Mapped {/api/stats/daily, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/positions, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/signals, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/performance, GET} route
01:14:37 [RoutesResolver] info: TradingControlController {/api/trading}:
01:14:37 [RouterExplorer] info: Mapped {/api/trading/status, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/trading/start, POST} route
01:14:37 [RouterExplorer] info: Mapped {/api/trading/stop, POST} route
01:14:37 [RouterExplorer] info: Mapped {/api/trading/toggle, POST} route
01:14:37 [RoutesResolver] info: BacktestController {/api/backtest}:
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/run, POST} route
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/run-simple-true-ob, POST} route
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/results/:id, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/download/:symbol/:interval/:startDate/:endDate, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/strategy-status, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/risk-cap-comparison, POST} route
01:14:37 [RouterExplorer] info: Mapped {/api/backtest/max-atr-mult-comparison, POST} route
01:14:37 [RoutesResolver] info: ApiController {/api}:
01:14:37 [RouterExplorer] info: Mapped {/api/positions, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/positions/open, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/positions/:id/close, POST} route
01:14:37 [RouterExplorer] info: Mapped {/api/signals, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/trades/closed, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/trades/summary, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/ticker/:symbol, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/account/balance, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/binance/symbols, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/system/status, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/dashboard/metrics, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/trades/daily-stats, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/trades/by-date/:date, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/dashboard/equity-curve, GET} route
01:14:37 [RouterExplorer] info: Mapped {/api/cleanup/orphan-orders, POST} route
01:14:37 [SymbolSectorService] info: Loaded 257 symbols from cache (1.1h old)
01:14:37 [OrderMonitorService] info: 🚀 OrderMonitorService initialized, starting monitor loop...
01:14:37 [OrderMonitorService] debug: [MONITOR] Syncing with Binance...
01:14:37 [OkxService] info: Exchange info loaded: 257 symbols
01:14:37 [OrderMonitorService] debug: [SYNC] Complete | Pending: 0 | Binance LIMIT: 0 | Active positions: 0
01:14:37 [OrderMonitorService] info: ✅ Monitor loop started
01:14:37 [PositionSyncService] info: Performing initial position sync...
01:14:37 [OkxService] debug: [Balance] Available: $85.75
01:14:37 [ScalpingDataService] info: ═══════════════════════════════════════════════════════════
01:14:37 [ScalpingDataService] info: [ScalpingData] Initializing data service...
01:14:37 [ScalpingDataService] info: [ScalpingData] Waiting for symbols to be selected via TradingControl...
01:14:37 [ScalpingDataService] info: ═══════════════════════════════════════════════════════════
01:14:37 [NestApplication] info: Nest application successfully started
🚀 Trading Backend running on http://localhost:3031
📝 Log level: debug
📂 Log files: disabled
01:14:39 [AppWebSocketGateway] info: Client connected: EsTyt-b64KuCyAqwAAAB
01:14:40 [OkxService] debug: [Balance] Available: $85.75
01:14:42 [TradingControlController] info: Received start trading request
01:14:42 [TradingControlService] info: 🚀 Starting live trading...
01:14:42 [AppService] info:
════════════════════════════════════════════════════════════════════════════════
01:14:42 [AppService] info: 🚀 CRYPTO TRADING BOT - STARTING
01:14:42 [AppService] info: ════════════════════════════════════════════════════════════════════════════════
01:14:42 [AppService] info:
01:14:42 [AppService] info: 📊 TRADING FLOW:
01:14:42 [AppService] info:   [1] WebSocket → 캔들 수신
01:14:42 [AppService] info:   [2] CandleAggregator → 캔들 집계 & Redis 저장
01:14:42 [AppService] info:   [3] StrategyRunner → SimpleTrueOB 전략 실행
01:14:42 [AppService] info:   [4] SignalProcessor → 신호 큐 관리 & 중복 제거
01:14:42 [AppService] info:   [5] RiskService → 리스크 체크 (포지션/일일손실/상관관계)
01:14:42 [AppService] info:   [6] OrderService → 바이낸스 주문 실행
01:14:42 [AppService] info:   [7] PositionSync → 포지션 동기화 & TP1 후 SL 본전 이동
01:14:42 [AppService] info:
01:14:42 [AppService] info: ⚙️  SETTINGS:
01:14:42 [AppService] info:   Strategy:    SimpleTrueOB (ORB)
01:14:42 [AppService] info:   Score:       80 (고정) → 메이커 주문
01:14:42 [AppService] info:   TP1/TP2:     80%/20%
01:14:42 [AppService] info:   Leverage:    10x (소자본 모드)
01:14:42 [AppService] info:   Position:    $15 USDT
01:14:42 [AppService] info: ════════════════════════════════════════════════════════════════════════════════

01:14:42 [AppService] info: Selecting symbols by 24h volume...
01:14:42 [SymbolSelectionService] info: Hybrid selection: Core 5 + Dynamic 75
01:14:42 [SymbolSelectionService] info: Selecting top 180 symbols by 24h volume...
01:14:42 [SymbolSelectionService] info: Found 257 perpetual USDT symbols
01:14:42 [SymbolSelectionService] info: Fetched 24h stats for 257 symbols
01:14:42 [SymbolSelectionService] info: 222 symbols passed minimum volume filter ($1,000,000)
01:14:42 [SymbolSelectionService] info: Cached 180 selected symbols (TTL: 24h)
01:14:42 [SymbolSelectionService] info:
================================================================================
01:14:42 [SymbolSelectionService] info: TOP 10 SYMBOLS BY 24H VOLUME:
01:14:42 [SymbolSelectionService] info: ================================================================================
01:14:42 [SymbolSelectionService] info: 1. SATSUSDT     Volume: $224906720.0M  Change: +5.15%
01:14:42 [SymbolSelectionService] info: 2. PEPEUSDT     Volume: $60062549.0M  Change: +1.74%
01:14:42 [SymbolSelectionService] info: 3. BONKUSDT     Volume: $3129692.2M  Change: +1.95%
01:14:42 [SymbolSelectionService] info: 4. SHIBUSDT     Volume: $2975270.4M  Change: +3.01%
01:14:42 [SymbolSelectionService] info: 5. MOGUSDT      Volume: $2632418.0M  Change: +5.09%
01:14:42 [SymbolSelectionService] info: 6. CATUSDT      Volume: $265414.1M  Change: +3.77%
01:14:42 [SymbolSelectionService] info: 7. PUMPUSDT     Volume: $90667.9M  Change: +4.66%
01:14:42 [SymbolSelectionService] info: 8. FLOKIUSDT    Volume: $69423.2M  Change: +1.32%
01:14:42 [SymbolSelectionService] info: 9. NEIROUSDT    Volume: $16614.8M  Change: +3.26%
01:14:42 [SymbolSelectionService] info: 10. HMSTRUSDT    Volume: $3717.0M  Change: +3.51%
01:14:42 [SymbolSelectionService] info: ================================================================================

01:14:42 [SymbolSelectionService] info: Hybrid selection complete: 5 core + 165 dynamic = 170 total
01:14:42 [AppService] info:
Starting WebSocket subscriptions...
01:14:42 [OkxWebSocketService] info: Subscribing to 170 symbols:
- Timeframes: 5m, 15m
- Total streams: 340
  01:14:42 [OkxWebSocketService] info: Connecting to OKX Business WebSocket (for candles)...
  01:14:42 [OkxWebSocketService] info: OKX WebSocket connected
  01:14:42 [OkxWebSocketService] info: Subscribing to candle5m for 170 instruments
  01:14:42 [OkxWebSocketService] info: Subscribing to candle15m for 170 instruments
  01:14:42 [OkxWebSocketService] info: Candle subscriptions complete (mark-price skipped - uses different WS)
  01:14:42 [AppService] info:
  ════════════════════════════════════════════════════════════════════════════════
  01:14:42 [AppService] info: ✅ TRADING STARTED
  01:14:42 [AppService] info: ════════════════════════════════════════════════════════════════════════════════
  01:14:42 [AppService] info: 📡 Monitoring: 170 symbols × 3 streams = 510 total
  01:14:42 [AppService] info:    (5m kline + 15m kline + markPrice per symbol)
  01:14:42 [AppService] info: 🔄 Daily symbol update: 00:00 UTC (09:00 KST)
  01:14:42 [AppService] info: 📝 Log format: [FLOW-N] Stage → Action | Details
  01:14:42 [AppService] info: ════════════════════════════════════════════════════════════════════════════════

01:14:42 [TradingControlService] info: ════════════════════════════════════════════════════════════
01:14:42 [TradingControlService] info: 📈 전략: 스캘핑 (기본)
01:14:42 [TradingControlService] info:    - SimpleTrueOB: 비활성화
01:14:42 [TradingControlService] info:    - 스캘핑 스캔: 매 1분 (30초 오프셋)
01:14:42 [TradingControlService] info:    - 주문 실행: 매 10초
01:14:42 [TradingControlService] info: ════════════════════════════════════════════════════════════
01:14:42 [ScalpingOrderService] info: [ScalpingOrder] ✅ Service ENABLED - Trading active
01:14:42 [TradingControlService] info: ✅ Live trading STARTED
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle5m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: Subscribed to candle15m
01:14:42 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:43 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:43 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:44 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:44 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:45 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:45 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:46 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:46 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:47 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:47 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:48 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:48 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:49 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:49 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:50 [OkxService] debug: [Balance] Available: $85.75
01:14:50 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:50 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:51 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:51 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:52 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:52 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:53 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:53 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:54 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:54 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:55 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:55 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:56 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:56 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:57 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:57 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:58 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:58 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:14:59 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:14:59 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:15:00 [ScalpingDataService] info: [ScalpingData] Symbol list updated: 0 → 170 symbols
01:15:00 [ScalpingDataService] debug: [ScalpingData] Symbols: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT...
01:15:00 [ScalpingDataService] info: [ScalpingData] 🚀 Loading initial candle data from OKX REST API...
01:15:00 [ScalpingDataService] info: [ScalpingData] Loading candles for 80 symbols (5m, 15m)...
01:15:00 [OrderMonitorService] debug: [MONITOR] Syncing with Binance...
01:15:00 [ScalpingDataService] debug: [ScalpingData] Loaded 50 5m candles for BTCUSDT
01:15:00 [OrderMonitorService] debug: [SYNC] Complete | Pending: 0 | Binance LIMIT: 0 | Active positions: 0
01:15:00 [OkxService] debug: [Balance] Available: $85.75
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HBARUSDT 15m 📈 0.13% | O:0.12 C:0.12 V:44K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HBARUSDT 15m saved to candles:HBARUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FILUSDT 15m 📈 0.38% | O:1.56 C:1.57 V:21318K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FILUSDT 15m saved to candles:FILUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | OPUSDT 5m 📈 0.64% | O:0.35 C:0.35 V:1016K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | OPUSDT 5m saved to candles:OPUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LRCUSDT 15m 📉 -0.17% | O:0.05 C:0.05 V:52K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LRCUSDT 15m saved to candles:LRCUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MONUSDT 5m 📉 -0.04% | O:0.02 C:0.02 V:137K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MONUSDT 5m saved to candles:MONUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IMXUSDT 15m 📈 0.67% | O:0.28 C:0.28 V:852K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IMXUSDT 15m saved to candles:IMXUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HBARUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FILUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle OPUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LRCUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MONUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IMXUSDT 15m not processed.
01:15:00 [ScalpingDataService] debug: [ScalpingData] Loaded 20 15m candles for BTCUSDT
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LUNAUSDT 5m 📈 0.02% | O:0.09 C:0.09 V:170K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LUNAUSDT 5m saved to candles:LUNAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RVNUSDT 5m 📉 -0.17% | O:0.01 C:0.01 V:232K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RVNUSDT 5m saved to candles:RVNUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IMXUSDT 5m 📈 0.04% | O:0.28 C:0.28 V:73K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IMXUSDT 5m saved to candles:IMXUSDT:5m
01:15:00 [OkxService] debug: [ALGO ORDER] Found 0 open algo orders
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LUNAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RVNUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IMXUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LRCUSDT 5m 📉 -0.19% | O:0.05 C:0.05 V:8K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LRCUSDT 5m saved to candles:LRCUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ICXUSDT 5m 📈 0.19% | O:0.06 C:0.06 V:3K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ICXUSDT 5m saved to candles:ICXUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ACTUSDT 15m 📉 -0.20% | O:0.02 C:0.02 V:11821K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ACTUSDT 15m saved to candles:ACTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AEVOUSDT 5m 📈 0.22% | O:0.04 C:0.04 V:78K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AEVOUSDT 5m saved to candles:AEVOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ATHUSDT 15m 📉 -0.13% | O:0.01 C:0.01 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ATHUSDT 15m saved to candles:ATHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DOGEUSDT 15m 📈 0.31% | O:0.14 C:0.14 V:144K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DOGEUSDT 15m saved to candles:DOGEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LUNAUSDT 15m 📉 -0.27% | O:0.09 C:0.09 V:953K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LUNAUSDT 15m saved to candles:LUNAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CFXUSDT 15m 📈 0.11% | O:0.08 C:0.08 V:148K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CFXUSDT 15m saved to candles:CFXUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DOGEUSDT 5m 📈 0.14% | O:0.14 C:0.14 V:18K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DOGEUSDT 5m saved to candles:DOGEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HBARUSDT 5m 📈 0.07% | O:0.12 C:0.12 V:8K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HBARUSDT 5m saved to candles:HBARUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RVNUSDT 15m 📉 -0.54% | O:0.01 C:0.01 V:1611K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RVNUSDT 15m saved to candles:RVNUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | OPUSDT 15m 📈 1.08% | O:0.34 C:0.35 V:4132K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | OPUSDT 15m saved to candles:OPUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ANIMEUSDT 15m 📉 -0.58% | O:0.01 C:0.01 V:620K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ANIMEUSDT 15m saved to candles:ANIMEUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LRCUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ICXUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ACTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AEVOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ATHUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DOGEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LUNAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CFXUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DOGEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HBARUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RVNUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle OPUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ANIMEUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SHIBUSDT 5m 📉 -0.15% | O:0.00 C:0.00 V:17K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SHIBUSDT 5m saved to candles:SHIBUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SHIBUSDT 15m 📈 0.00% | O:0.00 C:0.00 V:139K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SHIBUSDT 15m saved to candles:SHIBUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ANIMEUSDT 5m 📉 -0.20% | O:0.01 C:0.01 V:135K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ANIMEUSDT 5m saved to candles:ANIMEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FILUSDT 5m 📈 0.13% | O:1.57 C:1.57 V:3347K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FILUSDT 5m saved to candles:FILUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ACTUSDT 5m 📉 -0.20% | O:0.02 C:0.02 V:3451K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ACTUSDT 5m saved to candles:ACTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CFXUSDT 5m 📉 -0.01% | O:0.08 C:0.08 V:40K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CFXUSDT 5m saved to candles:CFXUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ATHUSDT 5m 📉 -0.27% | O:0.01 C:0.01 V:3K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ATHUSDT 5m saved to candles:ATHUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MONUSDT 15m 📉 -0.04% | O:0.02 C:0.02 V:492K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MONUSDT 15m saved to candles:MONUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SHIBUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SHIBUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ANIMEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FILUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ACTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CFXUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ATHUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MONUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AEVOUSDT 15m 📈 0.58% | O:0.04 C:0.04 V:664K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AEVOUSDT 15m saved to candles:AEVOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ICXUSDT 15m 📉 -0.02% | O:0.06 C:0.06 V:20K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ICXUSDT 15m saved to candles:ICXUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AEVOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ICXUSDT 15m not processed.
01:15:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320000000
01:15:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320600000
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LDOUSDT 15m 📈 0.08% | O:0.63 C:0.63 V:620K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LDOUSDT 15m saved to candles:LDOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BIGTIMEUSDT 15m 📈 0.27% | O:0.02 C:0.02 V:55K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BIGTIMEUSDT 15m saved to candles:BIGTIMEUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LDOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BIGTIMEUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZILUSDT 15m 📉 -0.17% | O:0.01 C:0.01 V:88K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZILUSDT 15m saved to candles:ZILUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GALAUSDT 15m 📈 0.50% | O:0.01 C:0.01 V:3919K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GALAUSDT 15m saved to candles:GALAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LDOUSDT 5m 📉 -0.17% | O:0.63 C:0.63 V:57K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LDOUSDT 5m saved to candles:LDOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ONEUSDT 15m 📉 -0.58% | O:0.00 C:0.00 V:113K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ONEUSDT 15m saved to candles:ONEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZILUSDT 5m 📈 0.02% | O:0.01 C:0.01 V:14K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZILUSDT 5m saved to candles:ZILUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ARBUSDT 5m 📈 0.09% | O:0.21 C:0.21 V:42K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ARBUSDT 5m saved to candles:ARBUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GALAUSDT 5m 📈 0.30% | O:0.01 C:0.01 V:569K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GALAUSDT 5m saved to candles:GALAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SOLUSDT 15m 📉 -0.38% | O:143.43 C:142.88 V:225K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SOLUSDT 15m saved to candles:SOLUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SNXUSDT 15m 📉 -0.46% | O:0.48 C:0.48 V:225K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SNXUSDT 15m saved to candles:SNXUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AVNTUSDT 5m 📉 -0.06% | O:0.32 C:0.32 V:148K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AVNTUSDT 5m saved to candles:AVNTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PLUMEUSDT 5m 📈 0.00% | O:0.02 C:0.02 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PLUMEUSDT 5m saved to candles:PLUMEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PIPPINUSDT 5m 📈 0.26% | O:0.33 C:0.34 V:81K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PIPPINUSDT 5m saved to candles:PIPPINUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DOODUSDT 5m 📈 0.04% | O:0.01 C:0.01 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DOODUSDT 5m saved to candles:DOODUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZBTUSDT 15m 📉 -0.05% | O:0.11 C:0.11 V:188K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZBTUSDT 15m saved to candles:ZBTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ONEUSDT 5m 📉 -0.61% | O:0.00 C:0.00 V:49K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ONEUSDT 5m saved to candles:ONEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SNXUSDT 5m 📉 -0.08% | O:0.48 C:0.48 V:26K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SNXUSDT 5m saved to candles:SNXUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CATUSDT 5m 📉 -0.22% | O:0.00 C:0.00 V:18K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CATUSDT 5m saved to candles:CATUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SOLVUSDT 5m 📈 0.23% | O:0.01 C:0.01 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SOLVUSDT 5m saved to candles:SOLVUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AXSUSDT 15m 📈 0.11% | O:1.04 C:1.04 V:3354K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AXSUSDT 15m saved to candles:AXSUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZILUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GALAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LDOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ONEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZILUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ARBUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GALAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SOLUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SNXUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AVNTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PLUMEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PIPPINUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DOODUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZBTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ONEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SNXUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CATUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SOLVUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AXSUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BIGTIMEUSDT 5m 📈 0.14% | O:0.02 C:0.02 V:17K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BIGTIMEUSDT 5m saved to candles:BIGTIMEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ARBUSDT 15m 📈 0.19% | O:0.21 C:0.21 V:263K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ARBUSDT 15m saved to candles:ARBUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WOOUSDT 5m 📉 -0.14% | O:0.03 C:0.03 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WOOUSDT 5m saved to candles:WOOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MOGUSDT 15m 📈 0.06% | O:0.00 C:0.00 V:104K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MOGUSDT 15m saved to candles:MOGUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BONKUSDT 5m 📈 0.15% | O:0.00 C:0.00 V:216K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BONKUSDT 5m saved to candles:BONKUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SOLUSDT 5m 📉 -0.18% | O:143.14 C:142.88 V:45K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SOLUSDT 5m saved to candles:SOLUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PLUMEUSDT 15m 📉 -0.17% | O:0.02 C:0.02 V:90K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PLUMEUSDT 15m saved to candles:PLUMEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PIPPINUSDT 15m 📈 0.94% | O:0.33 C:0.34 V:230K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PIPPINUSDT 15m saved to candles:PIPPINUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SOLVUSDT 15m 📈 0.41% | O:0.01 C:0.01 V:4K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SOLVUSDT 15m saved to candles:SOLVUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BONKUSDT 15m 📉 -0.44% | O:0.00 C:0.00 V:956K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BONKUSDT 15m saved to candles:BONKUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MERLUSDT 15m 📉 -0.66% | O:0.25 C:0.25 V:471K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MERLUSDT 15m saved to candles:MERLUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | STXUSDT 5m 📉 -0.10% | O:0.40 C:0.40 V:4K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | STXUSDT 5m saved to candles:STXUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WOOUSDT 15m 📉 -0.39% | O:0.03 C:0.03 V:79K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WOOUSDT 15m saved to candles:WOOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CATUSDT 15m 📉 -0.06% | O:0.00 C:0.00 V:64K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CATUSDT 15m saved to candles:CATUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AVNTUSDT 15m 📉 -0.47% | O:0.32 C:0.32 V:1327K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AVNTUSDT 15m saved to candles:AVNTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MERLUSDT 5m 📈 0.13% | O:0.25 C:0.25 V:156K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MERLUSDT 5m saved to candles:MERLUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BIGTIMEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ARBUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WOOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MOGUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BONKUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SOLUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PLUMEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PIPPINUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SOLVUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BONKUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MERLUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle STXUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WOOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CATUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AVNTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MERLUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MOGUSDT 5m 📉 -0.03% | O:0.00 C:0.00 V:24K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MOGUSDT 5m saved to candles:MOGUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AXSUSDT 5m 📈 0.11% | O:1.04 C:1.04 V:421K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AXSUSDT 5m saved to candles:AXSUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | STXUSDT 15m 📉 -0.08% | O:0.40 C:0.40 V:22K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | STXUSDT 15m saved to candles:STXUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AIXBTUSDT 5m 📉 -0.62% | O:0.04 C:0.04 V:94K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AIXBTUSDT 5m saved to candles:AIXBTUSDT:5m
01:15:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=1 ts=1768320000000
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BTCUSDT 15m 📉 -0.18% | O:93412.20 C:93243.70 V:306K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BTCUSDT 15m saved to candles:BTCUSDT:15m
01:15:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=1 ts=1768320600000
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BTCUSDT 5m 📉 -0.20% | O:93433.60 C:93243.70 V:51K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BTCUSDT 5m saved to candles:BTCUSDT:5m
01:15:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DOODUSDT 15m 📉 -0.24% | O:0.01 C:0.01 V:3K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DOODUSDT 15m saved to candles:DOODUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZBTUSDT 5m 📈 0.24% | O:0.11 C:0.11 V:20K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZBTUSDT 5m saved to candles:ZBTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | AIXBTUSDT 15m 📉 -0.57% | O:0.04 C:0.04 V:346K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | AIXBTUSDT 15m saved to candles:AIXBTUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MOGUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AXSUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle STXUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AIXBTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BTCUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BTCUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DOODUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZBTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle AIXBTUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZETAUSDT 5m 📈 0.11% | O:0.08 C:0.08 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZETAUSDT 5m saved to candles:ZETAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZETAUSDT 15m 📉 -0.16% | O:0.08 C:0.08 V:4K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZETAUSDT 15m saved to candles:ZETAUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZETAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZETAUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LITUSDT 5m 📈 1.03% | O:2.13 C:2.15 V:221K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LITUSDT 5m saved to candles:LITUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ARKMUSDT 15m 📈 0.24% | O:0.21 C:0.21 V:436K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ARKMUSDT 15m saved to candles:ARKMUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ICPUSDT 15m 📉 -1.33% | O:3.67 C:3.62 V:71103K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ICPUSDT 15m saved to candles:ICPUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RIVERUSDT 15m 📉 -0.62% | O:21.41 C:21.28 V:1360K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RIVERUSDT 15m saved to candles:RIVERUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WETUSDT 5m 📈 0.07% | O:0.14 C:0.14 V:11K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WETUSDT 5m saved to candles:WETUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LITUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ARKMUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ICPUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RIVERUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WETUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ASTERUSDT 15m 📈 0.11% | O:0.71 C:0.71 V:1084K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ASTERUSDT 15m saved to candles:ASTERUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | STABLEUSDT 15m 📉 -1.18% | O:0.02 C:0.02 V:42K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | STABLEUSDT 15m saved to candles:STABLEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LITUSDT 15m 📈 1.22% | O:2.13 C:2.15 V:419K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LITUSDT 15m saved to candles:LITUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SUSDT 5m 📈 0.16% | O:0.09 C:0.09 V:4K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SUSDT 5m saved to candles:SUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FUSDT 5m 📈 0.23% | O:0.01 C:0.01 V:32K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FUSDT 5m saved to candles:FUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | STABLEUSDT 5m 📉 -0.72% | O:0.02 C:0.02 V:19K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | STABLEUSDT 5m saved to candles:STABLEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MMTUSDT 5m 📉 -0.39% | O:0.25 C:0.25 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MMTUSDT 5m saved to candles:MMTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SAPIENUSDT 15m 📉 -0.35% | O:0.14 C:0.14 V:23K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SAPIENUSDT 15m saved to candles:SAPIENUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MOVEUSDT 15m 📉 -0.03% | O:0.04 C:0.04 V:174K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MOVEUSDT 15m saved to candles:MOVEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ARKMUSDT 5m 📉 -0.05% | O:0.21 C:0.21 V:43K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ARKMUSDT 5m saved to candles:ARKMUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NEIROUSDT 5m 📉 -0.22% | O:0.00 C:0.00 V:30K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NEIROUSDT 5m saved to candles:NEIROUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WETUSDT 15m 📉 -0.07% | O:0.14 C:0.14 V:67K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WETUSDT 15m saved to candles:WETUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BOMEUSDT 5m 📉 -0.11% | O:0.00 C:0.00 V:30K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BOMEUSDT 5m saved to candles:BOMEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZORAUSDT 15m 📉 -0.40% | O:0.04 C:0.04 V:30K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZORAUSDT 15m saved to candles:ZORAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ASTERUSDT 5m 📉 -0.25% | O:0.72 C:0.71 V:172K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ASTERUSDT 5m saved to candles:ASTERUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ATUSDT 5m 📉 -0.23% | O:0.16 C:0.16 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ATUSDT 5m saved to candles:ATUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NEIROUSDT 15m 📉 -0.66% | O:0.00 C:0.00 V:274K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NEIROUSDT 15m saved to candles:NEIROUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CROUSDT 15m 📈 0.05% | O:0.10 C:0.10 V:51K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CROUSDT 15m saved to candles:CROUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ASTERUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle STABLEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LITUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle STABLEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MMTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SAPIENUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MOVEUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FUSDT 15m 📈 0.04% | O:0.01 C:0.01 V:68K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FUSDT 15m saved to candles:FUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SANDUSDT 5m 📉 -0.08% | O:0.12 C:0.12 V:33K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SANDUSDT 5m saved to candles:SANDUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | USELESSUSDT 15m 📉 -0.39% | O:0.11 C:0.11 V:186K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | USELESSUSDT 15m saved to candles:USELESSUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RLSUSDT 15m 📈 0.21% | O:0.01 C:0.01 V:31K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RLSUSDT 15m saved to candles:RLSUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZORAUSDT 5m 📉 -0.11% | O:0.04 C:0.04 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZORAUSDT 5m saved to candles:ZORAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | VIRTUALUSDT 5m 📉 -0.38% | O:1.02 C:1.02 V:86K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | VIRTUALUSDT 5m saved to candles:VIRTUALUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MOODENGUSDT 15m 📉 -0.50% | O:0.08 C:0.08 V:242K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MOODENGUSDT 15m saved to candles:MOODENGUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BNBUSDT 5m 📉 -0.10% | O:918.50 C:917.60 V:83K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BNBUSDT 5m saved to candles:BNBUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MOODENGUSDT 5m 📉 -0.24% | O:0.08 C:0.08 V:114K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MOODENGUSDT 5m saved to candles:MOODENGUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BNBUSDT 15m 📈 0.15% | O:916.20 C:917.60 V:417K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BNBUSDT 15m saved to candles:BNBUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CROUSDT 5m 📉 -0.04% | O:0.10 C:0.10 V:4K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CROUSDT 5m saved to candles:CROUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZRXUSDT 15m 📉 -0.21% | O:0.14 C:0.14 V:22K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZRXUSDT 15m saved to candles:ZRXUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SAPIENUSDT 5m 📉 -0.28% | O:0.14 C:0.14 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SAPIENUSDT 5m saved to candles:SAPIENUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ALLOUSDT 5m 📈 0.00% | O:0.11 C:0.11 V:21K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ALLOUSDT 5m saved to candles:ALLOUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ARKMUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NEIROUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WETUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BOMEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZORAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ASTERUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ATUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NEIROUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CROUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SANDUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle USELESSUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RLSUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZORAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle VIRTUALUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MOODENGUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BNBUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MOODENGUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BNBUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CROUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZRXUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SAPIENUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ALLOUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZRXUSDT 5m 📉 -0.14% | O:0.14 C:0.14 V:4K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZRXUSDT 5m saved to candles:ZRXUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ALLOUSDT 15m 📉 -0.46% | O:0.11 C:0.11 V:77K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ALLOUSDT 15m saved to candles:ALLOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ICPUSDT 5m 📉 -0.58% | O:3.64 C:3.62 V:20804K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ICPUSDT 5m saved to candles:ICPUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | VIRTUALUSDT 15m 📉 -1.51% | O:1.03 C:1.02 V:712K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | VIRTUALUSDT 15m saved to candles:VIRTUALUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SEIUSDT 15m 📈 0.16% | O:0.12 C:0.12 V:67K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SEIUSDT 15m saved to candles:SEIUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZRXUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ALLOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ICPUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle VIRTUALUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SEIUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BOMEUSDT 15m 📉 -0.51% | O:0.00 C:0.00 V:84K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BOMEUSDT 15m saved to candles:BOMEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CHZUSDT 15m 📈 0.26% | O:0.05 C:0.05 V:687K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CHZUSDT 15m saved to candles:CHZUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WLFIUSDT 15m 📉 -0.28% | O:0.18 C:0.18 V:399K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WLFIUSDT 15m saved to candles:WLFIUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HUSDT 5m 📉 -0.29% | O:0.17 C:0.17 V:2K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HUSDT 5m saved to candles:HUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PUMPUSDT 15m 📈 0.00% | O:0.00 C:0.00 V:2029K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PUMPUSDT 15m saved to candles:PUMPUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BOMEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CHZUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WLFIUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PUMPUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XLMUSDT 15m 📈 0.19% | O:0.23 C:0.23 V:22K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XLMUSDT 15m saved to candles:XLMUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SEIUSDT 5m 📉 -0.08% | O:0.12 C:0.12 V:19K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SEIUSDT 5m saved to candles:SEIUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ATUSDT 15m 📉 -0.19% | O:0.16 C:0.16 V:12K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ATUSDT 15m saved to candles:ATUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LIGHTUSDT 5m 📉 -0.13% | O:0.60 C:0.60 V:97K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LIGHTUSDT 5m saved to candles:LIGHTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | EDENUSDT 5m 📉 -0.35% | O:0.07 C:0.07 V:91K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | EDENUSDT 5m saved to candles:EDENUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IOSTUSDT 15m 📉 -0.06% | O:0.00 C:0.00 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IOSTUSDT 15m saved to candles:IOSTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | APEUSDT 5m 📉 -0.05% | O:0.22 C:0.22 V:626K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | APEUSDT 5m saved to candles:APEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RLSUSDT 5m 📈 0.18% | O:0.01 C:0.01 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RLSUSDT 5m saved to candles:RLSUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CHZUSDT 5m 📉 -0.02% | O:0.05 C:0.05 V:121K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CHZUSDT 5m saved to candles:CHZUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BLUAIUSDT 15m 📈 4.83% | O:0.01 C:0.01 V:1459K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BLUAIUSDT 15m saved to candles:BLUAIUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LIGHTUSDT 15m 📉 -0.36% | O:0.60 C:0.60 V:202K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LIGHTUSDT 15m saved to candles:LIGHTUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XLMUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SEIUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ATUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LIGHTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle EDENUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IOSTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle APEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RLSUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CHZUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BLUAIUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LIGHTUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GLMUSDT 5m 📉 -0.06% | O:0.35 C:0.35 V:17K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GLMUSDT 5m saved to candles:GLMUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MINAUSDT 5m 📉 -0.14% | O:0.09 C:0.09 V:57K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MINAUSDT 5m saved to candles:MINAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | EDENUSDT 15m 📉 -0.63% | O:0.07 C:0.07 V:147K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | EDENUSDT 15m saved to candles:EDENUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | 2ZUSDT 5m 📈 0.00% | O:0.12 C:0.12 V:2K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | 2ZUSDT 5m saved to candles:2ZUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BABYUSDT 15m 📉 -0.22% | O:0.02 C:0.02 V:357K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BABYUSDT 15m saved to candles:BABYUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | APEUSDT 15m 📈 0.00% | O:0.22 C:0.22 V:7174K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | APEUSDT 15m saved to candles:APEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MINAUSDT 15m 📉 -0.28% | O:0.09 C:0.09 V:377K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MINAUSDT 15m saved to candles:MINAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MANAUSDT 5m 📈 0.07% | O:0.15 C:0.15 V:9K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MANAUSDT 5m saved to candles:MANAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MANAUSDT 15m 📈 0.07% | O:0.15 C:0.15 V:116K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MANAUSDT 15m saved to candles:MANAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MEWUSDT 5m 📉 -0.03% | O:0.00 C:0.00 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MEWUSDT 5m saved to candles:MEWUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SATSUSDT 5m 📈 0.06% | O:0.00 C:0.00 V:183K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SATSUSDT 5m saved to candles:SATSUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | KAITOUSDT 5m 📈 1.33% | O:0.68 C:0.68 V:908K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | KAITOUSDT 5m saved to candles:KAITOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PARTIUSDT 5m 📉 -0.32% | O:0.10 C:0.09 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PARTIUSDT 5m saved to candles:PARTIUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HMSTRUSDT 5m 📈 0.29% | O:0.00 C:0.00 V:371K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HMSTRUSDT 5m saved to candles:HMSTRUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HMSTRUSDT 15m 📈 0.12% | O:0.00 C:0.00 V:912K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HMSTRUSDT 15m saved to candles:HMSTRUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RESOLVUSDT 5m 📈 0.78% | O:0.08 C:0.08 V:113K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RESOLVUSDT 5m saved to candles:RESOLVUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | EIGENUSDT 15m 📈 0.26% | O:0.42 C:0.42 V:470K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | EIGENUSDT 15m saved to candles:EIGENUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SUSHIUSDT 5m 📈 0.03% | O:0.34 C:0.34 V:26K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SUSHIUSDT 5m saved to candles:SUSHIUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MOVEUSDT 5m 📈 0.09% | O:0.04 C:0.04 V:17K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MOVEUSDT 5m saved to candles:MOVEUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GLMUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MINAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle EDENUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle 2ZUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BABYUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle APEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MINAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MANAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MANAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MEWUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SATSUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle KAITOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PARTIUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HMSTRUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HMSTRUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RESOLVUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle EIGENUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SUSHIUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MOVEUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GPSUSDT 15m 📉 -0.56% | O:0.01 C:0.01 V:978K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GPSUSDT 15m saved to candles:GPSUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BLUAIUSDT 5m 📉 -0.12% | O:0.01 C:0.01 V:421K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BLUAIUSDT 5m saved to candles:BLUAIUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BATUSDT 15m 📉 -0.35% | O:0.20 C:0.20 V:28K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BATUSDT 15m saved to candles:BATUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | JELLYJELLYUSDT 5m 📉 -0.27% | O:0.07 C:0.07 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | JELLYJELLYUSDT 5m saved to candles:JELLYJELLYUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ALGOUSDT 5m 📉 -0.15% | O:0.14 C:0.14 V:37K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ALGOUSDT 5m saved to candles:ALGOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BEATUSDT 15m 📉 -1.57% | O:0.38 C:0.37 V:276K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BEATUSDT 15m saved to candles:BEATUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | USELESSUSDT 5m 📉 -0.20% | O:0.11 C:0.11 V:36K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | USELESSUSDT 5m saved to candles:USELESSUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TRUTHUSDT 5m 📉 -0.13% | O:0.01 C:0.01 V:43K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TRUTHUSDT 5m saved to candles:TRUTHUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | JELLYJELLYUSDT 15m 📉 -0.72% | O:0.07 C:0.07 V:36K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | JELLYJELLYUSDT 15m saved to candles:JELLYJELLYUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HUMAUSDT 15m 📉 -0.69% | O:0.03 C:0.03 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HUMAUSDT 15m saved to candles:HUMAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HUMAUSDT 5m 📈 0.00% | O:0.03 C:0.03 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HUMAUSDT 5m saved to candles:HUMAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SAHARAUSDT 5m 📈 0.04% | O:0.03 C:0.03 V:16K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SAHARAUSDT 5m saved to candles:SAHARAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WLFIUSDT 5m 📈 0.11% | O:0.18 C:0.18 V:148K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WLFIUSDT 5m saved to candles:WLFIUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BATUSDT 5m 📉 -0.15% | O:0.20 C:0.20 V:3K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BATUSDT 5m saved to candles:BATUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MEMEUSDT 15m 📉 -0.18% | O:0.00 C:0.00 V:671K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MEMEUSDT 15m saved to candles:MEMEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TIAUSDT 5m 📈 0.34% | O:0.59 C:0.59 V:103K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TIAUSDT 5m saved to candles:TIAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FARTCOINUSDT 15m 📈 0.68% | O:0.40 C:0.40 V:2491K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FARTCOINUSDT 15m saved to candles:FARTCOINUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FARTCOINUSDT 5m 📈 0.48% | O:0.40 C:0.40 V:292K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FARTCOINUSDT 5m saved to candles:FARTCOINUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MUBARAKUSDT 15m 📉 -0.50% | O:0.02 C:0.02 V:7K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MUBARAKUSDT 15m saved to candles:MUBARAKUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | 1INCHUSDT 15m 📈 0.32% | O:0.16 C:0.16 V:517K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | 1INCHUSDT 15m saved to candles:1INCHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MEMEUSDT 5m 📉 -0.03% | O:0.00 C:0.00 V:34K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MEMEUSDT 5m saved to candles:MEMEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | KMNOUSDT 5m 📉 -0.02% | O:0.06 C:0.06 V:0K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | KMNOUSDT 5m saved to candles:KMNOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | 1INCHUSDT 5m 📈 0.13% | O:0.16 C:0.16 V:85K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | 1INCHUSDT 5m saved to candles:1INCHUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PARTIUSDT 15m 📉 -0.54% | O:0.10 C:0.09 V:28K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PARTIUSDT 15m saved to candles:PARTIUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ACHUSDT 5m 📉 -0.51% | O:0.01 C:0.01 V:125K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ACHUSDT 5m saved to candles:ACHUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HUSDT 15m 📉 -0.73% | O:0.17 C:0.17 V:9K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HUSDT 15m saved to candles:HUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SUSHIUSDT 15m 📉 -0.49% | O:0.35 C:0.34 V:527K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SUSHIUSDT 15m saved to candles:SUSHIUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BEATUSDT 5m 📉 -0.48% | O:0.37 C:0.37 V:113K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BEATUSDT 5m saved to candles:BEATUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MMTUSDT 15m 📉 -0.04% | O:0.25 C:0.25 V:52K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MMTUSDT 15m saved to candles:MMTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SANDUSDT 15m 📈 0.33% | O:0.12 C:0.12 V:325K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SANDUSDT 15m saved to candles:SANDUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WCTUSDT 5m 📈 0.09% | O:0.08 C:0.08 V:9K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WCTUSDT 5m saved to candles:WCTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GLMUSDT 15m 📉 -0.48% | O:0.35 C:0.35 V:91K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GLMUSDT 15m saved to candles:GLMUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | 2ZUSDT 15m 📉 -0.41% | O:0.12 C:0.12 V:24K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | 2ZUSDT 15m saved to candles:2ZUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZKPUSDT 15m 📉 -0.21% | O:0.14 C:0.14 V:354K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZKPUSDT 15m saved to candles:ZKPUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RESOLVUSDT 15m 📈 1.60% | O:0.08 C:0.08 V:336K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RESOLVUSDT 15m saved to candles:RESOLVUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GPSUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BLUAIUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BATUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle JELLYJELLYUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ALGOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BEATUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle USELESSUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TRUTHUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle JELLYJELLYUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HUMAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HUMAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SAHARAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WLFIUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BATUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MEMEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TIAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FARTCOINUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FARTCOINUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MUBARAKUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle 1INCHUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MEMEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle KMNOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle 1INCHUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PARTIUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ACHUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SUSHIUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BEATUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MMTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SANDUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WCTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GLMUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle 2ZUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZKPUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RESOLVUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WCTUSDT 15m 📈 0.06% | O:0.08 C:0.08 V:62K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WCTUSDT 15m saved to candles:WCTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TRUTHUSDT 15m 📈 1.90% | O:0.01 C:0.01 V:109K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TRUTHUSDT 15m saved to candles:TRUTHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RIVERUSDT 5m 📉 -0.12% | O:21.30 C:21.28 V:327K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RIVERUSDT 5m saved to candles:RIVERUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SUSDT 15m 📈 0.13% | O:0.09 C:0.09 V:29K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SUSDT 15m saved to candles:SUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PUMPUSDT 5m 📉 -1.03% | O:0.00 C:0.00 V:332K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PUMPUSDT 5m saved to candles:PUMPUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ALGOUSDT 15m 📈 0.00% | O:0.14 C:0.14 V:210K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ALGOUSDT 15m saved to candles:ALGOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XLMUSDT 5m 📈 0.11% | O:0.23 C:0.23 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XLMUSDT 5m saved to candles:XLMUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GPSUSDT 5m 📉 -0.18% | O:0.01 C:0.01 V:192K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GPSUSDT 5m saved to candles:GPSUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SAHARAUSDT 15m 📉 -0.18% | O:0.03 C:0.03 V:55K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SAHARAUSDT 15m saved to candles:SAHARAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SATSUSDT 15m 📉 -0.52% | O:0.00 C:0.00 V:610K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SATSUSDT 15m saved to candles:SATSUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | KAITOUSDT 15m 📈 2.98% | O:0.67 C:0.68 V:1822K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | KAITOUSDT 15m saved to candles:KAITOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ACHUSDT 15m 📈 1.57% | O:0.01 C:0.01 V:322K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ACHUSDT 15m saved to candles:ACHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | EIGENUSDT 5m 📉 -0.12% | O:0.42 C:0.42 V:103K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | EIGENUSDT 5m saved to candles:EIGENUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | KMNOUSDT 15m 📉 -0.12% | O:0.06 C:0.06 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | KMNOUSDT 15m saved to candles:KMNOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MUBARAKUSDT 5m 📉 -0.05% | O:0.02 C:0.02 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MUBARAKUSDT 5m saved to candles:MUBARAKUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WCTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TRUTHUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RIVERUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PUMPUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ALGOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XLMUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GPSUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SAHARAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SATSUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle KAITOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ACHUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle EIGENUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle KMNOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MUBARAKUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MEWUSDT 15m 📉 -0.40% | O:0.00 C:0.00 V:55K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MEWUSDT 15m saved to candles:MEWUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZKPUSDT 5m 📈 0.00% | O:0.14 C:0.14 V:83K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZKPUSDT 5m saved to candles:ZKPUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BABYUSDT 5m 📉 -0.06% | O:0.02 C:0.02 V:36K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BABYUSDT 5m saved to candles:BABYUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IOSTUSDT 5m 📉 -0.06% | O:0.00 C:0.00 V:2K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IOSTUSDT 5m saved to candles:IOSTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TIAUSDT 15m 📈 0.37% | O:0.59 C:0.59 V:584K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TIAUSDT 15m saved to candles:TIAUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MEWUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZKPUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BABYUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IOSTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TIAUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZAMAUSDT 5m 📉 -3.43% | O:0.10 C:0.10 V:943K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZAMAUSDT 5m saved to candles:ZAMAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NIGHTUSDT 15m 📉 -0.48% | O:0.07 C:0.07 V:64K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NIGHTUSDT 15m saved to candles:NIGHTUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZAMAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NIGHTUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SPKUSDT 15m 📉 -0.33% | O:0.02 C:0.02 V:33K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SPKUSDT 15m saved to candles:SPKUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | POPCATUSDT 15m 📉 -0.04% | O:0.10 C:0.10 V:163K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | POPCATUSDT 15m saved to candles:POPCATUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | INITUSDT 5m 📉 -0.17% | O:0.09 C:0.09 V:7K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | INITUSDT 5m saved to candles:INITUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NIGHTUSDT 5m 📉 -0.04% | O:0.07 C:0.07 V:14K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NIGHTUSDT 5m saved to candles:NIGHTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SPKUSDT 5m 📉 -0.33% | O:0.02 C:0.02 V:7K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SPKUSDT 5m saved to candles:SPKUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RSRUSDT 5m 📉 -0.04% | O:0.00 C:0.00 V:17K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RSRUSDT 5m saved to candles:RSRUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PIEVERSEUSDT 5m 📉 -0.19% | O:0.47 C:0.47 V:7K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PIEVERSEUSDT 5m saved to candles:PIEVERSEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FLOWUSDT 15m 📈 0.21% | O:0.10 C:0.10 V:195K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FLOWUSDT 15m saved to candles:FLOWUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | POPCATUSDT 5m 📉 -0.24% | O:0.10 C:0.10 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | POPCATUSDT 5m saved to candles:POPCATUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FOGOUSDT 15m 📉 -0.81% | O:0.05 C:0.05 V:350K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FOGOUSDT 15m saved to candles:FOGOUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SPKUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle POPCATUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle INITUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NIGHTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SPKUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RSRUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PIEVERSEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FLOWUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle POPCATUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FOGOUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TURBOUSDT 5m 📉 -0.21% | O:0.00 C:0.00 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TURBOUSDT 5m saved to candles:TURBOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BREVUSDT 15m 📉 -0.89% | O:0.34 C:0.33 V:4153K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BREVUSDT 15m saved to candles:BREVUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TRXUSDT 15m 📈 0.01% | O:0.30 C:0.30 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TRXUSDT 15m saved to candles:TRXUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SKYUSDT 5m 📉 -0.42% | O:0.06 C:0.06 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SKYUSDT 5m saved to candles:SKYUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZKUSDT 5m 📉 -0.17% | O:0.04 C:0.04 V:99K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZKUSDT 5m saved to candles:ZKUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TURBOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BREVUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TRXUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SKYUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZKUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HOMEUSDT 15m 📈 0.04% | O:0.03 C:0.03 V:2K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HOMEUSDT 15m saved to candles:HOMEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GMTUSDT 5m 📉 -0.63% | O:0.02 C:0.02 V:5848K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GMTUSDT 5m saved to candles:GMTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ENAUSDT 5m 📉 -0.49% | O:0.22 C:0.22 V:45K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ENAUSDT 5m saved to candles:ENAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CELOUSDT 15m 📉 -0.23% | O:0.13 C:0.13 V:571K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CELOUSDT 15m saved to candles:CELOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XPLUSDT 5m 📉 -0.51% | O:0.16 C:0.16 V:140K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XPLUSDT 5m saved to candles:XPLUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MAGICUSDT 15m 📉 -0.61% | O:0.10 C:0.10 V:1850K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MAGICUSDT 15m saved to candles:MAGICUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HOMEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GMTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ENAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CELOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XPLUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MAGICUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZAMAUSDT 15m 📉 -4.09% | O:0.10 C:0.10 V:1179K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZAMAUSDT 15m saved to candles:ZAMAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TURTLEUSDT 15m 📉 -0.47% | O:0.06 C:0.06 V:29K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TURTLEUSDT 15m saved to candles:TURTLEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FOGOUSDT 5m 📉 -1.41% | O:0.05 C:0.05 V:187K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FOGOUSDT 5m saved to candles:FOGOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PROMPTUSDT 5m 📈 0.62% | O:0.06 C:0.06 V:30K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PROMPTUSDT 5m saved to candles:PROMPTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FLOWUSDT 5m 📈 0.00% | O:0.10 C:0.10 V:54K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FLOWUSDT 5m saved to candles:FLOWUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BREVUSDT 5m 📉 -0.48% | O:0.34 C:0.33 V:1060K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BREVUSDT 5m saved to candles:BREVUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TURBOUSDT 15m 📉 -0.41% | O:0.00 C:0.00 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TURBOUSDT 15m saved to candles:TURBOUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GRTUSDT 5m 📈 0.09% | O:0.04 C:0.04 V:13K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GRTUSDT 5m saved to candles:GRTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SIGNUSDT 15m 📈 0.17% | O:0.04 C:0.04 V:11K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SIGNUSDT 15m saved to candles:SIGNUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BRETTUSDT 15m 📈 0.06% | O:0.02 C:0.02 V:7K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BRETTUSDT 15m saved to candles:BRETTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SKYUSDT 15m 📉 -0.71% | O:0.06 C:0.06 V:7K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SKYUSDT 15m saved to candles:SKYUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IPUSDT 5m 📈 0.67% | O:3.90 C:3.92 V:1553K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IPUSDT 5m saved to candles:IPUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NOTUSDT 5m 📈 0.78% | O:0.00 C:0.00 V:717K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NOTUSDT 5m saved to candles:NOTUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZAMAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TURTLEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FOGOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PROMPTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FLOWUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BREVUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TURBOUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GRTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SIGNUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BRETTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SKYUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IPUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NOTUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RAVEUSDT 5m 📉 -0.03% | O:0.32 C:0.32 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RAVEUSDT 5m saved to candles:RAVEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | OMUSDT 5m 📈 0.21% | O:0.08 C:0.08 V:9K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | OMUSDT 5m saved to candles:OMUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TURTLEUSDT 5m 📉 -0.12% | O:0.06 C:0.06 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TURTLEUSDT 5m saved to candles:TURTLEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | JCTUSDT 15m 📈 0.70% | O:0.00 C:0.00 V:3K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | JCTUSDT 15m saved to candles:JCTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GMTUSDT 15m 📉 -0.32% | O:0.02 C:0.02 V:17086K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GMTUSDT 15m saved to candles:GMTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | OMUSDT 15m 📉 -0.35% | O:0.08 C:0.08 V:50K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | OMUSDT 15m saved to candles:OMUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CELOUSDT 5m 📉 -0.15% | O:0.13 C:0.13 V:128K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CELOUSDT 5m saved to candles:CELOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XANUSDT 15m 📉 -0.34% | O:0.02 C:0.02 V:35K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XANUSDT 15m saved to candles:XANUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | MAGICUSDT 5m 📈 0.11% | O:0.10 C:0.10 V:275K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | MAGICUSDT 5m saved to candles:MAGICUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PIEVERSEUSDT 15m 📉 -0.96% | O:0.48 C:0.47 V:34K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PIEVERSEUSDT 15m saved to candles:PIEVERSEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LINEAUSDT 5m 📉 -0.10% | O:0.01 C:0.01 V:15K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LINEAUSDT 5m saved to candles:LINEAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PNUTUSDT 15m 📉 -0.35% | O:0.09 C:0.09 V:172K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PNUTUSDT 15m saved to candles:PNUTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SIGNUSDT 5m 📈 0.00% | O:0.04 C:0.04 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SIGNUSDT 5m saved to candles:SIGNUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | YGGUSDT 15m 📈 0.09% | O:0.07 C:0.07 V:1679K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | YGGUSDT 15m saved to candles:YGGUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WLDUSDT 5m 📉 -0.18% | O:0.60 C:0.60 V:692K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WLDUSDT 5m saved to candles:WLDUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NEARUSDT 5m 📈 0.17% | O:1.80 C:1.81 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NEARUSDT 5m saved to candles:NEARUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BRETTUSDT 5m 📈 0.11% | O:0.02 C:0.02 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BRETTUSDT 5m saved to candles:BRETTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DYDXUSDT 15m 📉 -0.05% | O:0.21 C:0.21 V:1328K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DYDXUSDT 15m saved to candles:DYDXUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | POLUSDT 5m 📉 -0.38% | O:0.16 C:0.16 V:76K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | POLUSDT 5m saved to candles:POLUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ONTUSDT 15m 📈 0.09% | O:0.07 C:0.07 V:68K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ONTUSDT 15m saved to candles:ONTUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RAVEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle OMUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TURTLEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle JCTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GMTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle OMUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CELOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XANUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle MAGICUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PIEVERSEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LINEAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PNUTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SIGNUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle YGGUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WLDUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NEARUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BRETTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DYDXUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle POLUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ONTUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PNUTUSDT 5m 📉 -0.09% | O:0.09 C:0.09 V:53K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PNUTUSDT 5m saved to candles:PNUTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PEPEUSDT 5m 📈 0.02% | O:0.00 C:0.00 V:84K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PEPEUSDT 5m saved to candles:PEPEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CRVUSDT 5m 📉 -0.07% | O:0.42 C:0.42 V:240K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CRVUSDT 5m saved to candles:CRVUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WUSDT 15m 📉 -0.13% | O:0.04 C:0.04 V:807K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WUSDT 15m saved to candles:WUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WUSDT 5m 📉 -0.05% | O:0.04 C:0.04 V:61K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WUSDT 5m saved to candles:WUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PEOPLEUSDT 15m 📈 0.22% | O:0.01 C:0.01 V:421K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PEOPLEUSDT 15m saved to candles:PEOPLEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ONDOUSDT 5m 📉 -0.22% | O:0.41 C:0.41 V:22K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ONDOUSDT 5m saved to candles:ONDOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BLURUSDT 15m 📉 -0.03% | O:0.03 C:0.03 V:65K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BLURUSDT 15m saved to candles:BLURUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BLURUSDT 5m 📈 0.00% | O:0.03 C:0.03 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BLURUSDT 5m saved to candles:BLURUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BIOUSDT 5m 📉 -0.07% | O:0.04 C:0.04 V:379K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BIOUSDT 5m saved to candles:BIOUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PYTHUSDT 5m 📈 0.19% | O:0.07 C:0.07 V:33K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PYTHUSDT 5m saved to candles:PYTHUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | STRKUSDT 15m 📈 0.80% | O:0.09 C:0.09 V:11413K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | STRKUSDT 15m saved to candles:STRKUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SUIUSDT 5m 📉 -0.05% | O:1.83 C:1.83 V:549K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SUIUSDT 5m saved to candles:SUIUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PNUTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PEPEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CRVUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PEOPLEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ONDOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BLURUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BLURUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BIOUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PYTHUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle STRKUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SUIUSDT 5m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IOTAUSDT 15m 📉 -0.22% | O:0.10 C:0.10 V:24K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IOTAUSDT 15m saved to candles:IOTAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | JUPUSDT 15m 📉 -0.14% | O:0.22 C:0.22 V:124K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | JUPUSDT 15m saved to candles:JUPUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ADAUSDT 15m 📈 0.30% | O:0.41 C:0.41 V:131K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ADAUSDT 15m saved to candles:ADAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ADAUSDT 5m 📈 0.10% | O:0.41 C:0.41 V:29K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ADAUSDT 5m saved to candles:ADAUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CRVUSDT 15m 📈 0.00% | O:0.42 C:0.42 V:1077K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CRVUSDT 15m saved to candles:CRVUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SUIUSDT 15m 📉 -0.26% | O:1.84 C:1.83 V:2987K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SUIUSDT 15m saved to candles:SUIUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PEPEUSDT 15m 📈 0.10% | O:0.00 C:0.00 V:328K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PEPEUSDT 15m saved to candles:PEPEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PEOPLEUSDT 5m 📈 0.15% | O:0.01 C:0.01 V:80K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PEOPLEUSDT 5m saved to candles:PEOPLEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PROMPTUSDT 15m 📉 -0.16% | O:0.06 C:0.06 V:190K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PROMPTUSDT 15m saved to candles:PROMPTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PENGUUSDT 15m 📉 -0.46% | O:0.01 C:0.01 V:994K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PENGUUSDT 15m saved to candles:PENGUUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SOPHUSDT 5m 📈 0.00% | O:0.01 C:0.01 V:0K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SOPHUSDT 5m saved to candles:SOPHUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XANUSDT 5m 📉 -0.40% | O:0.02 C:0.02 V:2K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XANUSDT 5m saved to candles:XANUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | HOMEUSDT 5m 📈 0.22% | O:0.03 C:0.03 V:0K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | HOMEUSDT 5m saved to candles:HOMEUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | INITUSDT 15m 📈 0.09% | O:0.09 C:0.09 V:12K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | INITUSDT 15m saved to candles:INITUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | TRXUSDT 5m 📉 -0.01% | O:0.30 C:0.30 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | TRXUSDT 5m saved to candles:TRXUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RAVEUSDT 15m 📉 -0.96% | O:0.33 C:0.32 V:27K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RAVEUSDT 15m saved to candles:RAVEUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | JUPUSDT 5m 📉 -0.28% | O:0.22 C:0.22 V:22K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | JUPUSDT 5m saved to candles:JUPUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | LINEAUSDT 15m 📉 -0.07% | O:0.01 C:0.01 V:106K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | LINEAUSDT 15m saved to candles:LINEAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | YGGUSDT 5m 📈 0.19% | O:0.07 C:0.07 V:252K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | YGGUSDT 5m saved to candles:YGGUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | APTUSDT 15m 📈 2.20% | O:1.91 C:1.95 V:1210K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | APTUSDT 15m saved to candles:APTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FLOKIUSDT 15m 📉 -0.61% | O:0.00 C:0.00 V:53K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FLOKIUSDT 15m saved to candles:FLOKIUSDT:15m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IOTAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle JUPUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ADAUSDT 15m not processed.
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DOTUSDT 5m 📈 0.39% | O:2.28 C:2.29 V:631K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DOTUSDT 5m saved to candles:DOTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PENGUUSDT 5m 📉 -0.32% | O:0.01 C:0.01 V:145K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PENGUUSDT 5m saved to candles:PENGUUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | POLUSDT 15m 📈 0.26% | O:0.16 C:0.16 V:729K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | POLUSDT 15m saved to candles:POLUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | JCTUSDT 5m 📈 0.40% | O:0.00 C:0.00 V:1K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | JCTUSDT 5m saved to candles:JCTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | OLUSDT 15m 📉 -1.48% | O:0.02 C:0.02 V:98K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | OLUSDT 15m saved to candles:OLUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | SOPHUSDT 15m 📈 0.16% | O:0.01 C:0.01 V:5K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | SOPHUSDT 15m saved to candles:SOPHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | GRTUSDT 15m 📈 0.00% | O:0.04 C:0.04 V:113K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | GRTUSDT 15m saved to candles:GRTUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XPLUSDT 15m 📉 -1.01% | O:0.16 C:0.16 V:641K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XPLUSDT 15m saved to candles:XPLUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | COREUSDT 5m 📈 0.08% | O:0.13 C:0.13 V:71K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | COREUSDT 5m saved to candles:COREUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ONTUSDT 5m 📉 -0.06% | O:0.07 C:0.07 V:12K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ONTUSDT 5m saved to candles:ONTUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ETHUSDT 15m 📉 -0.21% | O:3182.57 C:3176.00 V:1150K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ETHUSDT 15m saved to candles:ETHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PYTHUSDT 15m 📈 0.25% | O:0.07 C:0.07 V:356K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PYTHUSDT 15m saved to candles:PYTHUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | RSRUSDT 15m 📉 -0.18% | O:0.00 C:0.00 V:58K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | RSRUSDT 15m saved to candles:RSRUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PIUSDT 15m 📈 0.24% | O:0.21 C:0.21 V:576K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PIUSDT 15m saved to candles:PIUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | PIUSDT 5m 📉 -0.05% | O:0.21 C:0.21 V:169K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | PIUSDT 5m saved to candles:PIUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | OLUSDT 5m 📈 0.49% | O:0.02 C:0.02 V:11K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | OLUSDT 5m saved to candles:OLUSDT:5m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IPUSDT 15m 📈 3.73% | O:3.78 C:3.92 V:9375K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IPUSDT 15m saved to candles:IPUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CCUSDT 15m 📉 -0.66% | O:0.15 C:0.15 V:101K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CCUSDT 15m saved to candles:CCUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ENAUSDT 15m 📉 -0.93% | O:0.23 C:0.22 V:268K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ENAUSDT 15m saved to candles:ENAUSDT:15m
01:15:00 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | IOTAUSDT 5m 📈 0.03% | O:0.10 C:0.10 V:6K
01:15:00 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | IOTAUSDT 5m saved to candles:IOTAUSDT:5m
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ADAUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CRVUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SUIUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PEPEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PEOPLEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PROMPTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PENGUUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SOPHUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XANUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle HOMEUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle INITUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle TRXUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RAVEUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle JUPUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle LINEAUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle YGGUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle APTUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FLOKIUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DOTUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PENGUUSDT 5m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle POLUSDT 15m not processed.
01:15:00 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle JCTUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle OLUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle SOPHUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle GRTUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XPLUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle COREUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ONTUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ETHUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PYTHUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle RSRUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PIUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle PIUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle OLUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IPUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CCUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ENAUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle IOTAUSDT 5m not processed.
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | FLOKIUSDT 5m 📉 -0.11% | O:0.00 C:0.00 V:4K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | FLOKIUSDT 5m saved to candles:FLOKIUSDT:5m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DOTUSDT 15m 📈 2.32% | O:2.24 C:2.29 V:1904K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DOTUSDT 15m saved to candles:DOTUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WIFUSDT 5m 📉 -0.10% | O:0.39 C:0.39 V:349K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WIFUSDT 5m saved to candles:WIFUSDT:5m
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle FLOKIUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DOTUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WIFUSDT 5m not processed.
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | COREUSDT 15m 📈 0.08% | O:0.13 C:0.13 V:401K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | COREUSDT 15m saved to candles:COREUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | CCUSDT 5m 📉 -0.21% | O:0.15 C:0.15 V:10K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | CCUSDT 5m saved to candles:CCUSDT:5m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NOTUSDT 15m 📈 1.72% | O:0.00 C:0.00 V:9948K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NOTUSDT 15m saved to candles:NOTUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ZKUSDT 15m 📈 0.17% | O:0.04 C:0.04 V:538K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ZKUSDT 15m saved to candles:ZKUSDT:15m
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle COREUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle CCUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NOTUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ZKUSDT 15m not processed.
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | NEARUSDT 15m 📉 -0.11% | O:1.81 C:1.81 V:29K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | NEARUSDT 15m saved to candles:NEARUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WLDUSDT 15m 📉 -0.68% | O:0.61 C:0.60 V:4100K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WLDUSDT 15m saved to candles:WLDUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | DYDXUSDT 5m 📈 0.05% | O:0.21 C:0.21 V:360K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | DYDXUSDT 5m saved to candles:DYDXUSDT:5m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | BIOUSDT 15m 📉 -0.20% | O:0.04 C:0.04 V:1715K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | BIOUSDT 15m saved to candles:BIOUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XRPUSDT 15m 📉 -0.21% | O:2.10 C:2.09 V:60K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XRPUSDT 15m saved to candles:XRPUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ONDOUSDT 15m 📉 -0.34% | O:0.41 C:0.41 V:81K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ONDOUSDT 15m saved to candles:ONDOUSDT:15m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | WIFUSDT 15m 📉 -0.95% | O:0.39 C:0.39 V:2079K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | WIFUSDT 15m saved to candles:WIFUSDT:15m
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle NEARUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WLDUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle DYDXUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle BIOUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XRPUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ONDOUSDT 15m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle WIFUSDT 15m not processed.
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | APTUSDT 5m 📈 0.31% | O:1.95 C:1.95 V:383K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | APTUSDT 5m saved to candles:APTUSDT:5m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | STRKUSDT 5m 📉 -0.52% | O:0.09 C:0.09 V:1591K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | STRKUSDT 5m saved to candles:STRKUSDT:5m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | ETHUSDT 5m 📉 -0.13% | O:3180.13 C:3176.00 V:199K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | ETHUSDT 5m saved to candles:ETHUSDT:5m
01:15:01 [OkxWebSocketService] info: [FLOW-1] OKX WebSocket → Candle CLOSED | XRPUSDT 5m 📉 -0.32% | O:2.10 C:2.09 V:13K
01:15:01 [CandleAggregatorService] debug: [FLOW-2] Aggregator → Redis | XRPUSDT 5m saved to candles:XRPUSDT:5m
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle APTUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle STRKUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle ETHUSDT 5m not processed.
01:15:01 [CandleAggregatorService] warn: [FLOW-2] ⚠️ No strategies registered! Candle XRPUSDT 5m not processed.
01:15:01 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:01 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:02 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:02 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:03 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:03 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:04 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:04 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:05 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:05 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:06 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:06 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:07 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:07 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:08 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:08 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:09 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:09 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:10 [OkxService] debug: [Balance] Available: $85.75
01:15:10 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:10 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:11 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:11 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:12 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:12 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:13 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:13 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:15 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:15 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:15 [ScalpingDataService] info: [ScalpingData] ✓ Initial candles loaded: 160 success, 0 errors (15794ms)
01:15:15 [ScalpingDataService] info: ────────────────────────────────────────────────────────────
01:15:15 [ScalpingDataService] info: [ScalpingData] Starting data collection for 170 symbols...
01:15:15 [ScalpingDataService] debug: [ScalpingData] Collecting funding rates...
01:15:15 [ScalpingDataService] debug: [ScalpingData] Collecting open interest...
01:15:15 [ScalpingDataService] debug: [ScalpingData] Collecting spreads...
01:15:15 [ScalpingDataService] debug: [ScalpingData] Funding: BTCUSDT = 0.0053%
01:15:15 [ScalpingDataService] debug: [ScalpingData] Funding: ETHUSDT = 0.0007%
01:15:16 [ScalpingDataService] debug: [ScalpingData] Funding: BNBUSDT = 0.0100%
01:15:16 [ScalpingDataService] debug: [ScalpingData] Funding: SOLUSDT = 0.0049%
01:15:16 [ScalpingDataService] debug: [ScalpingData] Funding: XRPUSDT = -0.0019%
01:15:16 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:16 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:17 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:17 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:18 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:18 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:19 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:19 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:20 [OkxService] debug: [Balance] Available: $85.75
01:15:20 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:20 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:21 [ScalpingDataService] debug: [ScalpingData] ✓ Funding rates updated: 50 symbols
01:15:21 [ScalpingDataService] debug: [ScalpingData] ✓ Open interest updated: 50 symbols
01:15:21 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:21 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:22 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:22 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:23 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:23 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:23 [ScalpingDataService] debug: [ScalpingData] ✓ Spreads updated: 80 symbols
01:15:23 [ScalpingDataService] info: [ScalpingData] ✓ Data collection completed in 8074ms (Funding: 50, OI: 50, Spread: 80)
01:15:24 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:24 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:25 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:25 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:26 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:26 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:27 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:27 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:28 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:28 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:29 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:29 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] Scanning at 16:15:30
01:15:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.000%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 2: Filter 1 ✓ (Funding=0.001%, Spread=0.000%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.011%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.007%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: Direction=UP, Strength=0.84
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.84)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLUSDT: bodySizeRatio=0.66, volumeRatio=0.55
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 2: Filter 1 ✓ (Funding=-0.002%, Spread=0.005%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SATSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SATSUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.058% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 2: Filter 1 ✓ (Funding=0.008%, Spread=0.017%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEPEUSDT: bodySizeRatio=0.09, volumeRatio=0.93
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEPEUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=752)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT] STEP 5: ⭐ Signal generated - LONG
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT]   Entry: 0.0000, TP: 0.0000 (+0.48%), SL: 0.0000 (-0.24%)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT]   ATR: 0.0000 (0.80%), Strength: 37/100
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 2: Filter 1 ✓ (Funding=-0.001%, Spread=0.009%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BONKUSDT: bodySizeRatio=0.30, volumeRatio=0.78
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BONKUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.011%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SHIBUSDT: bodySizeRatio=0.38, volumeRatio=0.44
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SHIBUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOGUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOGUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.061% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.032%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] CATUSDT: bodySizeRatio=0.69, volumeRatio=0.71
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] CATUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=96)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT] STEP 5: ⭐ Signal generated - LONG
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT]   Entry: 0.0000, TP: 0.0000 (+0.28%), SL: 0.0000 (-0.14%)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT]   ATR: 0.0000 (0.47%), Strength: 39/100
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 2: Filter 1 ✓ (Funding=-0.003%, Spread=0.038%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PUMPUSDT: bodySizeRatio=2.35, volumeRatio=0.55
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PUMPUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=4905)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT] STEP 5: ⭐ Signal generated - LONG
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT]   Entry: 0.0026, TP: 0.0026 (+0.78%), SL: 0.0026 (-0.39%)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT]   ATR: 0.0000 (1.30%), Strength: 47/100
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] FLOKIUSDT: bodySizeRatio=0.00, volumeRatio=0.00
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] FLOKIUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEIROUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEIROUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.073% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.041%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] HMSTRUSDT: bodySizeRatio=0.00, volumeRatio=0.00
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] HMSTRUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.028%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BOMEUSDT: bodySizeRatio=0.11, volumeRatio=1.38
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BOMEUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.007%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] DOGEUSDT: bodySizeRatio=0.02, volumeRatio=0.00
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] DOGEUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 2: Filter 1 ✓ (Funding=0.003%, Spread=0.032%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] NOTUSDT: bodySizeRatio=0.65, volumeRatio=0.28
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] NOTUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=174237)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT] STEP 5: ⭐ Signal generated - LONG
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT]   Entry: 0.0006, TP: 0.0006 (+0.64%), SL: 0.0006 (-0.32%)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT]   ATR: 0.0000 (1.06%), Strength: 71/100
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.008%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PENGUUSDT: bodySizeRatio=0.55, volumeRatio=0.38
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PENGUUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURBOUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURBOUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.052% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.026%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEMEUSDT: bodySizeRatio=0.03, volumeRatio=0.11
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEMEUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.014%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] GALAUSDT: bodySizeRatio=0.07, volumeRatio=0.00
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] GALAUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 2: Filter 1 ✓ (Funding=0.011%, Spread=0.028%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.010%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEWUSDT: bodySizeRatio=0.35, volumeRatio=0.41
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEWUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 2: Filter 1 ✓ (Funding=-0.018%, Spread=0.017%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 2: Filter 1 ✓ (Funding=0.006%, Spread=0.019%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GMTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GMTUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.053% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 2: Filter 1 ✓ (Funding=0.009%, Spread=0.009%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEOPLEUSDT: bodySizeRatio=0.39, volumeRatio=0.62
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEOPLEUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 2: Filter 1 ✓ (Funding=-0.004%, Spread=0.013%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKPUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.069% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 2: Filter 1 ✓ (Funding=-0.007%, Spread=0.013%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.036%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] RSRUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] RSRUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] RSRUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] RSRUSDT: bodySizeRatio=0.00, volumeRatio=0.72
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] RSRUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLUAIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLUAIUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.052% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.015%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] LINEAUSDT: bodySizeRatio=0.21, volumeRatio=0.44
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] LINEAUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.047%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ONEUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ONEUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ONEUSDT: Direction=UP, Strength=0.76
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.76)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ONEUSDT: Direction=NEUTRAL → Skip
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 4: Filter 3 FAILED - Momentum state is NEUTRAL, need PULLBACK
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 2: Filter 1 ✓ (Funding=-0.026%, Spread=0.018%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOSTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOSTUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.120% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.074% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.009%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: HH=true, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: Direction=UP, Strength=1.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACHUSDT: bodySizeRatio=0.38, volumeRatio=0.05
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACHUSDT: State=💤 EXHAUSTED, Direction=UP
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 2: Filter 1 ✓ (Funding=0.004%, Spread=0.028%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 2: Filter 1 ✓ (Funding=-0.005%, Spread=0.030%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BREVUSDT: bodySizeRatio=0.16, volumeRatio=0.00
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BREVUSDT: State=💤 EXHAUSTED, Direction=DOWN
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 2: Filter 1 ✓ (Funding=-0.024%, Spread=0.008%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.040%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACTUSDT: Direction=NEUTRAL → Skip
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 4: Filter 3 FAILED - Momentum state is NEUTRAL, need PULLBACK
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [POLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [POLUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.064% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: HH=false, HL=false, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: Direction=NEUTRAL, Strength=0.00
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XPLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XPLUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.063% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLFIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLFIUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.056% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.042%)
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: Analyzing 4 bars...
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: HH=false, HL=true, LH=false, LL=false
01:15:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: Direction=UP, Strength=0.50
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MONUSDT: bodySizeRatio=0.14, volumeRatio=1.03
01:15:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MONUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=582)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT] STEP 5: ⭐ Signal generated - LONG
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT]   Entry: 0.0240, TP: 0.0241 (+0.46%), SL: 0.0240 (-0.23%)
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT]   ATR: 0.0002 (0.76%), Strength: 37/100
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.061% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.052% > 0.050%
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [STABLEUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIPPINUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ADAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOWUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PROMPTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOODUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZAMAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [IPUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BEATUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ATHUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [AIXBTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [OLUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [STRKUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HBARUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RESOLVUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [JCTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SPKUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ENAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CCUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOODENGUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [USELESSUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GLMUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FARTCOINUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BABYUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLDUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUIUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WIFUSDT] STEP 1: Data incomplete - missing: funding, oi
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PARTIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WETUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ARBUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [OPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PNUTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [KAITOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ASTERUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PYTHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DYDXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CRVUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PLUMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MUBARAKUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BIOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XANUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SANDUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [XLMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HOMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOVEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [GRTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIEVERSEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [FILUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [AVNTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WOOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [YGGUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LUNAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SAHARAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOPHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CELOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CFXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MINAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [WCTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BIGTIMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [HUMAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ALGOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [VIRTUALUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZBTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [CROUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MANAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LITUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MAGICUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SKYUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ALLOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONDOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [POPCATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLURUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RAVEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BRETTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZORAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MERLUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LRCUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [2ZUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [RIVERUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEARUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [BATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [STXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURTLEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [MMTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [AEVOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [TIAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SEIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [INITUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [JUPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [OMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZRXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ICXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LIGHTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [LDOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [AXSUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [COREUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SIGNUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [APEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SNXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOTAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [EIGENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [1INCHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUSHIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [SAPIENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZETAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ARKMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [EDENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [ICPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [APTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [IMXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] debug: [ScalpingSignal] [KMNOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:15:30 [ScalpingSignalService] info: ────────────────────────────────────────────────────────────
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] Scan completed: 170 symbols, 26ms
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] Filter results: F1=36, F2=23, F3=5
01:15:30 [ScalpingSignalService] info: [ScalpingSignal] ⭐ 5 signals generated:
01:15:30 [ScalpingSignalService] info: [ScalpingSignal]   NOTUSDT LONG (strength: 71) | Entry: 0.00, TP: 0.00, SL: 0.00
01:15:30 [ScalpingSignalService] info: [ScalpingSignal]   PUMPUSDT LONG (strength: 47) | Entry: 0.00, TP: 0.00, SL: 0.00
01:15:30 [ScalpingSignalService] info: [ScalpingSignal]   CATUSDT LONG (strength: 39) | Entry: 0.00, TP: 0.00, SL: 0.00
01:15:30 [ScalpingSignalService] info: [ScalpingSignal]   MONUSDT LONG (strength: 37) | Entry: 0.02, TP: 0.02, SL: 0.02
01:15:30 [ScalpingSignalService] info: [ScalpingSignal]   PEPEUSDT LONG (strength: 37) | Entry: 0.00, TP: 0.00, SL: 0.00
01:15:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:15:30 [OkxService] debug: [Balance] Available: $85.75
01:15:30 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:30 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:31 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:31 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:32 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:32 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:33 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:33 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:34 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:34 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:35 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:35 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:36 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:36 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:37 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:37 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:38 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:38 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:39 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:39 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:40 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=0/20 (L:0, S:0)
01:15:40 [ScalpingPositionService] info: [ScalpingPosition] 📅 Daily reset:  → 2026-01-13
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Yesterday stats: Trades=0, Wins=0, Losses=0
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [NOTUSDT] 📝 Placing LONG order...
01:15:40 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Position size: margin=$15, leverage=15x, qty=355904.655967
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [NOTUSDT] Creating LIMIT BUY @ 0.0006, qty=355904.6559673065
01:15:40 [OkxService] info: [LEVERAGE] NOTUSDT set to 15x
01:15:40 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:15:40 [OkxService] info: [QTY] NOTUSDT: qty=355904.66 / ctVal=100 = 3559 contracts
01:15:40 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: NOTUSDT (NOT-USDT-SWAP)
Side: BUY
Quantity: 3559
Price: 0.0006322
Body: {"instId":"NOT-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"3559","px":"0.0006322"}
01:15:40 [OkxService] info: [ORDER] ✓ Created successfully: 3215136690908618752
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [NOTUSDT] ✓ Order placed: orderId=3215136690908618752
01:15:40 [OkxService] debug: [Balance] Available: $70.64
01:15:40 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: NOTUSDT LONG
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0006, Qty: 355904.6559673065
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 1
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] 📝 Placing LONG order...
01:15:40 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Position size: margin=$15, leverage=15x, qty=86524.080476
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] Creating LIMIT BUY @ 0.0026, qty=86524.08047563523
01:15:40 [OkxService] info: [LEVERAGE] PUMPUSDT set to 15x
01:15:40 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:15:40 [OkxService] info: [QTY] PUMPUSDT: qty=86524.08 / ctVal=1000 = 86 contracts
01:15:40 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: PUMPUSDT (PUMP-USDT-SWAP)
Side: BUY
Quantity: 86
Price: 0.002600
Body: {"instId":"PUMP-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"86","px":"0.002600"}
01:15:40 [OkxService] info: [ORDER] ✓ Created successfully: 3215136696143110144
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] ✓ Order placed: orderId=3215136696143110144
01:15:40 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: PUMPUSDT LONG
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0026, Qty: 86524.08047563523
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 2
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] 📝 Placing LONG order...
01:15:40 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Position size: margin=$15, leverage=15x, qty=72433358.435899
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] Creating LIMIT BUY @ 0.0000, qty=72433358.43589936
01:15:40 [OkxService] info: [LEVERAGE] CATUSDT set to 15x
01:15:40 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:15:40 [OkxService] info: [QTY] CATUSDT: qty=72433358.44 / ctVal=100000 = 724 contracts
01:15:40 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: CATUSDT (CAT-USDT-SWAP)
Side: BUY
Quantity: 724
Price: 0.000003106
Body: {"instId":"CAT-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"724","px":"0.000003106"}
01:15:40 [OkxService] info: [ORDER] ✓ Created successfully: 3215136700438077440
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] ✓ Order placed: orderId=3215136700438077440
01:15:40 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: CATUSDT LONG
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0000, Qty: 72433358.43589936
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 3
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] 📝 Placing LONG order...
01:15:40 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Position size: margin=$15, leverage=15x, qty=9372.085170
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] Creating LIMIT BUY @ 0.0240, qty=9372.085169939704
01:15:40 [OkxService] info: [LEVERAGE] MONUSDT set to 15x
01:15:40 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:15:40 [OkxService] info: [QTY] MONUSDT: qty=9372.09 / ctVal=10 = 937 contracts
01:15:40 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: MONUSDT (MON-USDT-SWAP)
Side: BUY
Quantity: 937
Price: 0.02401
Body: {"instId":"MON-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"937","px":"0.02401"}
01:15:40 [OkxService] info: [ORDER] ✓ Created successfully: 3215136704867262464
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] ✓ Order placed: orderId=3215136704867262464
01:15:40 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: MONUSDT LONG
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0240, Qty: 9372.085169939704
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 4
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] 📝 Placing LONG order...
01:15:40 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Position size: margin=$15, leverage=15x, qty=37323955.343961
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] Creating LIMIT BUY @ 0.0000, qty=37323955.34396098
01:15:40 [OkxService] info: [LEVERAGE] PEPEUSDT set to 15x
01:15:40 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:15:40 [OkxService] info: [QTY] PEPEUSDT: qty=37323955.34 / ctVal=10000000 = 3.7 contracts
01:15:40 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: PEPEUSDT (PEPE-USDT-SWAP)
Side: BUY
Quantity: 3.7
Price: 0.000006028
Body: {"instId":"PEPE-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"3.7","px":"0.000006028"}
01:15:40 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:40 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:40 [OkxService] info: [ORDER] ✓ Created successfully: 3215136709262893056
01:15:40 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] ✓ Order placed: orderId=3215136709262893056
01:15:40 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: PEPEUSDT LONG
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0000, Qty: 37323955.34396098
01:15:40 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 5
01:15:41 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:41 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:42 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:42 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:43 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:43 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:44 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:44 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:45 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:45 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:46 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:46 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:47 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:47 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:48 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:48 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:49 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:49 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:50 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:15:50 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:15:50 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=0/20 (L:5, S:0)
01:15:50 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:15:50 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:15:50 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:15:50 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:15:50 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:15:50 [PositionSyncService] debug: [DEFENSE] NOTUSDT: Has recent signal (PENDING), allowing
01:15:50 [ScalpingOrderService] info: [ScalpingOrder] [NOTUSDT] ✅ ORDER FILLED @ 0.0006
01:15:50 [OkxService] info: [TP/SL ORDER] Scalping - No reversal: SELL → SELL
01:15:50 [OkxService] info: [TP/SL ORDER] Creating combined TP/SL:
Symbol: NOTUSDT
Side: SELL
TP: 0.0006362
SL: 0.0006302
Order Body: {"instId":"NOT-USDT-SWAP","tdMode":"isolated","side":"sell","posSide":"net","ordType":"conditional","closeFraction":"1","reduceOnly":true,"tpTriggerPx":"0.0006362","tpTriggerPxType":"last","tpOrdPx":"-1","slTriggerPx":"0.0006302","slTriggerPxType":"last","slOrdPx":"-1"}                                                                                                                                  
01:15:50 [OkxService] debug: [Balance] Available: $10.50
01:15:50 [OkxService] info: [TP/SL ORDER] ✓ Created: algoId=3215137025280446464
01:15:50 [ScalpingOrderService] info: [ScalpingOrder] [NOTUSDT] ✅ TP/SL set | TP: 0.0006, SL: 0.0006
01:15:50 [ScalpingPositionService] info: [ScalpingPosition] ➕ Position added: NOTUSDT LONG
01:15:50 [ScalpingPositionService] info: [ScalpingPosition]   Entry: 0.0006, Qty: 3559
01:15:50 [ScalpingPositionService] info: [ScalpingPosition]   TP: 0.0006, SL: 0.0006
01:15:50 [ScalpingPositionService] info: [ScalpingPosition]   Active positions: 1/20
01:15:50 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: NOTUSDT
01:15:50 [ScalpingOrderService] info: [ScalpingOrder] [NOTUSDT] LONG | Elapsed: 0m 0s | PnL: +0.16%
01:15:50 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:50 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:51 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:51 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:52 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:52 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:53 [PositionSyncService] debug: [DUPLICATE_PREVENTION] NOTUSDT was created by OrderService during wait, skipping
01:15:53 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:15:53 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:53 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:54 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:54 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:55 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:55 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:56 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:56 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:57 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:57 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:58 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:58 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:15:59 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:15:59 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:00 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:16:00 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:16:00 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=1/20 (L:5, S:0)
01:16:00 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:16:00 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:16:00 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:16:00 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:16:00 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:16:00 [ScalpingDataService] info: ────────────────────────────────────────────────────────────
01:16:00 [ScalpingDataService] info: [ScalpingData] Starting data collection for 170 symbols...
01:16:00 [ScalpingDataService] debug: [ScalpingData] Collecting funding rates...
01:16:00 [ScalpingDataService] debug: [ScalpingData] Collecting open interest...
01:16:00 [ScalpingDataService] debug: [ScalpingData] Collecting spreads...
01:16:00 [OrderMonitorService] debug: [MONITOR] Syncing with Binance...
01:16:00 [ScalpingDataService] debug: [ScalpingData] Funding: BTCUSDT = 0.0053%
01:16:00 [OkxService] debug: [Balance] Available: $10.50
01:16:00 [OrderMonitorService] debug: [SYNC] Complete | Pending: 0 | Binance LIMIT: 0 | Active positions: 1
01:16:00 [ScalpingDataService] debug: [ScalpingData] Funding: ETHUSDT = 0.0007%
01:16:00 [OkxService] info: [CANCEL ORDER] PEPEUSDT #3215136709262893056 canceled
01:16:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: PEPEUSDT buy @ 0.000006028
01:16:00 [OkxService] debug: [ALGO ORDER] Found 1 open algo orders
01:16:00 [OkxService] info: [CANCEL ORDER] MONUSDT #3215136704867262464 canceled
01:16:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: MONUSDT buy @ 0.02401
01:16:00 [PositionSyncService] warn:
🚨 [TP WATCHDOG] Missing TP detected!
Symbol: NOTUSDT LONG
Entry:  0.0006322
→ Creating emergency TP order at 0.0006...
01:16:00 [OkxService] info: [QTY] NOTUSDT: qty=3559.00 / ctVal=100 = 35 contracts
01:16:00 [OkxService] info: [ALGO ORDER] Manual position - No reversal: SELL → SELL
01:16:00 [OkxService] info: [QTY] NOTUSDT: qty=35.00 / ctVal=100 = 1 contracts
01:16:00 [OkxService] info: [ALGO ORDER] Creating TAKE_PROFIT_MARKET:
Symbol: NOTUSDT
Original Side: SELL
Final Side: SELL (posSide: net)
Trigger Price: undefined
Close Position: false
Order Body: {"instId":"NOT-USDT-SWAP","tdMode":"isolated","side":"sell","posSide":"net","ordType":"conditional","sz":"1","tpTriggerPx":"0.0006362","tpTriggerPxType":"last","tpOrdPx":"-1"}
01:16:00 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] Order canceled
01:16:00 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: PEPEUSDT
01:16:00 [ScalpingDataService] debug: [ScalpingData] Funding: BNBUSDT = 0.0100%
01:16:00 [OkxService] info: [ALGO ORDER] ✓ Created: 3215137366831009792
01:16:00 [OkxService] info: [CANCEL ORDER] CATUSDT #3215136700438077440 canceled
01:16:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: CATUSDT buy @ 0.000003106
01:16:00 [PositionSyncService] info:   ✅ Emergency TP created: 3215137366831009792 @ 0.0006362
01:16:00 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:16:00 [OkxService] info: [CANCEL ORDER] PUMPUSDT #3215136696143110144 canceled
01:16:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: PUMPUSDT buy @ 0.0026
01:16:00 [ScalpingDataService] debug: [ScalpingData] Funding: SOLUSDT = 0.0049%
01:16:00 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:16:00 [PositionSyncService] info: [ORPHAN CLEANUP] ✅ Cleaned up 4 orphan orders
01:16:00 [ScalpingDataService] debug: [ScalpingData] Funding: XRPUSDT = -0.0019%
01:16:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:01 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:01 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:02 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:02 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:03 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:03 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:04 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:04 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:05 [ScalpingDataService] debug: [ScalpingData] ✓ Funding rates updated: 50 symbols
01:16:05 [ScalpingDataService] debug: [ScalpingData] ✓ Open interest updated: 50 symbols
01:16:05 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:05 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:06 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:06 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:07 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:07 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:08 [ScalpingDataService] debug: [ScalpingData] ✓ Spreads updated: 80 symbols
01:16:08 [ScalpingDataService] info: [ScalpingData] ✓ Data collection completed in 8065ms (Funding: 50, OI: 50, Spread: 80)
01:16:08 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:08 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:09 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:09 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:10 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=1/20 (L:4, S:0)
01:16:10 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:16:10 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:16:10 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:16:10 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] 📝 Placing LONG order...
01:16:10 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Position size: margin=$15, leverage=15x, qty=37323955.343961
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] Creating LIMIT BUY @ 0.0000, qty=37323955.34396098
01:16:10 [OkxService] info: [LEVERAGE] PEPEUSDT set to 15x
01:16:10 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:16:10 [OkxService] info: [QTY] PEPEUSDT: qty=37323955.34 / ctVal=10000000 = 3.7 contracts
01:16:10 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: PEPEUSDT (PEPE-USDT-SWAP)
Side: BUY
Quantity: 3.7
Price: 0.000006028
Body: {"instId":"PEPE-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"3.7","px":"0.000006028"}
01:16:10 [OkxService] debug: [Balance] Available: $70.71
01:16:10 [OkxService] info: [ORDER] ✓ Created successfully: 3215137696199401472
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] ✓ Order placed: orderId=3215137696199401472
01:16:10 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: PEPEUSDT LONG
01:16:10 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0000, Qty: 37323955.34396098
01:16:10 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 4
01:16:10 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:16:10 [PositionSyncService] debug: [WATCHDOG] NOTUSDT: SL ✓ TP ✓
01:16:10 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] Order canceled
01:16:10 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: PUMPUSDT
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] Order canceled
01:16:10 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: CATUSDT
01:16:10 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] Order canceled
01:16:10 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: MONUSDT
01:16:10 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:10 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:11 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:11 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:12 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:12 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:16 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:16 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:17 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:17 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:18 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:18 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:19 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:19 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:20 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=1/20 (L:2, S:0)
01:16:20 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] 📝 Placing LONG order...
01:16:20 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Position size: margin=$15, leverage=15x, qty=86524.080476
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] Creating LIMIT BUY @ 0.0026, qty=86524.08047563523
01:16:20 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:20 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:20 [OkxService] info: [LEVERAGE] PUMPUSDT set to 15x
01:16:20 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:16:20 [OkxService] info: [QTY] PUMPUSDT: qty=86524.08 / ctVal=1000 = 86 contracts
01:16:20 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: PUMPUSDT (PUMP-USDT-SWAP)
Side: BUY
Quantity: 86
Price: 0.002600
Body: {"instId":"PUMP-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"86","px":"0.002600"}
01:16:20 [OkxService] info: [ORDER] ✓ Created successfully: 3215138031676612608
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] ✓ Order placed: orderId=3215138031676612608
01:16:20 [OkxService] debug: [Balance] Available: $55.73
01:16:20 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: PUMPUSDT LONG
01:16:20 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0026, Qty: 86524.08047563523
01:16:20 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 2
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] 📝 Placing LONG order...
01:16:20 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Position size: margin=$15, leverage=15x, qty=72433358.435899
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] Creating LIMIT BUY @ 0.0000, qty=72433358.43589936
01:16:20 [OkxService] info: [LEVERAGE] CATUSDT set to 15x
01:16:20 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:16:20 [OkxService] info: [QTY] CATUSDT: qty=72433358.44 / ctVal=100000 = 724 contracts
01:16:20 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: CATUSDT (CAT-USDT-SWAP)
Side: BUY
Quantity: 724
Price: 0.000003106
Body: {"instId":"CAT-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"724","px":"0.000003106"}
01:16:20 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:16:20 [PositionSyncService] debug: [WATCHDOG] NOTUSDT: SL ✓ TP ✓
01:16:20 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:16:20 [OkxService] info: [ORDER] ✓ Created successfully: 3215138036307124224
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] ✓ Order placed: orderId=3215138036307124224
01:16:20 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: CATUSDT LONG
01:16:20 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0000, Qty: 72433358.43589936
01:16:20 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 3
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] 📝 Placing LONG order...
01:16:20 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Position size: margin=$15, leverage=15x, qty=9372.085170
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] Creating LIMIT BUY @ 0.0240, qty=9372.085169939704
01:16:20 [OkxService] info: [LEVERAGE] MONUSDT set to 15x
01:16:20 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:16:20 [OkxService] info: [QTY] MONUSDT: qty=9372.09 / ctVal=10 = 937 contracts
01:16:20 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: MONUSDT (MON-USDT-SWAP)
Side: BUY
Quantity: 937
Price: 0.02401
Body: {"instId":"MON-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"937","px":"0.02401"}
01:16:20 [OkxService] info: [ORDER] ✓ Created successfully: 3215138040232992768
01:16:20 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] ✓ Order placed: orderId=3215138040232992768
01:16:20 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: MONUSDT LONG
01:16:20 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0240, Qty: 9372.085169939704
01:16:20 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 4
01:16:20 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:16:21 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:21 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:22 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:22 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:23 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:23 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:24 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:24 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:25 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:25 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:26 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:26 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:27 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:27 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:28 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:28 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:29 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:29 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:30 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:16:30 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:16:30 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=1/20 (L:5, S:0)
01:16:30 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:16:30 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:16:30 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:16:30 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:16:30 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:16:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] Scanning at 16:16:30
01:16:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.000%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 2: Filter 1 ✓ (Funding=0.001%, Spread=0.000%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.011%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.007%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: Direction=UP, Strength=0.84
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.84)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLUSDT: bodySizeRatio=0.66, volumeRatio=0.55
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 2: Filter 1 ✓ (Funding=-0.002%, Spread=0.005%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SATSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SATSUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.058% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 2: Filter 1 ✓ (Funding=0.008%, Spread=0.017%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEPEUSDT: bodySizeRatio=0.09, volumeRatio=0.93
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEPEUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=752)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT] STEP 5: ⭐ Signal generated - LONG
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT]   Entry: 0.0000, TP: 0.0000 (+0.48%), SL: 0.0000 (-0.24%)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT]   ATR: 0.0000 (0.80%), Strength: 37/100
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 2: Filter 1 ✓ (Funding=-0.001%, Spread=0.009%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BONKUSDT: bodySizeRatio=0.30, volumeRatio=0.78
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BONKUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.011%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SHIBUSDT: bodySizeRatio=0.38, volumeRatio=0.44
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SHIBUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOGUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOGUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.060% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.032%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] CATUSDT: bodySizeRatio=0.69, volumeRatio=0.71
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] CATUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=96)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT] STEP 5: ⭐ Signal generated - LONG
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT]   Entry: 0.0000, TP: 0.0000 (+0.28%), SL: 0.0000 (-0.14%)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT]   ATR: 0.0000 (0.47%), Strength: 39/100
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 2: Filter 1 ✓ (Funding=-0.003%, Spread=0.038%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PUMPUSDT: bodySizeRatio=2.35, volumeRatio=0.55
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PUMPUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=4905)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT] STEP 5: ⭐ Signal generated - LONG
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT]   Entry: 0.0026, TP: 0.0026 (+0.78%), SL: 0.0026 (-0.39%)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT]   ATR: 0.0000 (1.30%), Strength: 57/100
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] FLOKIUSDT: bodySizeRatio=0.00, volumeRatio=0.00
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] FLOKIUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEIROUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEIROUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.073% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.041%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] HMSTRUSDT: bodySizeRatio=0.00, volumeRatio=0.00
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] HMSTRUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.014%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BOMEUSDT: bodySizeRatio=0.11, volumeRatio=1.38
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BOMEUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.007%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] DOGEUSDT: bodySizeRatio=0.02, volumeRatio=0.00
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] DOGEUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 2: Filter 1 ✓ (Funding=0.003%, Spread=0.032%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] NOTUSDT: bodySizeRatio=0.65, volumeRatio=0.28
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] NOTUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=174237)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT] STEP 5: ⭐ Signal generated - LONG
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT]   Entry: 0.0006, TP: 0.0006 (+0.64%), SL: 0.0006 (-0.32%)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT]   ATR: 0.0000 (1.06%), Strength: 81/100
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.008%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PENGUUSDT: bodySizeRatio=0.55, volumeRatio=0.38
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PENGUUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURBOUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURBOUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.052% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.009%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEMEUSDT: bodySizeRatio=0.03, volumeRatio=0.11
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEMEUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.014%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] GALAUSDT: bodySizeRatio=0.07, volumeRatio=0.00
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] GALAUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 2: Filter 1 ✓ (Funding=0.011%, Spread=0.007%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.029%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEWUSDT: bodySizeRatio=0.35, volumeRatio=0.41
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEWUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 2: Filter 1 ✓ (Funding=-0.018%, Spread=0.017%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 2: Filter 1 ✓ (Funding=0.006%, Spread=0.019%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GMTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GMTUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.053% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 2: Filter 1 ✓ (Funding=0.009%, Spread=0.009%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEOPLEUSDT: bodySizeRatio=0.39, volumeRatio=0.62
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEOPLEUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 2: Filter 1 ✓ (Funding=-0.004%, Spread=0.013%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKPUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.069% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 2: Filter 1 ✓ (Funding=-0.007%, Spread=0.013%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.073% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLUAIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLUAIUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.053% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.015%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] LINEAUSDT: bodySizeRatio=0.21, volumeRatio=0.44
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] LINEAUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.094% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 2: Filter 1 ✓ (Funding=-0.026%, Spread=0.018%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOSTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOSTUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.120% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.053% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.009%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: HH=true, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: Direction=UP, Strength=1.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACHUSDT: bodySizeRatio=0.38, volumeRatio=0.05
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACHUSDT: State=💤 EXHAUSTED, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 2: Filter 1 ✓ (Funding=0.004%, Spread=0.028%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 2: Filter 1 ✓ (Funding=-0.005%, Spread=0.030%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BREVUSDT: bodySizeRatio=0.16, volumeRatio=0.00
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BREVUSDT: State=💤 EXHAUSTED, Direction=DOWN
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 2: Filter 1 ✓ (Funding=-0.024%, Spread=0.002%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.040%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACTUSDT: Direction=NEUTRAL → Skip
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 4: Filter 3 FAILED - Momentum state is NEUTRAL, need PULLBACK
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [POLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [POLUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.064% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XPLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XPLUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.063% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLFIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLFIUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.056% > 0.050%
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.042%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MONUSDT: bodySizeRatio=0.14, volumeRatio=1.03
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MONUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=582)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT] STEP 5: ⭐ Signal generated - LONG
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT]   Entry: 0.0241, TP: 0.0242 (+0.46%), SL: 0.0240 (-0.23%)
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT]   ATR: 0.0002 (0.76%), Strength: 47/100
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.023%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLVUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLVUSDT: HH=false, HL=true, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLVUSDT: Direction=UP, Strength=0.50
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLVUSDT: bodySizeRatio=1.36, volumeRatio=0.77
01:16:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLVUSDT: State=🔥 MOMENTUM, Direction=UP
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 4: Filter 3 FAILED - Strong momentum in progress - wait for pullback
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 2: Filter 1 ✓ (Funding=0.006%, Spread=0.013%)
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] RVNUSDT: Analyzing 4 bars...
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] RVNUSDT: HH=false, HL=false, LH=false, LL=false
01:16:30 [TrendAnalyzer] debug: [TrendAnalyzer] RVNUSDT: Direction=NEUTRAL, Strength=0.00
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [STABLEUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIPPINUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ADAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOWUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PROMPTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOODUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZAMAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [IPUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BEATUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ATHUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [AIXBTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [OLUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [STRKUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HBARUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RESOLVUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [JCTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SPKUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ENAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CCUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOODENGUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [USELESSUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GLMUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FARTCOINUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BABYUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLDUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUIUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WIFUSDT] STEP 1: Data incomplete - missing: funding, oi
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PARTIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WETUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ARBUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [OPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PNUTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [KAITOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ASTERUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PYTHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DYDXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CRVUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PLUMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MUBARAKUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BIOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XANUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SANDUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [XLMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HOMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOVEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [GRTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIEVERSEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [FILUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [AVNTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WOOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [YGGUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LUNAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SAHARAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOPHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CELOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CFXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MINAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [WCTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BIGTIMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [HUMAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ALGOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [VIRTUALUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZBTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [CROUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MANAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LITUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MAGICUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SKYUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ALLOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONDOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [POPCATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLURUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RAVEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BRETTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZORAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MERLUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LRCUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [2ZUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [RIVERUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEARUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [BATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [STXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURTLEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [MMTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [AEVOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [TIAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SEIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [INITUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [JUPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [OMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZRXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ICXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LIGHTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [LDOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [AXSUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [COREUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SIGNUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [APEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SNXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOTAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [EIGENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [1INCHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUSHIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [SAPIENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZETAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ARKMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [EDENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [ICPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [APTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [IMXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] debug: [ScalpingSignal] [KMNOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:16:30 [ScalpingSignalService] info: ────────────────────────────────────────────────────────────
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] Scan completed: 170 symbols, 43ms
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] Filter results: F1=36, F2=22, F3=5
01:16:30 [ScalpingSignalService] info: [ScalpingSignal] ⭐ 5 signals generated:
01:16:30 [ScalpingSignalService] info: [ScalpingSignal]   NOTUSDT LONG (strength: 81) | Entry: 0.00, TP: 0.00, SL: 0.00
01:16:30 [ScalpingSignalService] info: [ScalpingSignal]   PUMPUSDT LONG (strength: 57) | Entry: 0.00, TP: 0.00, SL: 0.00
01:16:30 [ScalpingSignalService] info: [ScalpingSignal]   MONUSDT LONG (strength: 47) | Entry: 0.02, TP: 0.02, SL: 0.02
01:16:30 [ScalpingSignalService] info: [ScalpingSignal]   CATUSDT LONG (strength: 39) | Entry: 0.00, TP: 0.00, SL: 0.00
01:16:30 [ScalpingSignalService] info: [ScalpingSignal]   PEPEUSDT LONG (strength: 37) | Entry: 0.00, TP: 0.00, SL: 0.00
01:16:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:16:30 [OkxService] debug: [Balance] Available: $10.50
01:16:30 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:16:30 [PositionSyncService] debug: [WATCHDOG] NOTUSDT: SL ✓ TP ✓
01:16:30 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:16:30 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:30 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:31 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:31 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:32 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:32 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:33 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:33 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:34 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:34 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:35 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:35 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:36 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:36 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:37 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:37 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:38 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:38 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:39 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:39 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:40 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:16:40 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:16:40 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=1/20 (L:5, S:0)
01:16:40 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:16:40 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:16:40 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:16:40 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:16:40 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:16:40 [OkxService] debug: [Balance] Available: $24.53
01:16:40 [OkxService] debug: [ALGO ORDER] Found 1 open algo orders
01:16:40 [PositionSyncService] warn: [WATCHDOG] ⚠️ NOTUSDT: SL missing - tracking started
01:16:40 [PositionSyncService] warn:
🚨 [SL WATCHDOG] Missing SL detected!
Symbol: NOTUSDT LONG
Entry:  0.0006322
→ Creating emergency SL order...
01:16:40 [OkxService] info: [ALGO ORDER] Manual position - No reversal: SELL → SELL
01:16:40 [OkxService] info: [ALGO ORDER] Creating STOP_MARKET:
Symbol: NOTUSDT
Original Side: SELL
Final Side: SELL (posSide: net)
Trigger Price: undefined
Close Position: true
Order Body: {"instId":"NOT-USDT-SWAP","tdMode":"isolated","side":"sell","posSide":"net","ordType":"conditional","closeFraction":"1","reduceOnly":true,"slTriggerPx":"0.0006302","slTriggerPxType":"last","slOrdPx":"-1"}                                                                                                                                                                                                    
01:16:40 [OkxService] error: [ALGO ORDER] OKX API Error: Position doesn't exist.
01:16:40 [OkxService] error: [ALGO ORDER] Error:
01:16:40 [PositionSyncService] error: [SL WATCHDOG] Failed (retry 1/3): OKX algo order error: Position doesn't exist.
01:16:40 [PositionSyncService] warn:
🔔 [POSITION CLOSED DETECTED]
Symbol:     NOTUSDT
Side:       LONG
Entry:      0.00063220
Quantity:   3559.00000000
→ Fetching trade history for PnL...
01:16:40 [OkxService] debug: [RECENT TRADES] NOTUSDT: 15 trades found
01:16:40 [PositionSyncService] info:   ✅ Trades found: 5 fill(s)
┌─────────────────────────────────────────────────────
│ 📊 청산 분석
│   Close Type:     SL 🔴
│   Planned Trigger: 0.0006
│   Actual Close:   0.0006
├─────────────────────────────────────────────────────
│ 📈 슬리피지
│   Exit Slippage:  -0.0000 (-0.058%)
│   Total Slippage: -0.0000
├─────────────────────────────────────────────────────
│ 💰 결과
│   Gross PnL:      $0.00
│   Trading Fee:    -$-0.11 (entry: $0.00, exit: $-0.11)
│   Net PnL:        $0.11 🟢 WIN
│   Holding Time:   1 minutes
└─────────────────────────────────────────────────────
01:16:40 [PositionSyncService] info:   → Cleaning up remaining algo orders for NOTUSDT...
01:16:40 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:40 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:40 [OkxService] debug: [ALGO ORDER] Found 1 open algo orders
01:16:40 [OkxService] info: [CLEANUP] Canceling 1 algo orders for NOTUSDT...
01:16:40 [OkxService] info: [ALGO ORDER] Canceled: 3215137366831009792
01:16:40 [OkxService] info: [CLEANUP] NOTUSDT: 1 canceled, 0 failed
01:16:40 [PositionSyncService] info:   ✅ Cleaned up 1 remaining algo orders
01:16:40 [PositionSyncService] info:   → Position marked as CLOSED in DB
01:16:41 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:41 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:42 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:42 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:43 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:43 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:44 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:44 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:45 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:45 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:46 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:46 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:47 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:47 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:48 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:48 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:49 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:49 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:50 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:16:50 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:16:50 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=1/20 (L:5, S:0)
01:16:50 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:16:50 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:16:50 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:16:50 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:16:50 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:16:50 [PositionSyncService] debug: [DEFENSE] CATUSDT: Has recent signal (PENDING), allowing
01:16:50 [OkxService] debug: [Balance] Available: $24.60
01:16:50 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] ✅ ORDER FILLED @ 0.0000
01:16:50 [OkxService] info: [TP/SL ORDER] Scalping - No reversal: SELL → SELL
01:16:50 [OkxService] info: [TP/SL ORDER] Creating combined TP/SL:
Symbol: CATUSDT
Side: SELL
TP: 0.000003115
SL: 0.000003102
Order Body: {"instId":"CAT-USDT-SWAP","tdMode":"isolated","side":"sell","posSide":"net","ordType":"conditional","closeFraction":"1","reduceOnly":true,"tpTriggerPx":"0.000003115","tpTriggerPxType":"last","tpOrdPx":"-1","slTriggerPx":"0.000003102","slTriggerPxType":"last","slOrdPx":"-1"}                                                                                                                              
01:16:50 [OkxService] info: [TP/SL ORDER] ✓ Created: algoId=3215139042505789440
01:16:50 [ScalpingOrderService] info: [ScalpingOrder] [CATUSDT] ✅ TP/SL set | TP: 0.0000, SL: 0.0000
01:16:50 [ScalpingPositionService] info: [ScalpingPosition] ➕ Position added: CATUSDT LONG
01:16:50 [ScalpingPositionService] info: [ScalpingPosition]   Entry: 0.0000, Qty: 724
01:16:50 [ScalpingPositionService] info: [ScalpingPosition]   TP: 0.0000, SL: 0.0000
01:16:50 [ScalpingPositionService] info: [ScalpingPosition]   Active positions: 2/20
01:16:50 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: CATUSDT
01:16:50 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:50 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:51 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:51 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:52 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:52 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:53 [PositionSyncService] debug: [DUPLICATE_PREVENTION] CATUSDT was created by OrderService during wait, skipping
01:16:53 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:16:53 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:53 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:54 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:54 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:55 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:55 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:56 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:56 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:57 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:57 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:58 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:58 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:16:59 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:16:59 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:00 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:17:00 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:17:00 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=2/20 (L:5, S:0)
01:17:00 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:17:00 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:17:00 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:17:00 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:17:00 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:17:00 [ScalpingDataService] info: ────────────────────────────────────────────────────────────
01:17:00 [ScalpingDataService] info: [ScalpingData] Starting data collection for 170 symbols...
01:17:00 [ScalpingDataService] debug: [ScalpingData] Collecting funding rates...
01:17:00 [ScalpingDataService] debug: [ScalpingData] Collecting open interest...
01:17:00 [ScalpingDataService] debug: [ScalpingData] Collecting spreads...
01:17:00 [OrderMonitorService] debug: [MONITOR] Syncing with Binance...
01:17:00 [ScalpingDataService] debug: [ScalpingData] Funding: BTCUSDT = 0.0052%
01:17:00 [OkxService] debug: [Balance] Available: $24.60
01:17:00 [OrderMonitorService] debug: [SYNC] Complete | Pending: 0 | Binance LIMIT: 0 | Active positions: 1
01:17:00 [ScalpingDataService] debug: [ScalpingData] Funding: ETHUSDT = 0.0007%
01:17:00 [OkxService] debug: [ALGO ORDER] Found 1 open algo orders
01:17:00 [OkxService] info: [CANCEL ORDER] MONUSDT #3215138040232992768 canceled
01:17:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: MONUSDT buy @ 0.02401
01:17:00 [PositionSyncService] warn:
🚨 [TP WATCHDOG] Missing TP detected!
Symbol: CATUSDT LONG
Entry:  0.00000311
→ Creating emergency TP order at 0.0000...
01:17:00 [OkxService] info: [QTY] CATUSDT: qty=724.00 / ctVal=100000 = 1 contracts
01:17:00 [OkxService] info: [ALGO ORDER] Manual position - No reversal: SELL → SELL
01:17:00 [OkxService] info: [QTY] CATUSDT: qty=1.00 / ctVal=100000 = 1 contracts
01:17:00 [OkxService] info: [ALGO ORDER] Creating TAKE_PROFIT_MARKET:
Symbol: CATUSDT
Original Side: SELL
Final Side: SELL (posSide: net)
Trigger Price: undefined
Close Position: false
Order Body: {"instId":"CAT-USDT-SWAP","tdMode":"isolated","side":"sell","posSide":"net","ordType":"conditional","sz":"1","tpTriggerPx":"0.000003120","tpTriggerPxType":"last","tpOrdPx":"-1"}
01:17:00 [OkxService] info: [CANCEL ORDER] PUMPUSDT #3215138031676612608 canceled
01:17:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: PUMPUSDT buy @ 0.0026
01:17:00 [ScalpingDataService] debug: [ScalpingData] Funding: BNBUSDT = 0.0100%
01:17:00 [OkxService] info: [ALGO ORDER] ✓ Created: 3215139379828494336
01:17:00 [PositionSyncService] info:   ✅ Emergency TP created: 3215139379828494336 @ 0.00000312
01:17:00 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:17:00 [OkxService] info: [CANCEL ORDER] PEPEUSDT #3215137696199401472 canceled
01:17:00 [PositionSyncService] info: [ORPHAN CLEANUP] Canceled limit order: PEPEUSDT buy @ 0.000006028
01:17:00 [ScalpingDataService] debug: [ScalpingData] Funding: SOLUSDT = 0.0048%
01:17:00 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:17:00 [PositionSyncService] info: [ORPHAN CLEANUP] ✅ Cleaned up 3 orphan orders
01:17:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:00 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:00 [ScalpingDataService] debug: [ScalpingData] Funding: XRPUSDT = -0.0018%
01:17:01 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:01 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:02 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:02 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:03 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:03 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:04 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:04 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:05 [ScalpingDataService] debug: [ScalpingData] ✓ Funding rates updated: 50 symbols
01:17:05 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:05 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:05 [ScalpingDataService] debug: [ScalpingData] ✓ Open interest updated: 50 symbols
01:17:06 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:06 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:07 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:07 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:08 [ScalpingDataService] debug: [ScalpingData] ✓ Spreads updated: 80 symbols
01:17:08 [ScalpingDataService] info: [ScalpingData] ✓ Data collection completed in 8118ms (Funding: 50, OI: 50, Spread: 80)
01:17:08 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:08 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:09 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:09 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:10 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:17:10 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:17:10 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=2/20 (L:5, S:0)
01:17:10 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:17:10 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:17:10 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:17:10 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:17:10 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:17:10 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] Order canceled
01:17:10 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: PEPEUSDT
01:17:10 [OkxService] debug: [Balance] Available: $69.71
01:17:10 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] Order canceled
01:17:10 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: PUMPUSDT
01:17:10 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:17:10 [PositionSyncService] debug: [WATCHDOG] CATUSDT: SL ✓ TP ✓
01:17:10 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:17:10 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] Order canceled
01:17:10 [ScalpingPositionService] debug: [ScalpingPosition] Pending order removed: MONUSDT
01:17:10 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:10 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:11 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:11 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:12 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:12 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:13 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:13 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:14 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:15 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:15 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:16 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:16 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:17 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:17 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:18 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:18 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:19 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:19 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:20 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=2/20 (L:2, S:0)
01:17:20 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] 📝 Placing LONG order...
01:17:20 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Position size: margin=$15, leverage=15x, qty=86424.376613
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] Creating LIMIT BUY @ 0.0026, qty=86424.3766127406
01:17:20 [OkxService] info: [LEVERAGE] PUMPUSDT set to 15x
01:17:20 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:17:20 [OkxService] info: [QTY] PUMPUSDT: qty=86424.38 / ctVal=1000 = 86 contracts
01:17:20 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: PUMPUSDT (PUMP-USDT-SWAP)
Side: BUY
Quantity: 86
Price: 0.002603
Body: {"instId":"PUMP-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"86","px":"0.002603"}
01:17:20 [OkxService] debug: [Balance] Available: $69.71
01:17:20 [OkxService] info: [ORDER] ✓ Created successfully: 3215140044808314880
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [PUMPUSDT] ✓ Order placed: orderId=3215140044808314880
01:17:20 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: PUMPUSDT LONG
01:17:20 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0026, Qty: 86424.3766127406
01:17:20 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 1
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] 📝 Placing LONG order...
01:17:20 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Position size: margin=$15, leverage=15x, qty=9348.720635
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] Creating LIMIT BUY @ 0.0241, qty=9348.72063500072
01:17:20 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:17:20 [PositionSyncService] debug: [WATCHDOG] CATUSDT: SL ✓ TP ✓
01:17:20 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:17:20 [OkxService] info: [LEVERAGE] MONUSDT set to 15x
01:17:20 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:17:20 [OkxService] info: [QTY] MONUSDT: qty=9348.72 / ctVal=10 = 934 contracts
01:17:20 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: MONUSDT (MON-USDT-SWAP)
Side: BUY
Quantity: 934
Price: 0.02407
Body: {"instId":"MON-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"934","px":"0.02407"}
01:17:20 [OkxService] info: [ORDER] ✓ Created successfully: 3215140049103282176
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [MONUSDT] ✓ Order placed: orderId=3215140049103282176
01:17:20 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: MONUSDT LONG
01:17:20 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0241, Qty: 9348.72063500072
01:17:20 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 2
01:17:20 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] 📝 Placing LONG order...
01:17:20 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Position size: margin=$15, leverage=15x, qty=37299205.941349
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] Creating LIMIT BUY @ 0.0000, qty=37299205.94134907
01:17:20 [OkxService] info: [LEVERAGE] PEPEUSDT set to 15x
01:17:20 [OkxService] info: [ORDER] Entry DIRECT: BUY → BUY
01:17:20 [OkxService] info: [QTY] PEPEUSDT: qty=37299205.94 / ctVal=10000000 = 3.7 contracts
01:17:20 [OkxService] info: [ORDER] Creating LIMIT order:
Symbol: PEPEUSDT (PEPE-USDT-SWAP)
Side: BUY
Quantity: 3.7
Price: 0.000006032
Body: {"instId":"PEPE-USDT-SWAP","tdMode":"isolated","side":"buy","posSide":"net","ordType":"limit","sz":"3.7","px":"0.000006032"}
01:17:20 [OkxService] info: [ORDER] ✓ Created successfully: 3215140053532467200
01:17:20 [ScalpingOrderService] info: [ScalpingOrder] [PEPEUSDT] ✓ Order placed: orderId=3215140053532467200
01:17:20 [ScalpingPositionService] info: [ScalpingPosition] ⏳ Pending order added: PEPEUSDT LONG
01:17:20 [ScalpingPositionService] info: [ScalpingPosition]   Limit price: 0.0000, Qty: 37299205.94134907
01:17:20 [ScalpingPositionService] info: [ScalpingPosition]   Pending orders: 3
01:17:20 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:20 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:21 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:21 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:22 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:22 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:23 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:23 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:24 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:24 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:25 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:25 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:26 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:26 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:27 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:27 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:28 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:28 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:29 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:29 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:30 [ScalpingOrderService] info: ────────────────────────────────────────────────────────────
01:17:30 [ScalpingOrderService] info: [ScalpingOrder] Processing 5 signal(s)...
01:17:30 [ScalpingOrderService] info: [ScalpingOrder] Current: Positions=2/20 (L:5, S:0)
01:17:30 [ScalpingOrderService] debug: [ScalpingOrder] [NOTUSDT] Skip - already has position/order
01:17:30 [ScalpingOrderService] debug: [ScalpingOrder] [PUMPUSDT] Skip - already has position/order
01:17:30 [ScalpingOrderService] debug: [ScalpingOrder] [MONUSDT] Skip - already has position/order
01:17:30 [ScalpingOrderService] debug: [ScalpingOrder] [CATUSDT] Skip - already has position/order
01:17:30 [ScalpingOrderService] debug: [ScalpingOrder] [PEPEUSDT] Skip - already has position/order
01:17:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] Scanning at 16:17:30
01:17:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.000%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BTCUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BTCUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 2: Filter 1 ✓ (Funding=0.001%, Spread=0.000%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ETHUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ETHUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.011%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BNBUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BNBUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.007%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLUSDT: Direction=UP, Strength=0.84
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.84)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLUSDT: bodySizeRatio=0.66, volumeRatio=0.55
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 2: Filter 1 ✓ (Funding=-0.002%, Spread=0.005%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] XRPUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XRPUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SATSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SATSUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.058% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 2: Filter 1 ✓ (Funding=0.008%, Spread=0.017%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEPEUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEPEUSDT: bodySizeRatio=0.09, volumeRatio=0.93
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEPEUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEPEUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=752)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT] STEP 5: ⭐ Signal generated - LONG
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT]   Entry: 0.0000, TP: 0.0000 (+0.48%), SL: 0.0000 (-0.24%)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [PEPEUSDT]   ATR: 0.0000 (0.80%), Strength: 37/100
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 2: Filter 1 ✓ (Funding=-0.001%, Spread=0.009%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BONKUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BONKUSDT: bodySizeRatio=0.30, volumeRatio=0.78
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BONKUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BONKUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.011%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SHIBUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SHIBUSDT: bodySizeRatio=0.38, volumeRatio=0.44
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SHIBUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SHIBUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOGUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOGUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.061% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.032%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] CATUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] CATUSDT: bodySizeRatio=0.69, volumeRatio=0.71
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] CATUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CATUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=96)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT] STEP 5: ⭐ Signal generated - LONG
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT]   Entry: 0.0000, TP: 0.0000 (+0.28%), SL: 0.0000 (-0.14%)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [CATUSDT]   ATR: 0.0000 (0.47%), Strength: 49/100
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 2: Filter 1 ✓ (Funding=-0.003%, Spread=0.038%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PUMPUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PUMPUSDT: bodySizeRatio=2.35, volumeRatio=0.55
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PUMPUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PUMPUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=4905)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT] STEP 5: ⭐ Signal generated - LONG
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT]   Entry: 0.0026, TP: 0.0026 (+0.78%), SL: 0.0026 (-0.39%)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [PUMPUSDT]   ATR: 0.0000 (1.30%), Strength: 57/100
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] FLOKIUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] FLOKIUSDT: bodySizeRatio=0.00, volumeRatio=0.00
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] FLOKIUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOKIUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEIROUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEIROUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.073% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.041%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] HMSTRUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] HMSTRUSDT: bodySizeRatio=0.00, volumeRatio=0.00
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] HMSTRUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HMSTRUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.014%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BOMEUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BOMEUSDT: bodySizeRatio=0.11, volumeRatio=1.38
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BOMEUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BOMEUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.007%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] DOGEUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] DOGEUSDT: bodySizeRatio=0.02, volumeRatio=0.00
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] DOGEUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOGEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 2: Filter 1 ✓ (Funding=0.002%, Spread=0.016%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] NOTUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] NOTUSDT: bodySizeRatio=0.65, volumeRatio=0.28
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] NOTUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NOTUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=174237)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT] STEP 5: ⭐ Signal generated - LONG
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT]   Entry: 0.0006, TP: 0.0006 (+0.64%), SL: 0.0006 (-0.32%)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [NOTUSDT]   ATR: 0.0000 (1.06%), Strength: 81/100
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.008%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PENGUUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PENGUUSDT: bodySizeRatio=0.55, volumeRatio=0.38
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PENGUUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PENGUUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURBOUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURBOUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.052% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.009%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEMEUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEMEUSDT: bodySizeRatio=0.03, volumeRatio=0.11
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEMEUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEMEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.014%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] GALAUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] GALAUSDT: bodySizeRatio=0.07, volumeRatio=0.00
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] GALAUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GALAUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 2: Filter 1 ✓ (Funding=0.011%, Spread=0.007%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] TRUTHUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRUTHUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MEWUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEWUSDT: bodySizeRatio=0.35, volumeRatio=0.41
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MEWUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MEWUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 2: Filter 1 ✓ (Funding=-0.017%, Spread=0.017%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZILUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZILUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 2: Filter 1 ✓ (Funding=0.006%, Spread=0.019%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] CHZUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CHZUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GMTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GMTUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.053% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 2: Filter 1 ✓ (Funding=0.009%, Spread=0.009%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] PEOPLEUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEOPLEUSDT: bodySizeRatio=0.39, volumeRatio=0.62
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] PEOPLEUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PEOPLEUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 2: Filter 1 ✓ (Funding=-0.002%, Spread=0.013%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] JELLYJELLYUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [JELLYJELLYUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKPUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKPUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.069% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 2: Filter 1 ✓ (Funding=-0.007%, Spread=0.013%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ANIMEUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ANIMEUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.037%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RSRUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RSRUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RSRUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] RSRUSDT: bodySizeRatio=0.00, volumeRatio=0.72
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] RSRUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RSRUSDT] STEP 4: Filter 3 FAILED - CVD negative for LONG signal
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLUAIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLUAIUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.053% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.015%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] LINEAUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] LINEAUSDT: bodySizeRatio=0.21, volumeRatio=0.44
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] LINEAUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LINEAUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 2: Filter 1 ✓ (Funding=0.010%, Spread=0.047%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ONEUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ONEUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ONEUSDT: Direction=UP, Strength=0.76
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.76)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ONEUSDT: Direction=NEUTRAL → Skip
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONEUSDT] STEP 4: Filter 3 FAILED - Momentum state is NEUTRAL, need PULLBACK
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 2: Filter 1 ✓ (Funding=-0.024%, Spread=0.018%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] GPSUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GPSUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOSTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOSTUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.060% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 2: Filter 1 ✓ (Funding=0.066%, Spread=0.042%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RLSUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RLSUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RLSUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] RLSUSDT: bodySizeRatio=1.05, volumeRatio=1.37
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] RLSUSDT: State=🔥 MOMENTUM, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RLSUSDT] STEP 4: Filter 3 FAILED - Strong momentum in progress - wait for pullback
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.009%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: HH=true, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACHUSDT: Direction=UP, Strength=1.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=1.00)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACHUSDT: bodySizeRatio=0.38, volumeRatio=0.05
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACHUSDT: State=💤 EXHAUSTED, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACHUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 2: Filter 1 ✓ (Funding=0.004%, Spread=0.028%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ZKUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZKUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 2: Filter 1 ✓ (Funding=-0.003%, Spread=0.030%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] BREVUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BREVUSDT: bodySizeRatio=0.16, volumeRatio=0.00
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] BREVUSDT: State=💤 EXHAUSTED, Direction=DOWN
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BREVUSDT] STEP 4: Filter 3 FAILED - Momentum exhausted
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 2: Filter 1 ✓ (Funding=-0.024%, Spread=0.003%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] NIGHTUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NIGHTUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.040%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] ACTUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] ACTUSDT: Direction=NEUTRAL → Skip
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ACTUSDT] STEP 4: Filter 3 FAILED - Momentum state is NEUTRAL, need PULLBACK
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [POLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [POLUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.064% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.019%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] FOGOUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FOGOUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XPLUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XPLUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.063% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLFIUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLFIUSDT] STEP 2: Filter 1 FAILED - Spread too high: 0.056% > 0.050%
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.042%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] MONUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MONUSDT: bodySizeRatio=0.14, volumeRatio=1.03
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] MONUSDT: State=✅ PULLBACK, Direction=UP → Ready for entry
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MONUSDT] STEP 4: Filter 3 ✓ (Momentum=PULLBACK, CVD=582)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT] STEP 5: ⭐ Signal generated - LONG
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT]   Entry: 0.0240, TP: 0.0241 (+0.46%), SL: 0.0240 (-0.23%)
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] [MONUSDT]   ATR: 0.0002 (0.76%), Strength: 37/100
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 2: Filter 1 ✓ (Funding=0.005%, Spread=0.023%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLVUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLVUSDT: HH=false, HL=true, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] SOLVUSDT: Direction=UP, Strength=0.50
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 3: Filter 2 ✓ (Trend=UP, Strength=0.50)
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLVUSDT: bodySizeRatio=1.36, volumeRatio=0.77
01:17:30 [MomentumAnalyzer] debug: [MomentumAnalyzer] SOLVUSDT: State=🔥 MOMENTUM, Direction=UP
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOLVUSDT] STEP 4: Filter 3 FAILED - Strong momentum in progress - wait for pullback
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 1: Data loaded (5m: 20, 15m: 10)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 2: Filter 1 ✓ (Funding=0.007%, Spread=0.013%)
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RVNUSDT: Analyzing 4 bars...
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RVNUSDT: HH=false, HL=false, LH=false, LL=false
01:17:30 [TrendAnalyzer] debug: [TrendAnalyzer] RVNUSDT: Direction=NEUTRAL, Strength=0.00
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RVNUSDT] STEP 3: Filter 2 FAILED - No clear trend (NEUTRAL)
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [STABLEUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIPPINUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ADAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FLOWUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PROMPTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOODUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZAMAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [IPUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BEATUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ATHUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [AIXBTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [OLUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [STRKUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HBARUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RESOLVUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [JCTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SPKUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ENAUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CCUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOODENGUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [USELESSUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GLMUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONTUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FARTCOINUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BABYUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WLDUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUIUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WIFUSDT] STEP 1: Data incomplete - missing: funding, oi
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PARTIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WETUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ARBUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [OPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PNUTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [KAITOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ASTERUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PYTHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DYDXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CRVUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PLUMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MUBARAKUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BIOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XANUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SANDUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [XLMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HOMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MOVEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [GRTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIEVERSEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [FILUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [AVNTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WOOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [YGGUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LUNAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TRXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SAHARAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SOPHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CELOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CFXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MINAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [WCTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BIGTIMEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [HUMAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ALGOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [VIRTUALUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZBTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [CROUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MANAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LITUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MAGICUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SKYUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ALLOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ONDOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [POPCATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BLURUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RAVEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BRETTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZORAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [DOTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MERLUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LRCUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [2ZUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [RIVERUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [NEARUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [BATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [STXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TURTLEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [MMTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [AEVOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [TIAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SEIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [INITUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [JUPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [OMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZRXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ICXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LIGHTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [LDOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ATUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [PIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [AXSUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [COREUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SIGNUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [APEUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SNXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [IOTAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [EIGENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [1INCHUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SUSHIUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [SAPIENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ZETAUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ARKMUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [EDENUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [ICPUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [APTUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [IMXUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] debug: [ScalpingSignal] [KMNOUSDT] STEP 1: Data incomplete - missing: candles5m, candles15m, funding, oi, spread
01:17:30 [ScalpingSignalService] info: ────────────────────────────────────────────────────────────
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] Scan completed: 170 symbols, 31ms
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] Filter results: F1=39, F2=25, F3=5
01:17:30 [ScalpingSignalService] info: [ScalpingSignal] ⭐ 5 signals generated:
01:17:30 [ScalpingSignalService] info: [ScalpingSignal]   NOTUSDT LONG (strength: 81) | Entry: 0.00, TP: 0.00, SL: 0.00
01:17:30 [ScalpingSignalService] info: [ScalpingSignal]   PUMPUSDT LONG (strength: 57) | Entry: 0.00, TP: 0.00, SL: 0.00
01:17:30 [ScalpingSignalService] info: [ScalpingSignal]   CATUSDT LONG (strength: 49) | Entry: 0.00, TP: 0.00, SL: 0.00
01:17:30 [ScalpingSignalService] info: [ScalpingSignal]   MONUSDT LONG (strength: 37) | Entry: 0.02, TP: 0.02, SL: 0.02
01:17:30 [ScalpingSignalService] info: [ScalpingSignal]   PEPEUSDT LONG (strength: 37) | Entry: 0.00, TP: 0.00, SL: 0.00
01:17:30 [ScalpingSignalService] info: ════════════════════════════════════════════════════════════
01:17:30 [OkxService] debug: [Balance] Available: $24.59
01:17:30 [OkxService] debug: [ALGO ORDER] Found 2 open algo orders
01:17:30 [PositionSyncService] debug: [WATCHDOG] CATUSDT: SL ✓ TP ✓
01:17:30 [PositionSyncService] info: [FLOW-7] PositionSync → Complete | 1 active positions | TP1 Tracked: 0
01:17:30 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:30 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:31 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:31 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
01:17:32 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 15m confirm=0 ts=1768320900000
01:17:32 [OkxWebSocketService] debug: [DEBUG] BTCUSDT 5m confirm=0 ts=1768320900000
