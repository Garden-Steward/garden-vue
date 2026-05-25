#!/usr/bin/env node
/**
 * Seed script: garden manager assignment + authenticated role permissions.
 *
 * Does two things:
 *   1. Ensures cameron@oufp.org is a manager of every garden.
 *   2. Ensures the Authenticated role has at least the same permissions
 *      on gardens and projects as the Public role.
 *
 * Usage:
 *   API_URL=http://localhost:1337 \
 *   ADMIN_EMAIL=admin@example.com \
 *   ADMIN_PASSWORD=yourpassword \
 *   node scripts/seed-setup.js
 */

const API_URL       = process.env.API_URL       || 'http://localhost:1337';
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CAMERON_EMAIL = 'cameron@oufp.org';

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
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  // ── 1. Authenticate ───────────────────────────────────────────────────────
  console.log(`\nAuthenticating as ${ADMIN_EMAIL} ...`);
  const { jwt } = await req(null, 'POST', '/api/auth/local?populate=role', {
    identifier: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  console.log('OK');

  // ── 2. Look up cameron ────────────────────────────────────────────────────
  console.log(`\nLooking up ${CAMERON_EMAIL} ...`);
  const usersRaw = await req(jwt, 'GET', `/api/users?filters[email][$eq]=${encodeURIComponent(CAMERON_EMAIL)}`);
  const users = Array.isArray(usersRaw) ? usersRaw : (usersRaw?.data ?? []);
  if (users.length === 0) {
    console.error(`ERROR: No user found with email ${CAMERON_EMAIL}. Create the account first.`);
    process.exit(1);
  }
  const cameron = users[0];
  console.log(`Found: id=${cameron.id}  username=${cameron.username}`);

  // ── 3. Get all gardens ────────────────────────────────────────────────────
  console.log('\nFetching all gardens ...');
  const gardensRes = await req(jwt, 'GET', '/api/gardens?populate=managers&pagination[pageSize]=100');
  const gardens = Array.isArray(gardensRes.data) ? gardensRes.data : [];
  console.log(`Found ${gardens.length} garden(s).`);

  // ── 4. Add cameron as manager to any garden that's missing them ───────────
  console.log('\nEnsuring cameron is a manager of all gardens ...');
  for (const garden of gardens) {
    const name = garden.attributes?.name ?? garden.attributes?.title ?? `id=${garden.id}`;
    const existing = garden.attributes?.managers?.data ?? [];
    if (existing.some(m => m.id === cameron.id)) {
      console.log(`  [skip] "${name}" — already a manager`);
      continue;
    }
    const updatedIds = [...existing.map(m => m.id), cameron.id];
    await req(jwt, 'PUT', `/api/gardens/${garden.id}`, { data: { managers: updatedIds } });
    console.log(`  [ok]   "${name}" — cameron added`);
  }

  // ── 5. Sync Authenticated role ≥ Public role permissions ──────────────────
  console.log('\nFetching role list ...');
  let rolesData;
  try {
    rolesData = await req(jwt, 'GET', '/api/users-permissions/roles');
  } catch (e) {
    console.warn('  Could not fetch roles (permissions endpoint may require Strapi admin token).');
    console.warn('  Fix manually: Admin Panel → Settings → Roles → Authenticated');
    console.warn('  Give it at least the same find/findOne as Public for gardens and projects.');
    console.log('\nDone (permissions step skipped).');
    return;
  }

  const roles = rolesData.roles ?? [];
  const publicRole = roles.find(r => r.type === 'public');
  const authRole   = roles.find(r => r.type === 'authenticated');

  if (!publicRole || !authRole) {
    console.warn('  Could not identify public/authenticated roles. Skipping permissions sync.');
    console.log('\nDone (permissions step skipped).');
    return;
  }

  const [publicDetail, authDetail] = await Promise.all([
    req(jwt, 'GET', `/api/users-permissions/roles/${publicRole.id}`),
    req(jwt, 'GET', `/api/users-permissions/roles/${authRole.id}`),
  ]);

  const publicPerms = publicDetail.role?.permissions ?? {};
  // Deep-clone so we can mutate
  const authPerms = JSON.parse(JSON.stringify(authDetail.role?.permissions ?? {}));

  let changed = false;
  for (const [contentType, ctPerms] of Object.entries(publicPerms)) {
    for (const [controller, ctrlPerms] of Object.entries(ctPerms.controllers ?? {})) {
      for (const [action, actionCfg] of Object.entries(ctrlPerms)) {
        if (!actionCfg.enabled) continue;

        authPerms[contentType]                              ??= { controllers: {} };
        authPerms[contentType].controllers                  ??= {};
        authPerms[contentType].controllers[controller]      ??= {};

        if (!authPerms[contentType].controllers[controller][action]?.enabled) {
          authPerms[contentType].controllers[controller][action] = { enabled: true };
          console.log(`  [grant] authenticated ← ${contentType}.${controller}.${action}`);
          changed = true;
        }
      }
    }
  }

  if (changed) {
    await req(jwt, 'PUT', `/api/users-permissions/roles/${authRole.id}`, {
      permissions: authPerms,
    });
    console.log('  Authenticated role updated.');
  } else {
    console.log('  Authenticated already has all public permissions — nothing changed.');
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Unexpected error:', err.message ?? err);
  process.exit(1);
});
