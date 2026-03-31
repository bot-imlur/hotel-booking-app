/**
 * Rajmandir Kunj — Weekly Database Backup Worker
 *
 * Triggered by a Cron every Sunday at 02:00 UTC (07:30 IST).
 * Exports all D1 tables as a gapless SQL INSERT dump and stores
 * the file in R2, retaining the last 8 snapshots (≈ 2 months).
 *
 * Bindings required (wrangler.backup.jsonc):
 *   DB            — D1 database (hotel-db)
 *   BACKUP_BUCKET — R2 bucket   (rjk-db-backups)
 */

// ─── Table order matters for FK constraints on restore ───────────────────────
const TABLES = [
  'users',
  'rooms',
  'bookings',
  'booking_rooms',
  'room_day_bookings',
];

const MAX_BACKUPS = 8; // weeks to retain

// ─── Scheduled handler ───────────────────────────────────────────────────────
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBackup(env));
  },

  // Allow manual trigger via HTTP for testing:
  //   curl https://<worker-subdomain>.workers.dev/run-backup
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/run-backup') {
      ctx.waitUntil(runBackup(env));
      return new Response(
        JSON.stringify({ ok: true, message: 'Backup started in background' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.pathname === '/list-backups') {
      const list = await listBackups(env);
      return new Response(JSON.stringify({ ok: true, backups: list }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Rajmandir Kunj Backup Worker\n\nRoutes:\n  GET /run-backup\n  GET /list-backups', {
      status: 200,
    });
  },
};

// ─── Core backup logic ───────────────────────────────────────────────────────
async function runBackup(env) {
  const startedAt = new Date();
  const timestamp = startedAt.toISOString().replace(/[:.]/g, '-').replace('Z', 'Z');
  const filename = `backup-${timestamp}.sql`;

  console.log(`[backup] Starting backup → ${filename}`);

  try {
    const sql = await buildSQLDump(env.DB, startedAt);
    const body = new TextEncoder().encode(sql);

    await env.BACKUP_BUCKET.put(filename, body, {
      httpMetadata: { contentType: 'text/plain; charset=utf-8' },
      customMetadata: {
        database: 'hotel-db',
        tables: TABLES.join(','),
        created_at: startedAt.toISOString(),
        size_bytes: String(body.byteLength),
      },
    });

    console.log(`[backup] ✅ Saved ${filename} (${(body.byteLength / 1024).toFixed(1)} KB)`);

    await pruneOldBackups(env.BACKUP_BUCKET);
  } catch (err) {
    // Log but don't rethrow — we don't want the cron to retry immediately
    console.error(`[backup] ❌ Failed: ${err.message}`, err.stack);
  }
}

// ─── SQL dump builder ────────────────────────────────────────────────────────
async function buildSQLDump(db, startedAt) {
  const lines = [
    `-- ============================================================`,
    `-- Rajmandir Kunj — Database Backup`,
    `-- Generated : ${startedAt.toISOString()}`,
    `-- Tables    : ${TABLES.join(', ')}`,
    `-- ============================================================`,
    '',
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;',
    '',
  ];

  for (const table of TABLES) {
    lines.push(`-- ── Table: ${table} ──────────────────────────────────────────`);

    let rows;
    try {
      const result = await db.prepare(`SELECT * FROM "${table}"`).all();
      rows = result.results;
    } catch (err) {
      lines.push(`-- SKIPPED (${err.message})`);
      lines.push('');
      continue;
    }

    if (rows.length === 0) {
      lines.push(`-- (empty)`);
      lines.push('');
      continue;
    }

    // Build INSERT statements in batches of 500 rows
    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const valuesClauses = batch.map(row => {
        const vals = columns.map(col => sqlValue(row[col]));
        return `(${vals.join(', ')})`;
      });
      lines.push(`INSERT INTO "${table}" (${colList}) VALUES`);
      lines.push(valuesClauses.join(',\n') + ';');
    }

    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('PRAGMA foreign_keys = ON;');
  lines.push('');

  return lines.join('\n');
}

// Safely escape a JavaScript value to a SQL literal
function sqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  // Escape single-quotes by doubling them (standard SQL)
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ─── Retention: keep only MAX_BACKUPS most-recent files ──────────────────────
async function pruneOldBackups(bucket) {
  const all = await listBackups({ BACKUP_BUCKET: bucket });

  if (all.length <= MAX_BACKUPS) {
    console.log(`[backup] Retention OK — ${all.length}/${MAX_BACKUPS} backups stored.`);
    return;
  }

  // Objects are already sorted oldest-first by listBackups()
  const toDelete = all.slice(0, all.length - MAX_BACKUPS);

  for (const obj of toDelete) {
    await bucket.delete(obj.key);
    console.log(`[backup] 🗑  Pruned old backup: ${obj.key}`);
  }
}

async function listBackups(env) {
  const listed = await env.BACKUP_BUCKET.list({ prefix: 'backup-' });
  return listed.objects
    .sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded))
    .map(o => ({
      key: o.key,
      uploaded: o.uploaded,
      size_kb: (o.size / 1024).toFixed(1),
    }));
}
