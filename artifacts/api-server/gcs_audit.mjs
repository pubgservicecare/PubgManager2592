import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);

const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

// Get GCS credentials without printing the key itself
const raw = execSync(
  `psql "${dbUrl}" -t -A -F '\t' -c "SELECT gcs_bucket_name, gcs_folder_path, gcs_key_json FROM settings LIMIT 1"`,
  { encoding: 'utf8', cwd: '/home/runner/workspace/artifacts/api-server' }
).trim();

const parts = raw.split('\t');
const bucketName = parts[0];
const folderPath = parts[1] || '';
const keyJson   = parts[2] || '';

console.log('BUCKET:', bucketName);
console.log('FOLDER:', folderPath || '(none)');
console.log('KEY_LEN:', keyJson.length);

if (!keyJson || keyJson.length < 10) { console.error('NO KEY'); process.exit(1); }

const { Storage } = require('@google-cloud/storage');
const storage = new Storage({ credentials: JSON.parse(keyJson) });
const bucket  = storage.bucket(bucketName);

const [files] = await bucket.getFiles({ maxResults: 2000 });
console.log('TOTAL_FILES:', files.length);

for (const f of files) {
  const [m] = await f.getMetadata();
  console.log('FILE|' + [
    f.name,
    m.size,
    m.contentType,
    m.timeCreated,
    m.updated
  ].join('|'));
}
