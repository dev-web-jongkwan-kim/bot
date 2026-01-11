import { Controller, Get, Post, Param, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { OrderService } from '../order/order.service';
import { BinanceService } from '../binance/binance.service';
import { SymbolSelectionService } from '../symbol-selection/symbol-selection.service';

@Controller('api')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    @InjectRepository(Signal)
    private signalRepo: Repository<Signal>,
    private orderService: OrderService,
    private binanceService: BinanceService,
    private symbolSelection: SymbolSelectionService,
  ) {}

  @Get('positions')
  async getPositions() {
    return this.positionRepo.find({ order: { openedAt: 'DESC' } });
  }

  @Get('positions/open')
  async getOpenPositions() {
    try {
      // 바이낸스에서 실제 오픈 포지션 가져오기
      const binancePositions = await this.binanceService.getOpenPositions();

      // 데이터베이스의 오픈 포지션도 가져오기
      const dbPositions = await this.positionRepo.find({
        where: { status: 'OPEN' },
        order: { openedAt: 'DESC' },
      });

      // 바이낸스 실제 포지션 매핑
      const realPositions = binancePositions.map(p => {
        const positionAmt = parseFloat(p.positionAmt);
        const entryPrice = parseFloat(p.entryPrice);
        const markPrice = parseFloat(p.markPrice);
        const unrealizedProfit = parseFloat(p.unRealizedProfit);
        const leverage = parseInt(p.leverage);

        // DB에서 해당 포지션 찾기
        const dbPosition = dbPositions.find(dp => dp.symbol === p.symbol);

        return {
          id: dbPosition?.id || null,
          symbol: p.symbol,
          side: positionAmt > 0 ? 'LONG' : 'SHORT',
          entryPrice: entryPrice,
          currentPrice: markPrice,
          quantity: Math.abs(positionAmt),
          leverage: leverage,
          unrealizedPnl: unrealizedProfit,
          unrealizedPnlPercent: entryPrice > 0
            ? (unrealizedProfit / (Math.abs(positionAmt) * entryPrice / leverage)) * 100
            : 0,
          liquidationPrice: parseFloat(p.liquidationPrice),
          marginType: p.marginType,
          isolatedMargin: parseFloat(p.isolatedMargin || '0'),
          strategy: dbPosition?.strategy || 'MANUAL',
          openedAt: dbPosition?.openedAt || new Date(),
        };
      }).filter(p => Math.abs(parseFloat(p.quantity.toString())) > 0.000001);

      return realPositions;
    } catch (error) {
      this.logger.error('Error fetching open positions from Binance:', error);
      // 에러 시 DB 포지션 반환
      const positions = await this.positionRepo.find({
        where: { status: 'OPEN' },
        order: { openedAt: 'DESC' },
      });

      return positions.map(p => ({
        ...p,
        currentPrice: p.entryPrice,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
      }));
    }
  }

  @Post('positions/:id/close')
  async closePosition(@Param('id') id: string) {
    const positionId = parseInt(id, 10);

    if (isNaN(positionId)) {
      throw new Error('Invalid position ID');
    }

    const position = await this.positionRepo.findOne({ where: { id: positionId } });
    if (!position) {
      throw new Error('Position not found');
    }

    try {
      // 1. 먼저 바이낸스에서 실제 포지션 수량 확인
      const binancePositions = await this.binanceService.getOpenPositions();
      const binancePos = binancePositions.find(p => p.symbol === position.symbol);

      if (!binancePos || Math.abs(parseFloat(binancePos.positionAmt)) < 0.000001) {
        // 바이낸스에 포지션 없음 - DB만 업데이트
        this.logger.warn(`Position ${position.symbol} not found on Binance, updating DB only`);
        position.status = 'CLOSED';
        position.closedAt = new Date();
        position.metadata = {
          ...position.metadata,
          actual: { ...(position.metadata?.actual || {}), closeType: 'MANUAL', exitReason: 'NO_BINANCE_POSITION' },
        };
        await this.positionRepo.save(position);
        return { success: true, pnl: 0, closePrice: 0, message: 'Position already closed on Binance' };
      }

      // 실제 바이낸스 포지션 수량 사용 (TP1이 체결되었을 수 있음)
      const actualQuantity = Math.abs(parseFloat(binancePos.positionAmt));
      const side = position.side === 'LONG' ? 'SELL' : 'BUY';

      this.logger.log(`[MANUAL CLOSE] ${position.symbol} - DB qty: ${position.quantity}, Binance qty: ${actualQuantity}`);

      // 2. 잔여 SL/TP 주문 취소 (먼저 취소해야 청산 주문이 정상 작동)
      try {
        this.logger.log(`[MANUAL CLOSE] Canceling remaining algo orders for ${position.symbol}...`);
        const cleanup = await this.binanceService.cancelAllAlgoOrders(position.symbol);
        if (cleanup.canceled > 0) {
          this.logger.log(`[MANUAL CLOSE] ✓ Canceled ${cleanup.canceled} algo orders`);
        }
      } catch (cleanupError: any) {
        this.logger.warn(`[MANUAL CLOSE] Failed to cancel algo orders: ${cleanupError.message}`);
      }

      // 3. 바이낸스에서 실제 포지션 청산
      const closeOrder = await this.binanceService.createOrder({
        symbol: position.symbol,
        side,
        type: 'MARKET',
        quantity: actualQuantity,  // 실제 바이낸스 수량 사용
        reduceOnly: true,
      });

      // 4. 청산 거래에서 실제 PnL 조회
      const trades = await this.binanceService.getRecentTrades(position.symbol, 10);
      const closeSide = position.side === 'LONG' ? 'SELL' : 'BUY';

      // 방금 실행한 청산 거래 찾기 (가장 최근)
      const closeTrades = trades.filter((t: any) =>
        t.side === closeSide &&
        new Date(t.time).getTime() > Date.now() - 10000  // 10초 이내
      );

      let totalRealizedPnl = 0;
      let totalCommission = 0;
      let avgClosePrice = parseFloat(closeOrder.avgPrice || closeOrder.price || '0');

      if (closeTrades.length > 0) {
        for (const trade of closeTrades) {
          totalRealizedPnl += parseFloat(trade.realizedPnl || '0');
          totalCommission += parseFloat(trade.commission || '0');
        }
        // 가중 평균 청산가 계산
        let weightedPriceSum = 0;
        let totalQty = 0;
        for (const trade of closeTrades) {
          const qty = parseFloat(trade.qty || '0');
          const price = parseFloat(trade.price || '0');
          weightedPriceSum += price * qty;
          totalQty += qty;
        }
        if (totalQty > 0) {
          avgClosePrice = weightedPriceSum / totalQty;
        }
      }

      // 진입 수수료 추정 (taker 0.04%)
      const entryPrice = typeof position.entryPrice === 'string'
        ? parseFloat(position.entryPrice)
        : position.entryPrice;
      const entryCommission = entryPrice * actualQuantity * 0.0004;
      const totalFee = entryCommission + totalCommission;
      const netPnl = totalRealizedPnl - totalFee;

      // 5. DB 업데이트
      position.status = 'CLOSED';
      position.closedAt = new Date();
      position.realizedPnl = netPnl;
      position.quantity = actualQuantity;  // 실제 청산된 수량으로 업데이트
      position.metadata = {
        ...position.metadata,
        closePrice: avgClosePrice,
        manualClose: true,
        actual: {
          ...(position.metadata?.actual || {}),
          exit: avgClosePrice,
          exitTime: new Date().toISOString(),
          closeType: 'MANUAL',
        },
        result: {
          win: netPnl > 0,
          grossPnl: totalRealizedPnl,
          fee: totalFee,
          entryFee: entryCommission,
          exitFee: totalCommission,
          pnl: netPnl,
          pnlPercent: entryPrice > 0
            ? (netPnl / (entryPrice * actualQuantity / (position.leverage || 10))) * 100
            : 0,
        },
      };
      await this.positionRepo.save(position);

      this.logger.log(
        `[MANUAL CLOSE] ✅ ${position.symbol} closed successfully\n` +
        `  Close Price: ${avgClosePrice.toFixed(6)}\n` +
        `  Gross PnL: $${totalRealizedPnl.toFixed(2)}\n` +
        `  Fee: $${totalFee.toFixed(2)}\n` +
        `  Net PnL: $${netPnl.toFixed(2)}`
      );

      return {
        success: true,
        pnl: netPnl,
        grossPnl: totalRealizedPnl,
        fee: totalFee,
        closePrice: avgClosePrice,
        quantity: actualQuantity,
      };
    } catch (error) {
      this.logger.error(`Failed to close position ${positionId}:`, error);
      throw new Error(`Failed to close position: ${error.message}`);
    }
  }

  @Get('signals')
  async getSignals() {
    return this.signalRepo.find({
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  @Get('trades/closed')
  async getClosedTrades() {
    try {
      const closedPositions = await this.positionRepo.find({
        where: { status: 'CLOSED' },
        order: { closedAt: 'DESC' },
        take: 100,
      });

      return closedPositions.map(p => {
        // 수수료 정보 추출 (있으면 사용, 없으면 0)
        const fee = p.metadata?.result?.fee || 0;
        const grossPnl = p.metadata?.result?.grossPnl || parseFloat(String(p.realizedPnl || 0)) + fee;
        const netPnl = parseFloat(String(p.realizedPnl || 0));

        return {
          id: p.id,
          symbol: p.symbol,
          strategy: p.strategy,
          side: p.side,
          entryPrice: parseFloat(String(p.entryPrice)),
          exitPrice: p.metadata?.closePrice || parseFloat(String(p.entryPrice)),
          quantity: parseFloat(String(p.quantity)),
          leverage: p.leverage,
          // ✅ 순수익 (수수료 차감 후) - 바이낸스 표시와 동일
          realizedPnl: netPnl,
          grossPnl: grossPnl,  // 수수료 미포함 손익
          fee: fee,            // 총 수수료
          pnlPercent: p.metadata?.result?.pnlPercent ||
            (p.entryPrice > 0
              ? (netPnl / (parseFloat(String(p.quantity)) * parseFloat(String(p.entryPrice)) / p.leverage)) * 100
              : 0),
          closeType: p.metadata?.actual?.closeType || 'UNKNOWN',
          openedAt: p.openedAt,
          closedAt: p.closedAt,
        };
      });
    } catch (error: any) {
      this.logger.error('Error fetching closed trades:', error);
      throw error;
    }
  }

  @Get('trades/summary')
  async getTradesSummary() {
    try {
      // 전체 종료된 거래 통계
      const totalTrades = await this.positionRepo.count({
        where: { status: 'CLOSED' },
      });

      const wins = await this.positionRepo
        .createQueryBuilder('position')
        .where('position.status = :status', { status: 'CLOSED' })
        .andWhere('position.realizedPnl > 0')
        .getCount();

      const losses = totalTrades - wins;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      const totalPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const totalPnl = parseFloat(totalPnlResult?.totalPnl || '0');

      // 초기 자본 기준 ROI 계산 (바이낸스 잔고 - 총 실현 PnL)
      const accountInfo = await this.binanceService.getAccountInfo();
      const currentBalance = parseFloat(accountInfo.totalWalletBalance || '100');
      const initialCapital = currentBalance - totalPnl;
      const roi = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;

      // 오늘 거래 통계
      const todayTrades = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .getCount();

      const todayWins = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .andWhere('position.realizedPnl > 0')
        .getCount();

      const todayPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const todayPnl = parseFloat(todayPnlResult?.totalPnl || '0');

      return {
        // 전체 통계
        totalTrades,
        wins,
        losses,
        winRate: Number(winRate.toFixed(2)),
        totalPnl: Number(totalPnl.toFixed(2)),
        roi: Number(roi.toFixed(2)),

        // 오늘 통계
        todayTrades,
        todayWins,
        todayLosses: todayTrades - todayWins,
        todayWinRate: todayTrades > 0 ? Number(((todayWins / todayTrades) * 100).toFixed(2)) : 0,
        todayPnl: Number(todayPnl.toFixed(2)),
      };
    } catch (error: any) {
      this.logger.error('Error fetching trades summary:', error);
      throw error;
    }
  }

  @Get('ticker/:symbol')
  async getTicker(@Param('symbol') symbol: string) {
    try {
      const tickerData = await this.binanceService.get24hTicker(symbol);
      // futuresDailyStats returns an object when symbol is provided
      const ticker = Array.isArray(tickerData) ? tickerData[0] : tickerData;

      if (!ticker) {
        throw new Error(`No ticker data found for ${symbol}`);
      }

      return {
        symbol: ticker.symbol,
        lastPrice: parseFloat(ticker.lastPrice),
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        high: parseFloat(ticker.highPrice),
        low: parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
      };
    } catch (error) {
      this.logger.error(`Error fetching ticker for ${symbol}:`, error);
      throw error;
    }
  }

  @Get('account/balance')
  async getAccountBalance() {
    try {
      const accountInfo = await this.binanceService.getAccountInfo();
      return {
        totalWalletBalance: parseFloat(accountInfo.totalWalletBalance || '0'),
        totalUnrealizedProfit: parseFloat(accountInfo.totalUnrealizedProfit || '0'),
        totalMarginBalance: parseFloat(accountInfo.totalMarginBalance || '0'),
        availableBalance: parseFloat(accountInfo.availableBalance || '0'),
        maxWithdrawAmount: parseFloat(accountInfo.maxWithdrawAmount || '0'),
      };
    } catch (error) {
      this.logger.error('Error fetching account balance:', error);
      throw error;
    }
  }

  @Get('binance/symbols')
  async getBinanceSymbols() {
    try {
      // 바이낸스 선물 거래 가능한 모든 USDT 페어 가져오기
      const exchangeInfo = await this.binanceService.getExchangeInfo();

      // USDT 선물만 필터링 (거래 가능한 것만)
      const usdtSymbols = exchangeInfo.symbols
        .filter((s: any) =>
          s.symbol.endsWith('USDT') &&
          s.status === 'TRADING' &&
          s.contractType === 'PERPETUAL'
        )
        .map(s => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
        }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

      return {
        total: usdtSymbols.length,
        symbols: usdtSymbols,
      };
    } catch (error) {
      this.logger.error('Error fetching Binance symbols:', error);
      // 에러 시 기본 목록 반환
      const defaultSymbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
        'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT',
      ].map(symbol => ({
        symbol,
        baseAsset: symbol.replace('USDT', ''),
        quoteAsset: 'USDT',
      }));

      return {
        total: defaultSymbols.length,
        symbols: defaultSymbols,
      };
    }
  }

  @Get('system/status')
  async getSystemStatus() {
    try {
      // 실제 구독 중인 종목 가져오기
      const symbols = this.symbolSelection.getSelectedSymbols();

      // 최근 신호 (최근 24시간)
      const recentSignals = await this.signalRepo
        .createQueryBuilder('signal')
        .where('signal.timestamp > :time', { time: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .orderBy('signal.timestamp', 'DESC')
        .limit(20)
        .getMany();

      // 전략별 신호 카운트 (최근 24시간)
      const signalsByStrategy = await this.signalRepo
        .createQueryBuilder('signal')
        .select('signal.strategy', 'strategy')
        .addSelect('COUNT(*)', 'count')
        .where('signal.timestamp > :time', { time: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .groupBy('signal.strategy')
        .getRawMany();

      return {
        status: 'RUNNING',
        subscribedSymbols: symbols,
        totalStreams: symbols.length * 2, // 5m + 15m
        activeStrategies: ['Smart Money Concepts'],
        recentSignals: recentSignals.map(s => ({
          id: s.id,
          strategy: s.strategy,
          symbol: s.symbol,
          side: s.side,
          score: s.score,
          timestamp: s.timestamp,
        })),
        signalStats: {
          last24h: signalsByStrategy,
          totalLast24h: recentSignals.length,
        },
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error('Error fetching system status:', error);
      throw error;
    }
  }

  @Get('dashboard/metrics')
  async getDashboardMetrics() {
    try {
      // 바이낸스에서 실제 계정 정보 가져오기
      const accountInfo = await this.binanceService.getAccountInfo();

      const totalWalletBalance = parseFloat(accountInfo.totalWalletBalance || '0');
      const totalUnrealizedProfit = parseFloat(accountInfo.totalUnrealizedProfit || '0');
      const totalMarginBalance = parseFloat(accountInfo.totalMarginBalance || '0');
      const availableBalance = parseFloat(accountInfo.availableBalance || '0');

      // 오픈 포지션 수
      const openPositions = await this.binanceService.getOpenPositions();
      const openPositionsCount = openPositions.filter(p => Math.abs(parseFloat(p.positionAmt)) > 0).length;

      // DB에서 오늘 거래 내역 가져오기
      const todayTrades = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .getCount();

      const todayWins = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .andWhere('position.realizedPnl > 0')
        .getCount();

      const dailyPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const totalPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const dailyPnl = parseFloat(dailyPnlResult?.totalPnl || '0');
      const totalPnlDB = parseFloat(totalPnlResult?.totalPnl || '0');

      // 실제 바이낸스 잔고 기준 계산
      const accountBalance = totalWalletBalance;
      const equity = totalMarginBalance;
      const totalPnl = totalPnlDB + totalUnrealizedProfit;

      return {
        // 바이낸스 실제 데이터
        accountBalance: Number(accountBalance.toFixed(2)),
        equity: Number(equity.toFixed(2)),
        availableBalance: Number(availableBalance.toFixed(2)),
        totalUnrealizedProfit: Number(totalUnrealizedProfit.toFixed(2)),

        // 거래 통계
        dailyPnl: Number(dailyPnl.toFixed(2)),
        dailyPnlPercent: accountBalance > 0 ? Number(((dailyPnl / accountBalance) * 100).toFixed(2)) : 0,
        totalPnl: Number(totalPnl.toFixed(2)),
        totalPnlPercent: accountBalance > 0 ? Number(((totalPnl / accountBalance) * 100).toFixed(2)) : 0,

        // 포지션 정보
        openPositions: openPositionsCount,
        todayTrades,
        winRateToday: todayTrades > 0 ? Number(((todayWins / todayTrades) * 100).toFixed(2)) : 0,
      };
    } catch (error) {
      this.logger.error('Error fetching account info from Binance:', error);

      // 에러 시 DB 기반 데이터 반환
      const openPositions = await this.positionRepo.count({
        where: { status: 'OPEN' },
      });

      const todayTrades = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .getCount();

      const todayWins = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .andWhere('position.realizedPnl > 0')
        .getCount();

      const dailyPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('DATE(position.closedAt) = CURRENT_DATE')
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const totalPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const accountBalance = 10000;
      const dailyPnl = parseFloat(dailyPnlResult?.totalPnl || '0');
      const totalPnl = parseFloat(totalPnlResult?.totalPnl || '0');
      const equity = accountBalance + totalPnl;

      return {
        accountBalance,
        equity,
        availableBalance: accountBalance,
        totalUnrealizedProfit: 0,
        dailyPnl,
        dailyPnlPercent: (dailyPnl / accountBalance) * 100,
        totalPnl,
        totalPnlPercent: (totalPnl / accountBalance) * 100,
        openPositions,
        todayTrades,
        winRateToday: todayTrades > 0 ? (todayWins / todayTrades) * 100 : 0,
      };
    }
  }

  @Get('trades/daily-stats')
  async getDailyStats() {
    try {
      // 일별 거래 통계 (최근 30일)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyStats = await this.positionRepo
        .createQueryBuilder('position')
        .select('DATE(position.closedAt)', 'date')
        .addSelect('COUNT(*)', 'trades')
        .addSelect('SUM(CASE WHEN position.realizedPnl > 0 THEN 1 ELSE 0 END)', 'wins')
        .addSelect('SUM(CASE WHEN position.realizedPnl <= 0 THEN 1 ELSE 0 END)', 'losses')
        .addSelect('SUM(position.realizedPnl)', 'pnl')
        .addSelect('AVG(position.realizedPnl)', 'avgPnl')
        .addSelect('MAX(position.realizedPnl)', 'maxWin')
        .addSelect('MIN(position.realizedPnl)', 'maxLoss')
        .where('position.status = :status', { status: 'CLOSED' })
        .andWhere('position.closedAt >= :startDate', { startDate: thirtyDaysAgo })
        .groupBy('DATE(position.closedAt)')
        .orderBy('DATE(position.closedAt)', 'DESC')
        .getRawMany();

      // 각 날짜별 데이터 포맷팅
      return dailyStats.map(day => {
        const trades = parseInt(day.trades) || 0;
        const wins = parseInt(day.wins) || 0;
        const losses = parseInt(day.losses) || 0;
        const pnl = parseFloat(day.pnl) || 0;
        const avgPnl = parseFloat(day.avgPnl) || 0;
        const maxWin = parseFloat(day.maxWin) || 0;
        const maxLoss = parseFloat(day.maxLoss) || 0;
        const winRate = trades > 0 ? (wins / trades) * 100 : 0;

        return {
          date: day.date,
          trades,
          wins,
          losses,
          winRate: Number(winRate.toFixed(1)),
          pnl: Number(pnl.toFixed(2)),
          avgPnl: Number(avgPnl.toFixed(2)),
          maxWin: Number(maxWin.toFixed(2)),
          maxLoss: Number(maxLoss.toFixed(2)),
        };
      });
    } catch (error: any) {
      this.logger.error('Error fetching daily stats:', error);
      throw error;
    }
  }

  @Get('trades/by-date/:date')
  async getTradesByDate(@Param('date') date: string) {
    try {
      // 특정 날짜의 모든 거래 조회
      const trades = await this.positionRepo
        .createQueryBuilder('position')
        .where('DATE(position.closedAt) = :date', { date })
        .andWhere('position.status = :status', { status: 'CLOSED' })
        .orderBy('position.closedAt', 'DESC')
        .getMany();

      return trades.map(p => ({
        id: p.id,
        symbol: p.symbol,
        strategy: p.strategy,
        side: p.side,
        entryPrice: parseFloat(String(p.entryPrice)),
        exitPrice: p.metadata?.closePrice || parseFloat(String(p.entryPrice)),
        quantity: parseFloat(String(p.quantity)),
        leverage: p.leverage,
        realizedPnl: parseFloat(String(p.realizedPnl || 0)),
        pnlPercent: p.entryPrice > 0
          ? (parseFloat(String(p.realizedPnl || 0)) / (parseFloat(String(p.quantity)) * parseFloat(String(p.entryPrice)) / p.leverage)) * 100
          : 0,
        openedAt: p.openedAt,
        closedAt: p.closedAt,
      }));
    } catch (error: any) {
      this.logger.error(`Error fetching trades for date ${date}:`, error);
      throw error;
    }
  }

  @Get('dashboard/equity-curve')
  async getEquityCurve() {
    try {
      // 최근 30일 동안의 일별 잔고 변화 계산
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 각 날짜별로 그날까지의 누적 PnL 계산
      const dailyData = await this.positionRepo
        .createQueryBuilder('position')
        .select('DATE(position.closedAt)', 'date')
        .addSelect('SUM(position.realizedPnl)', 'dailyPnl')
        .where('position.status = :status', { status: 'CLOSED' })
        .andWhere('position.closedAt >= :startDate', { startDate: thirtyDaysAgo })
        .groupBy('DATE(position.closedAt)')
        .orderBy('DATE(position.closedAt)', 'ASC')
        .getRawMany();

      // 시작 잔고 가져오기
      const accountInfo = await this.binanceService.getAccountInfo();
      const currentBalance = parseFloat(accountInfo.totalWalletBalance || '100');

      // 총 실현 PnL
      const totalPnlResult = await this.positionRepo
        .createQueryBuilder('position')
        .select('SUM(position.realizedPnl)', 'totalPnl')
        .where('position.status = :status', { status: 'CLOSED' })
        .getRawOne();

      const totalPnl = parseFloat(totalPnlResult?.totalPnl || '0');
      const initialBalance = currentBalance - totalPnl;

      // 날짜별 데이터 생성 (누적)
      const equityCurve = [];
      let cumulativePnl = 0;
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // 해당 날짜의 PnL 찾기
        const dayData = dailyData.find(d => d.date === dateStr);
        if (dayData) {
          cumulativePnl += parseFloat(dayData.dailyPnl || '0');
        }

        equityCurve.push({
          timestamp: dateStr,
          equity: Number((initialBalance + cumulativePnl).toFixed(2)),
        });
      }

      return equityCurve;
    } catch (error) {
      this.logger.error('Error fetching equity curve:', error);

      // 에러 시 기본 데이터 반환
      const equityCurve = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        equityCurve.push({
          timestamp: date.toISOString().split('T')[0],
          equity: 100,
        });
      }
      return equityCurve;
    }
  }

  /**
   * ✅ 잔여 조건 주문 정리 (고아 SL/TP 주문 취소)
   * 활성 포지션이 없는 심볼의 모든 Algo Order를 취소
   */
  @Post('cleanup/orphan-orders')
  async cleanupOrphanOrders() {
    this.logger.log('Starting orphan orders cleanup...');

    try {
      // 1. 현재 활성 포지션 심볼 목록
      const activePositions = await this.binanceService.getOpenPositions();
      const activeSymbols = new Set(
        activePositions
          .filter(p => Math.abs(parseFloat(p.positionAmt)) > 0.000001)
          .map(p => p.symbol)
      );

      // 2. 모든 열린 Algo Order 조회
      const allAlgoOrders = await this.binanceService.getOpenAlgoOrders();

      // 3. 고아 주문 찾기 (포지션 없는 심볼의 주문)
      const orphanOrders = allAlgoOrders.filter(order => !activeSymbols.has(order.symbol));

      if (orphanOrders.length === 0) {
        this.logger.log('No orphan orders found.');
        return {
          success: true,
          message: 'No orphan orders found',
          canceled: 0,
          activePositions: activeSymbols.size,
        };
      }

      this.logger.log(`Found ${orphanOrders.length} orphan orders to cleanup...`);

      // 4. 고아 주문 취소
      let canceled = 0;
      let failed = 0;
      const results: any[] = [];

      for (const order of orphanOrders) {
        try {
          await this.binanceService.cancelAlgoOrder(order.symbol, order.algoId);
          canceled++;
          results.push({
            symbol: order.symbol,
            algoId: order.algoId,
            type: order.type,
            status: 'canceled',
          });
          this.logger.log(`✓ Canceled ${order.type} for ${order.symbol} (ID: ${order.algoId})`);
        } catch (error: any) {
          failed++;
          results.push({
            symbol: order.symbol,
            algoId: order.algoId,
            type: order.type,
            status: 'failed',
            error: error.message,
          });
          this.logger.warn(`✗ Failed to cancel ${order.type} for ${order.symbol}: ${error.message}`);
        }
      }

      this.logger.log(`Cleanup complete: ${canceled} canceled, ${failed} failed`);

      return {
        success: true,
        message: `Cleanup complete: ${canceled} orders canceled, ${failed} failed`,
        canceled,
        failed,
        activePositions: activeSymbols.size,
        results,
      };
    } catch (error: any) {
      this.logger.error('Cleanup failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
