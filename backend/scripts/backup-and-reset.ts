import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DB 백업 및 초기화 스크립트
 * 
 * 1. PostgreSQL DB 백업 (positions, signals 테이블)
 * 2. DB 초기화 (모든 테이블 삭제)
 * 3. Redis 초기화 (모든 키 삭제)
 */

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, '../../backups');
  
  // 백업 디렉토리 생성
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // DB 연결
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'trader',
    password: process.env.DB_PASSWORD || 'secure_password',
    database: process.env.DB_DATABASE || 'trading',
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  // Redis 연결
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });
  console.log('✅ Redis connected');

  try {
    // ============================================
    // 1. DB 백업
    // ============================================
    console.log('\n📦 [1/3] Starting database backup...');
    
    const positions = await dataSource.query('SELECT * FROM positions ORDER BY id');
    const signals = await dataSource.query('SELECT * FROM signals ORDER BY id');

    const backup = {
      timestamp: new Date().toISOString(),
      positions: positions,
      signals: signals,
      counts: {
        positions: positions.length,
        signals: signals.length,
      },
    };

    const backupFile = path.join(backupDir, `scalping_backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved: ${backupFile}`);
    console.log(`   - Positions: ${positions.length}`);
    console.log(`   - Signals: ${signals.length}`);

    // ============================================
    // 2. DB 초기화 (모든 테이블 삭제)
    // ============================================
    console.log('\n🗑️  [2/3] Initializing database (dropping all tables)...');
    
    // 모든 테이블 삭제 (CASCADE로 외래키 제약 조건 자동 삭제)
    const tables = await dataSource.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
    `);

    for (const table of tables) {
      await dataSource.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
      console.log(`   ✓ Dropped table: ${table.tablename}`);
    }
    
    console.log('✅ Database initialized (all tables dropped)');
    console.log('   → Tables will be recreated automatically by TypeORM synchronize');

    // ============================================
    // 3. Redis 초기화
    // ============================================
    console.log('\n🗑️  [3/3] Initializing Redis (flushing all keys)...');
    
    const keysBefore = await redis.dbsize();
    await redis.flushall();
    const keysAfter = await redis.dbsize();
    
    console.log(`✅ Redis initialized`);
    console.log(`   - Keys before: ${keysBefore}`);
    console.log(`   - Keys after: ${keysAfter}`);

    console.log('\n✅ All operations completed successfully!');
    console.log(`📦 Backup file: ${backupFile}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await dataSource.destroy();
    await redis.quit();
    console.log('\n✅ Connections closed');
  }
}

main().catch(console.error);
