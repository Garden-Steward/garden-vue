#!/usr/bin/env node
/**
 * Seed script: creates 5 identical SMS-style task messages on a watering task
 * so the duplicate-grouping UI badge can be tested locally.
 *
 * Automatically finds a garden task whose title contains "water" (case-insensitive).
 * No GARDEN_TASK_ID needed.
 *
 * Usage:
 *   API_URL=http://localhost:1337 \
 *   ADMIN_EMAIL=admin@example.com \
 *   ADMIN_PASSWORD=yourpassword \
 *   node scripts/seed-duplicate-messages.js
 */

const API_URL  = process.env.API_URL      || 'http://localhost:1337';
const EMAIL    = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const COUNT    = 5;

const SMS_BODY = "Chris it's your watering day, can you water?";

async function req(jwt, method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  // 1. Authenticate
  console.log(`Authenticating as ${EMAIL} against ${API_URL} ...`);
  const { jwt } = await req(null, 'POST', '/api/auth/local?populate=role', {
    identifier: EMAIL,
    password: PASSWORD,
  });
  console.log('Authenticated.');

  // 2. Find a watering task
  console.log('\nSearching for a task with "water" in the title ...');
  const tasksRes = await req(jwt, 'GET', '/api/garden-tasks?filters[title][$containsi]=water&pagination[pageSize]=1');
  const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];

  if (tasks.length === 0) {
    console.error('ERROR: No garden task found with "water" in the title. Run the main seed first or create a watering task.');
    process.exit(1);
  }

  const task = tasks[0];
  const taskTitle = task.attributes?.title ?? `id=${task.id}`;
  console.log(`Using task: "${taskTitle}" (id=${task.id})`);

  // 3. Create 5 identical messages on that task
  console.log(`\nCreating ${COUNT} duplicate messages ...`);
  for (let i = 1; i <= COUNT; i++) {
    const res = await req(jwt, 'POST', '/api/message', {
      data: {
        body: SMS_BODY,
        type: 'question',
        garden_task: task.id,
      },
    });
    const id = res?.data?.id ?? '?';
    console.log(`  [${i}/${COUNT}] Created message id=${id}`);

    // Small delay so each message gets a distinct createdAt
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\nDone. Refresh the Task Messages view to see the grouped badge.');
}

main().catch(err => {
  console.error('Unexpected error:', err.message ?? err);
  process.exit(1);
});
