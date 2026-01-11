import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('positions')
@Index(['symbol'])
@Index(['status'])
@Index(['openedAt'])
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 50 })
  strategy: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  timeframe: string; // '5m' or '15m'

  @Column({ type: 'varchar', length: 10 })
  side: string; // 'LONG' or 'SHORT'

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  entryPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quantity: number;

  @Column({ type: 'int' })
  leverage: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  stopLoss: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  takeProfit1: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  takeProfit2: number;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string; // 'OPEN' or 'CLOSED'

  @Column({ type: 'timestamp' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  realizedPnl: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


