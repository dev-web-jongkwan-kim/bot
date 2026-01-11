import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('signals')
@Index(['symbol'])
@Index(['timestamp'])
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  strategy: string;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  timeframe: string; // '5m' or '15m'

  @Column({ type: 'varchar', length: 10 })
  side: string; // 'LONG' or 'SHORT'

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  entryPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  stopLoss: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  takeProfit1: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  takeProfit2: number;

  @Column({ type: 'int' })
  leverage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string; // 'PENDING', 'FILLED', 'SKIPPED', 'CANCELED', 'FAILED'

  @CreateDateColumn()
  createdAt: Date;
}


