import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Order Block 감지 및 진행 이력
 *
 * OB 감지 → 신호 생성 → 체결/무효화 전체 과정 추적
 * 분석 및 전략 최적화에 활용
 */
@Entity('order_block_history')
@Index(['symbol'])
@Index(['status'])
@Index(['detectedAt'])
@Index(['type'])
export class OrderBlockHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 10 })
  timeframe: string; // '5m' or '15m'

  @Column({ type: 'varchar', length: 10 })
  type: string; // 'LONG' or 'SHORT'

  @Column({ type: 'varchar', length: 20 })
  method: string; // 'ORB', 'SWEEP', etc.

  // OB 영역
  @Column({ type: 'decimal', precision: 20, scale: 8 })
  top: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  bottom: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  midpoint: number;

  // OB 감지 시점 지표
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  atr: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  atrPercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  volRatio: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  bodyRatio: number;

  // 트렌드 정보 (감지 시점)
  @Column({ type: 'varchar', length: 20, nullable: true })
  marketRegime: string; // 'UPTREND', 'DOWNTREND', 'SIDEWAYS'

  @Column({ type: 'int', nullable: true })
  barsAboveSMA: number;

  @Column({ type: 'int', nullable: true })
  barsBelowSMA: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  sma50Value: number;

  // 시간 정보
  @Column({ type: 'timestamp' })
  detectedAt: Date;

  @Column({ type: 'int' })
  detectedBarIndex: number;

  @Column({ type: 'timestamp', nullable: true })
  priceMovedAwayAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  signalGeneratedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  invalidatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  filledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date;

  // 상태 정보
  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string; // 'ACTIVE', 'PRICE_MOVED_AWAY', 'SIGNAL_GENERATED', 'FILLED', 'INVALIDATED', 'EXPIRED', 'REJECTED'

  @Column({ type: 'varchar', length: 100, nullable: true })
  invalidationReason: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rejectionReason: string;

  // 연결된 포지션 (체결 시)
  @Column({ type: 'int', nullable: true })
  positionId: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  filledPrice: number;

  // 결과 분석 (체결 후 포지션 종료 시)
  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  realizedPnl: number;

  @Column({ type: 'boolean', nullable: true })
  isWin: boolean;

  // 추가 메타데이터
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
