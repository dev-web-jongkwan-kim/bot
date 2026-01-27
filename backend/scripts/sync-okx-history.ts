import * as crypto from 'crypto';
import { Client } from 'pg';

const apiKey = process.env.OKX_API_KEY || 'dc1344c8-a01a-480b-bc27-82a164ea8a2e';
const apiSecret = process.env.OKX_SECRET_KEY || '93805805AABA93B1F59DD931F4CF64A9';
const passphrase = process.env.OKX_PASSPHRASE || 'Rlawhdrhks!1';
const baseUrl = 'https://www.okx.com';

function getHeaders(method: string, path: string, body: string = '') {
  const timestamp = new Date().toISOString();
  const preSign = timestamp + method + path + body;
  const signature = crypto.createHmac('sha256', apiSecret).update(preSign).digest('base64');

  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

interface OkxPosition {
  instId: string;
  direction: string;
  openAvgPx: string;
  closeAvgPx: string;
  closeTotalPos: string;
  openMaxPos: string;
  pnl: string;
  realizedPnl: string;
  fee: string;
  lever: string;
  cTime: string;
  uTime: string;
}

async function fetchOkxPositionHistory(): Promise<OkxPosition[]> {
  const allPositions: OkxPosition[] = [];
  let after = '';

  // Paginate through all history
  while (true) {
    const path = `/api/v5/account/positions-history?instType=SWAP&limit=100${after ? `&after=${after}` : ''}`;
    const headers = getHeaders('GET', path);

    const response = await fetch(baseUrl + path, { headers });
    const data = await response.json();

    if (data.code !== '0') {
      console.error('OKX API Error:', data.msg);
      break;
    }

    if (!data.data || data.data.length === 0) {
      break;
    }

    allPositions.push(...data.data);
    console.log(`Fetched ${data.data.length} positions (total: ${allPositions.length})`);

    // Get the last position ID for pagination
    const lastPos = data.data[data.data.length - 1];
    after = lastPos.posId;

    // If less than 100, we've reached the end
    if (data.data.length < 100) {
      break;
    }

    // Rate limit delay
    await new Promise((r) => setTimeout(r, 200));
  }

  return allPositions;
}

async function syncToDatabase(positions: OkxPosition[]) {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'trader',
    password: process.env.DB_PASSWORD || 'secure_password',
    database: process.env.DB_DATABASE || 'trading',
  });

  await client.connect();
  console.log('Connected to database');

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const pos of positions) {
    const symbol = pos.instId.replace('-USDT-SWAP', 'USDT');
    const side = pos.direction.toUpperCase();
    const entryPrice = parseFloat(pos.openAvgPx);
    const quantity = parseFloat(pos.closeTotalPos);
    const leverage = parseInt(pos.lever);
    const realizedPnl = parseFloat(pos.realizedPnl);
    const fee = parseFloat(pos.fee);
    const openedAt = new Date(parseInt(pos.cTime));
    const closedAt = new Date(parseInt(pos.uTime));

    // Check if position exists (by symbol and approximate openedAt time - within 5 minutes)
    const existingQuery = `
      SELECT id, "realizedPnl" FROM positions
      WHERE symbol = $1
      AND side = $2
      AND "openedAt" BETWEEN $3 AND $4
      AND status = 'CLOSED'
    `;
    const timeWindowStart = new Date(openedAt.getTime() - 5 * 60 * 1000);
    const timeWindowEnd = new Date(openedAt.getTime() + 5 * 60 * 1000);

    const existing = await client.query(existingQuery, [symbol, side, timeWindowStart, timeWindowEnd]);

    if (existing.rows.length > 0) {
      // Update if realizedPnl is different
      const dbPnl = parseFloat(existing.rows[0].realizedPnl || '0');
      if (Math.abs(dbPnl - realizedPnl) > 0.01) {
        await client.query(
          `UPDATE positions SET
            "realizedPnl" = $1,
            "closedAt" = $2,
            metadata = jsonb_set(COALESCE(metadata, '{}'), '{fee}', $3::text::jsonb)
          WHERE id = $4`,
          [realizedPnl, closedAt, JSON.stringify(fee), existing.rows[0].id],
        );
        updated++;
        console.log(`Updated: ${symbol} ${side} PnL: ${realizedPnl.toFixed(2)}`);
      } else {
        skipped++;
      }
    } else {
      // Insert new position
      const insertQuery = `
        INSERT INTO positions (
          symbol, strategy, side, "entryPrice", quantity, leverage,
          "stopLoss", "takeProfit1", status, "openedAt", "closedAt", "realizedPnl", metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      await client.query(insertQuery, [
        symbol,
        'SYNC',
        side,
        entryPrice,
        quantity,
        leverage,
        0, // stopLoss unknown
        0, // takeProfit1 unknown
        'CLOSED',
        openedAt,
        closedAt,
        realizedPnl,
        JSON.stringify({ fee, syncedFromOkx: true, grossPnl: parseFloat(pos.pnl) }),
      ]);

      inserted++;
      console.log(`Inserted: ${symbol} ${side} PnL: ${realizedPnl.toFixed(2)}`);
    }
  }

  await client.end();
  console.log('\n=== Sync Complete ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

async function main() {
  console.log('=== OKX Position History Sync ===\n');

  console.log('Fetching position history from OKX...');
  const positions = await fetchOkxPositionHistory();
  console.log(`\nTotal positions fetched: ${positions.length}\n`);

  console.log('Syncing to database...');
  await syncToDatabase(positions);
}

main().catch(console.error);
