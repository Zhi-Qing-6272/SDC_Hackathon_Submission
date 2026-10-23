import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { parseAdminRecoveryConfig, verifiedRecoveryUser, recoverCompanyAdmin } from '../src/lib/company-admin-recovery.ts';

const companyId = '00000000-0000-4000-8000-000000000001';
const sourceId = 'user_original_preview';
const email = 'owner@example.com';
const target = { id: 'user_verified_published', emailAddresses: [{ emailAddress: email, verification: { status: 'verified' } }] };
const config = { companyId, expectedOwnerFingerprint: createHash('md5').update(sourceId).digest('hex'), administratorEmail: email };
const original = () => ({
  company: { id: companyId, created_by_user_id: sourceId },
  members: [{ id: 'admin-row', org_id: companyId, user_id: sourceId, role: 'admin' },
    { id: 'employee-row', org_id: companyId, user_id: 'employee', role: 'member' }],
  companyDetails: { name: 'Existing company', address: 'Preserve this address' },
  teams: [{ id: 'existing-team' }], training: [{ id: 'existing-training' }],
});

// A transactional fixture that accepts exactly the production statements.
function fixture(initial = original()) {
  let data = structuredClone(initial), snapshot;
  return {
    get data() { return data; },
    async query(sql, values = []) {
      if (sql === 'BEGIN') { snapshot = structuredClone(data); return { rows: [], rowCount: null }; }
      if (sql === 'COMMIT') { snapshot = undefined; return { rows: [], rowCount: null }; }
      if (sql === 'ROLLBACK') { data = snapshot; return { rows: [], rowCount: null }; }
      if (sql.startsWith('SELECT id, created_by_user_id')) return { rows: data.company?.id === values[0] ? [data.company] : [], rowCount: 1 };
      if (sql.startsWith('SELECT org_id, role')) return { rows: data.members.filter(m => m.user_id === values[0]), rowCount: 1 };
      if (sql.startsWith('SELECT id, user_id')) return { rows: data.members.filter(m => m.org_id === values[0] && m.role === 'admin'), rowCount: 1 };
      if (sql.startsWith('SELECT id FROM org_members')) return { rows: data.members.filter(m => m.user_id === values[0]), rowCount: 1 };
      if (sql.startsWith('UPDATE org_members')) {
        const row = data.members.find(m => m.id === values[1] && m.user_id === values[2] && m.org_id === values[3] && m.role === 'admin');
        if (row) row.user_id = values[0];
        return { rows: [], rowCount: row ? 1 : 0 };
      }
      if (sql.startsWith('UPDATE organizations')) {
        const matches = data.company.id === values[1] && data.company.created_by_user_id === values[2];
        if (matches) data.company.created_by_user_id = values[0];
        return { rows: [], rowCount: matches ? 1 : 0 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test('disabled configuration does nothing; malformed configuration fails closed', () => {
  assert.equal(parseAdminRecoveryConfig(undefined), null);
  for (const raw of ['null', '{}', 'invalid', JSON.stringify({ ...config, expectedOwnerFingerprint: 'any' })]) {
    assert.throws(() => parseAdminRecoveryConfig(raw), /invalid-configuration/);
  }
  assert.deepEqual(parseAdminRecoveryConfig(JSON.stringify({ ...config, administratorEmail: ' OWNER@example.com ' })), config);
});

test('only exactly one matching, verified and active Clerk account is eligible', () => {
  assert.equal(verifiedRecoveryUser([target], email).id, target.id);
  for (const users of [[], [target, target], [{ ...target, banned: true }], [{ ...target, locked: true }],
    [{ ...target, emailAddresses: [{ emailAddress: email, verification: { status: 'unverified' } }] }]]) {
    assert.throws(() => verifiedRecoveryUser(users, email), /verified-administrator-not-found/);
  }
  assert.throws(() => verifiedRecoveryUser([target], 'someone-else@example.com'), /verified-administrator-not-found/);
});

test('transfers only the existing admin/owner links, preserving company, employee, team and training data', async () => {
  const db = fixture();
  assert.equal(await recoverCompanyAdmin(db, config, target), 'recovered');
  assert.deepEqual(db.data, { ...original(),
    company: { id: companyId, created_by_user_id: target.id },
    members: [{ ...original().members[0], user_id: target.id }, original().members[1]],
  });
  assert.equal(await recoverCompanyAdmin(db, config, target), 'already-linked');
});

test('a completed recovery never restores subsequently revoked privileges', async () => {
  const db = fixture();
  await recoverCompanyAdmin(db, config, target);
  db.data.members[0].role = 'member';
  assert.equal(await recoverCompanyAdmin(db, config, target), 'not-reapplied');
  assert.equal(db.data.members[0].role, 'member');
  db.data.members.splice(0, 1);
  assert.equal(await recoverCompanyAdmin(db, config, target), 'not-reapplied');
});

test('changed ownership, ambiguous admins, or another membership refuse without modifying records', async () => {
  const cases = [
    { data: { ...original(), company: { id: companyId, created_by_user_id: 'different-owner' } }, code: 'original-owner-changed' },
    { data: { ...original(), members: [...original().members, { id: 'backup', org_id: companyId, user_id: 'backup', role: 'admin' }] }, code: 'administrator-membership-changed' },
    { data: { ...original(), members: [...original().members, { id: 'another', org_id: 'another-company', user_id: target.id, role: 'member' }] }, code: 'target-already-has-membership' },
    { data: { ...original(), company: null }, code: 'company-not-found' },
  ];
  for (const { data, code } of cases) {
    const db = fixture(data);
    await assert.rejects(() => recoverCompanyAdmin(db, config, target), new RegExp(code));
    assert.deepEqual(db.data, data);
  }
});

test('a failure between the two ownership updates rolls back the whole transfer', async () => {
  const db = fixture(), query = db.query.bind(db);
  db.query = async (sql, values) => {
    if (sql.startsWith('UPDATE organizations')) throw new Error('simulated database failure');
    return query(sql, values);
  };
  await assert.rejects(() => recoverCompanyAdmin(db, config, target), /simulated database failure/);
  assert.deepEqual(db.data, original());
});
