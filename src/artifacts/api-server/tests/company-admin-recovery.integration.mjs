import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { recoverCompanyAdmin } from '../src/lib/company-admin-recovery.ts';

// Use the driver owned by the existing database package. No production credentials are used.
const { Pool } = createRequire(import.meta.resolve('@workspace/db'))('pg');

test('PostgreSQL recovery is atomic, idempotent, and preserves unrelated data', { skip: !process.env.DATABASE_URL }, async () => {
  assert.notEqual(process.env.REPLIT_DEPLOYMENT, '1', 'Do not run this test in a published app');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const companyId = '00000000-0000-4000-8000-000000000002';
  const memberId = '00000000-0000-4000-8000-000000000003';
  const source = 'qa_preview_owner';
  const config = { companyId, expectedOwnerFingerprint: createHash('md5').update(source).digest('hex'), administratorEmail: 'qa-recovery@example.com' };
  const target = { id: 'qa_published_owner', emailAddresses: [{ emailAddress: config.administratorEmail, verification: { status: 'verified' } }] };
  try {
    // Session-local shadow tables: all DML under test targets these, never real customer records.
    await client.query('CREATE TEMP TABLE organizations (LIKE public.organizations INCLUDING ALL)');
    await client.query('CREATE TEMP TABLE org_members (LIKE public.org_members INCLUDING ALL)');
    await client.query(`INSERT INTO organizations
      (id,name,registration_number,registration_key,license_number,industry,company_size,address_line,city,state,postcode,country,contact_name,contact_email,contact_phone,join_code,created_by_user_id,terms_accepted_at)
      VALUES ($1,'QA Recovery','QA-REG-123','QAREG123','QA-LIC-123','Technology','1-10','123 Test St','Test City','Test State','12345','Malaysia','QA Owner','qa-contact@example.com','+60123456789','QA-RECOVERY',$2,now())`, [companyId, source]);
    await client.query("INSERT INTO org_members (id,org_id,user_id,role) VALUES ($1,$2,$3,'admin')", [memberId, companyId, source]);
    await client.query("INSERT INTO org_members (org_id,user_id,role) VALUES ($1,'qa_employee','member')", [companyId]);
    const beforeCompany = (await client.query('SELECT * FROM organizations')).rows[0];
    const employee = (await client.query("SELECT * FROM org_members WHERE user_id='qa_employee'")).rows[0];

    // A failure after the membership update must not leave a half-transferred administrator.
    const broken = { query: (sql, values) => {
      if (sql.startsWith('UPDATE organizations')) throw new Error('simulated second-update failure');
      return client.query(sql, values);
    } };
    await assert.rejects(() => recoverCompanyAdmin(broken, config, target), /simulated second-update failure/);
    assert.equal((await client.query('SELECT user_id FROM org_members WHERE id=$1', [memberId])).rows[0].user_id, source);
    assert.deepEqual((await client.query('SELECT * FROM organizations')).rows[0], beforeCompany);

    assert.equal(await recoverCompanyAdmin(client, config, target), 'recovered');
    assert.deepEqual((await client.query('SELECT * FROM organizations')).rows[0], { ...beforeCompany, created_by_user_id: target.id });
    assert.deepEqual((await client.query("SELECT * FROM org_members WHERE user_id='qa_employee'")).rows[0], employee);
    assert.equal((await client.query('SELECT user_id FROM org_members WHERE id=$1', [memberId])).rows[0].user_id, target.id);
    assert.equal(await recoverCompanyAdmin(client, config, target), 'already-linked');
    await client.query("UPDATE org_members SET role='member' WHERE id=$1", [memberId]);
    assert.equal(await recoverCompanyAdmin(client, config, target), 'not-reapplied');
    assert.equal((await client.query('SELECT role FROM org_members WHERE id=$1', [memberId])).rows[0].role, 'member');
  } finally {
    client.release();
    await pool.end(); // Temp tables are discarded when this dedicated connection closes.
  }
});
