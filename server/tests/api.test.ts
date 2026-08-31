import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';

// ── Helpers ──────────────────────────────────────────────

let managerToken: string;
let rep1Token: string;
let rep2Token: string;
let rep1Id: string;
let rep2Id: string;

// Get tokens for test users (seeded data required)
async function loginAs(email: string): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  return { token: res.body.token, userId: res.body.user?.id };
}

beforeAll(async () => {
  // Login as test users
  const manager = await loginAs('manager1@pipelineiq.com');
  managerToken = manager.token;

  const r1 = await loginAs('rep1@pipelineiq.com');
  rep1Token = r1.token;
  rep1Id = r1.userId;

  const r2 = await loginAs('rep2@pipelineiq.com');
  rep2Token = r2.token;
  rep2Id = r2.userId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── Test 1: Login fails safely with wrong credentials ──────
describe('Authentication', () => {
  it('should return 401 with generic error for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager1@pipelineiq.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    // Must not leak whether the email exists
    expect(res.body).not.toHaveProperty('user');
    expect(res.body).not.toHaveProperty('token');
  });

  it('should return 401 with generic error for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@pipelineiq.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should return token and user on successful login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rep1@pipelineiq.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('name');
    expect(res.body.user).toHaveProperty('role', 'SALES_REP');
    // Must never return password hash
    expect(res.body.user).not.toHaveProperty('password');
  });
});

