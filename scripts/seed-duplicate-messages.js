#!/usr/bin/env node
/**
 * Seed script: creates a batch of identical SMS-style task messages so the
 * duplicate-grouping UI feature can be tested locally.
 *
 * Usage:
 *   API_URL=http://localhost:1337 \
 *   ADMIN_EMAIL=admin@example.com \
 *   ADMIN_PASSWORD=yourpassword \
 *   GARDEN_TASK_ID=42 \
 *   DUPLICATE_COUNT=5 \
 *   node scripts/seed-duplicate-messages.js
 *
 * All env vars can also be set in a .env file — this script reads process.env
 * directly (no dotenv dependency required; pipe through `env $(cat .env)` if
 * needed).
 */

const API_URL      = process.env.API_URL      || 'http://localhost:1337';
const EMAIL        = process.env.ADMIN_EMAIL;
const PASSWORD     = process.env.ADMIN_PASSWORD;
const TASK_ID      = process.env.GARDEN_TASK_ID;
const COUNT        = parseInt(process.env.DUPLICATE_COUNT || '5', 10);

// The repeated SMS body to seed
const SMS_BODY = "Chris it's your watering day, can you water?";

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (!TASK_ID) {
    console.error('ERROR: GARDEN_TASK_ID is required.');
    process.exit(1);
  }

  // 1. Authenticate
  console.log(`Authenticating as ${EMAIL} against ${API_URL} ...`);
  const authRes = await fetch(`${API_URL}/api/auth/local?populate=role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  if (!authRes.ok) {
    const text = await authRes.text();
    console.error('Auth failed:', text);
    process.exit(1);
  }
  const { jwt } = await authRes.json();
  console.log('Authenticated.');

  // 2. Create COUNT identical messages on the specified task
  console.log(`\nCreating ${COUNT} duplicate "${SMS_BODY}" messages on task ${TASK_ID} ...`);

  for (let i = 1; i <= COUNT; i++) {
    const res = await fetch(`${API_URL}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          body: SMS_BODY,
          type: 'question',
          garden_task: TASK_ID,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`  [${i}/${COUNT}] FAILED:`, text);
    } else {
      const json = await res.json();
      const id = json?.data?.id ?? '?';
      console.log(`  [${i}/${COUNT}] Created message id=${id}`);
    }

    // Small delay to get distinct createdAt timestamps
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\nDone. Refresh the Task Messages view to see the grouped badge.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
