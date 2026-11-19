import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.AI_USAGE_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'ai-usage-')), 'usage.json');
const { getUsage, recordLimitError, recordResponse } = await import('./usage.js');

test('usage suma tokens, lee cabeceras y corrige con el error de límite diario', () => {
  const before = getUsage().tokensToday;
  recordResponse(
    'openai/gpt-oss-120b',
    new Headers({
      'x-ratelimit-limit-requests': '1000',
      'x-ratelimit-remaining-requests': '970',
      'x-ratelimit-reset-requests': '43m12s',
      'x-ratelimit-limit-tokens': '8000',
      'x-ratelimit-remaining-tokens': '7923',
    }),
    77
  );
  const u = getUsage();
  assert.equal(u.tokensToday, before + 77);
  assert.deepEqual(u.requests, { limit: 1000, remaining: 970, resetIn: '43m12s' });
  assert.deepEqual(u.tokensPerMinute, { limit: 8000, remaining: 7923 });

  recordLimitError('Rate limit reached ... on tokens per day (TPD): Limit 200000, Used 199500, Requested 1900.');
  assert.equal(getUsage().dailyTokenLimit, 200000);
  assert.equal(getUsage().tokensToday, 199500);
  assert.equal(getUsage().lastLimitError, 'TPD');
});