// ── Test 2 & 3: Rep cannot fetch/modify another rep's lead ──────
describe('Authorization — Ownership Enforcement', () => {
  let rep1LeadId: string;
  let rep2LeadId: string;

  beforeAll(async () => {
    // Find a lead owned by rep1
    const rep1Lead = await prisma.lead.findFirst({ where: { assignedTo: rep1Id } });
    rep1LeadId = rep1Lead!.id;

    // Find a lead owned by rep2
    const rep2Lead = await prisma.lead.findFirst({ where: { assignedTo: rep2Id } });
    rep2LeadId = rep2Lead!.id;
  });

  it('should return 403 when rep tries to fetch another rep\'s lead', async () => {
    const res = await request(app)
      .get(`/api/leads/${rep2LeadId}`)
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('permission');
  });

  it('should return 403 when rep tries to modify another rep\'s lead', async () => {
    const res = await request(app)
      .put(`/api/leads/${rep2LeadId}`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ notes: 'Trying to modify someone else\'s lead' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('permission');
  });

  it('should allow rep to fetch their own lead', async () => {
    const res = await request(app)
      .get(`/api/leads/${rep1LeadId}`)
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.lead).toHaveProperty('id', rep1LeadId);
  });

  it('should allow manager to fetch any rep\'s lead', async () => {
    const res = await request(app)
      .get(`/api/leads/${rep1LeadId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.lead).toHaveProperty('id', rep1LeadId);
  });

  it('rep list should only contain own leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(200);
    const leads = res.body.leads;
    expect(leads.length).toBeGreaterThan(0);
    // Every lead should be assigned to rep1
    leads.forEach((lead: any) => {
      expect(lead.assignedTo).toBe(rep1Id);
    });
  });
});

// ── Test 4: Valid lead creation succeeds ──────
describe('Lead CRUD', () => {
  it('should create a lead with valid data', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({
        companyName: 'Test Corp',
        contactName: 'Jane Test',
        contactEmail: 'jane@testcorp.com',
        contactPhone: '+1-555-9999',
        source: 'Website',
        notes: 'Created by automated test',
      });

    expect(res.status).toBe(201);
    expect(res.body.lead).toHaveProperty('id');
    expect(res.body.lead.companyName).toBe('Test Corp');
    expect(res.body.lead.status).toBe('NEW');
    expect(res.body.lead.assignedTo).toBe(rep1Id);
  });

  // ── Test 5: Lead creation fails with missing/invalid data ──────
  it('should reject lead creation with missing required fields', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({
        // Missing companyName, contactName, contactEmail, source
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('should reject lead creation with invalid email', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({
        companyName: 'Test Corp',
        contactName: 'Jane Test',
        contactEmail: 'not-an-email',
        source: 'Website',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

// ── Test 6: Invalid pipeline stage transition is rejected with 409 ──────
describe('Pipeline State Machine', () => {
  let testOpportunityId: string;

  beforeAll(async () => {
    // Find an opportunity in NEW stage
    const opp = await prisma.opportunity.findFirst({
      where: { stage: 'NEW', assignedTo: rep1Id },
    });

    if (!opp) {
      // If no NEW opportunity for rep1, find any opportunity for rep1
      // and use that
      const anyOpp = await prisma.opportunity.findFirst({
        where: { assignedTo: rep1Id },
      });
      testOpportunityId = anyOpp!.id;
    } else {
      testOpportunityId = opp.id;
    }
  });

  it('should reject skipping stages (NEW → PROPOSAL)', async () => {
    // First, get an opportunity in NEW stage
    const newOpp = await prisma.opportunity.findFirst({
      where: { stage: 'NEW' },
    });

    if (!newOpp) {
      // Create one for testing
      const lead = await prisma.lead.findFirst({ where: { assignedTo: rep1Id } });
      const created = await prisma.opportunity.create({
        data: {
          title: 'Test Skip Stage',
          dealValue: 10000,
          stage: 'NEW',
          leadId: lead!.id,
          assignedTo: rep1Id,
        },
      });
      testOpportunityId = created.id;
    } else {
      testOpportunityId = newOpp.id;
    }

    // Find the assigned user's token
    const opp = await prisma.opportunity.findUnique({ where: { id: testOpportunityId } });
    const token = opp!.assignedTo === rep1Id ? rep1Token : 
                  opp!.assignedTo === rep2Id ? rep2Token : managerToken;

    const res = await request(app)
      .put(`/api/opportunities/${testOpportunityId}/stage`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stage: 'PROPOSAL' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Invalid stage transition');
    expect(res.body).toHaveProperty('allowedTransitions');
  });

  it('should allow valid forward transition (NEW → CONTACTED)', async () => {
    // Find or create a NEW opportunity assigned to rep1
    let opp = await prisma.opportunity.findFirst({
      where: { stage: 'NEW', assignedTo: rep1Id },
    });
    
    if (!opp) {
      const lead = await prisma.lead.findFirst({ where: { assignedTo: rep1Id } });
      opp = await prisma.opportunity.create({
        data: {
          title: 'Test Valid Transition',
          dealValue: 15000,
          stage: 'NEW',
          leadId: lead!.id,
          assignedTo: rep1Id,
        },
      });
    }

    const res = await request(app)
      .put(`/api/opportunities/${opp.id}/stage`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ stage: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.opportunity.stage).toBe('CONTACTED');
  });

  it('should reject transition from terminal stage (WON → any)', async () => {
    const wonOpp = await prisma.opportunity.findFirst({ where: { stage: 'WON' } });
    if (!wonOpp) return; // Skip if no WON opportunity in seed data

    const res = await request(app)
      .put(`/api/opportunities/${wonOpp.id}/stage`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ stage: 'NEGOTIATION' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('terminal stage');
  });
});

// ── Test 7 (bonus): Dashboard aggregation correctness ──────
describe('Dashboard Aggregation', () => {
  it('should return correct metric structure', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    const { metrics } = res.body;
    expect(metrics).toHaveProperty('totalLeads');
    expect(metrics).toHaveProperty('totalOpportunities');
    expect(metrics).toHaveProperty('openOpportunities');
    expect(metrics).toHaveProperty('wonCount');
    expect(metrics).toHaveProperty('lostCount');
    expect(metrics).toHaveProperty('pipelineValue');
    expect(metrics).toHaveProperty('wonValue');
    expect(metrics).toHaveProperty('conversionRate');
    expect(metrics).toHaveProperty('followUpsDueToday');

    // Verify mathematical correctness
    expect(metrics.totalLeads).toBeGreaterThanOrEqual(25);
    expect(metrics.openOpportunities + metrics.wonCount + metrics.lostCount)
      .toBeLessThanOrEqual(metrics.totalOpportunities + 5); // Allow for test-created opps
    expect(metrics.pipelineValue).toBeGreaterThan(0);
    expect(metrics.conversionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.conversionRate).toBeLessThanOrEqual(100);
  });

  it('rep dashboard should only include own data', async () => {
    const managerRes = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${managerToken}`);

    const repRes = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${rep1Token}`);

    // Rep should see fewer leads than manager (who sees all)
    expect(repRes.body.metrics.totalLeads).toBeLessThan(managerRes.body.metrics.totalLeads);
  });
});

// ── Unauthenticated access ──────
describe('Unauthenticated Access', () => {
  it('should reject requests without token', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });
});
