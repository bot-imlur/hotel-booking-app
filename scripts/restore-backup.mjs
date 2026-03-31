/**
 * Usage:
 *   npm run backup:restore <filename>
 *   npm run backup:restore backup-2026-04-06T02-00-00-000Z.sql
 *
 * Downloads the specified backup from R2 → restore.sql, then executes it
 * against the production D1 database.
 */

import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

const file = process.argv[2];

if (!file) {
  console.error('\n❌  No backup file specified.\n');
  console.error('Usage:');
  console.error('  npm run backup:restore <filename>\n');
  console.error('List available backups with:');
  console.error('  npm run backup:list\n');
  process.exit(1);
}

const localFile = 'restore.sql';

console.log(`\n📥  Downloading ${file} from R2…`);
execSync(
  `npx wrangler r2 object get rjk-db-backups/${file} --file ${localFile}`,
  { stdio: 'inherit' },
);

console.log(`\n🗄  Restoring to production D1…`);
execSync(
  `npx wrangler d1 execute hotel-db --env production --remote --file ${localFile} -y`,
  { stdio: 'inherit' },
);

// Clean up the local sql file
if (existsSync(localFile)) unlinkSync(localFile);

console.log(`\n✅  Restore complete.\n`);
