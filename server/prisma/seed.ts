import { PrismaClient, Role, LeadStatus, PipelineStage, ActivityType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PipelineIQ database...');

  // Clear existing data in correct order
  await prisma.activity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Users ──────────────────────────────────────────────
  const manager1 = await prisma.user.create({
    data: {
      email: 'manager1@pipelineiq.com',
      password: passwordHash,
      name: 'Sarah Chen',
      role: Role.SALES_MANAGER,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@pipelineiq.com',
      password: passwordHash,
      name: 'David Okafor',
      role: Role.SALES_MANAGER,
    },
  });

  const rep1 = await prisma.user.create({
    data: {
      email: 'rep1@pipelineiq.com',
      password: passwordHash,
      name: 'Alex Rivera',
      role: Role.SALES_REP,
    },
  });

  const rep2 = await prisma.user.create({
    data: {
      email: 'rep2@pipelineiq.com',
      password: passwordHash,
      name: 'Jordan Patel',
      role: Role.SALES_REP,
    },
  });

  const rep3 = await prisma.user.create({
    data: {
      email: 'rep3@pipelineiq.com',
      password: passwordHash,
      name: 'Morgan Kim',
      role: Role.SALES_REP,
    },
  });

  const rep4 = await prisma.user.create({
    data: {
      email: 'rep4@pipelineiq.com',
      password: passwordHash,
      name: 'Taylor Nguyen',
      role: Role.SALES_REP,
    },
  });

  const reps = [rep1, rep2, rep3, rep4];

  // ── Leads ──────────────────────────────────────────────
  const leadsData = [
    // Rep 1 leads
    { companyName: 'Acme Manufacturing', contactName: 'John Doe', contactEmail: 'john@acme.com', contactPhone: '+1-555-0101', source: 'Website', status: LeadStatus.QUALIFIED, assignedTo: rep1.id, notes: 'Enterprise client, interested in bulk pricing' },
    { companyName: 'TechNova Solutions', contactName: 'Emma Wilson', contactEmail: 'emma@technova.io', contactPhone: '+1-555-0102', source: 'LinkedIn', status: LeadStatus.CONTACTED, assignedTo: rep1.id, notes: 'Responded to outreach, scheduling demo' },
    { companyName: 'BrightPath Consulting', contactName: 'Raj Mehta', contactEmail: 'raj@brightpath.co', contactPhone: '+1-555-0103', source: 'Referral', status: LeadStatus.NEW, assignedTo: rep1.id, notes: 'Referred by existing client' },
    { companyName: 'Vertex Dynamics', contactName: 'Lisa Zhang', contactEmail: 'lisa@vertexdyn.com', contactPhone: '+1-555-0104', source: 'Trade Show', status: LeadStatus.QUALIFIED, assignedTo: rep1.id, notes: 'Met at SaaS Connect 2026' },
    { companyName: 'Ironclad Security', contactName: 'Mark Johnson', contactEmail: 'mark@ironclad.sec', contactPhone: '+1-555-0105', source: 'Cold Call', status: LeadStatus.CONVERTED, assignedTo: rep1.id, notes: 'Converted to opportunity' },
    { companyName: 'Solstice Energy', contactName: 'Priya Sharma', contactEmail: 'priya@solstice.energy', contactPhone: '+1-555-0106', source: 'Website', status: LeadStatus.DISQUALIFIED, assignedTo: rep1.id, notes: 'Budget too small for our tier' },

    // Rep 2 leads
    { companyName: 'Atlas Freight', contactName: 'Carlos Mendez', contactEmail: 'carlos@atlasfreight.com', contactPhone: '+1-555-0201', source: 'Referral', status: LeadStatus.QUALIFIED, assignedTo: rep2.id, notes: 'Looking for logistics SaaS' },
    { companyName: 'CloudBridge Analytics', contactName: 'Aisha Benali', contactEmail: 'aisha@cloudbridge.ai', contactPhone: '+1-555-0202', source: 'Website', status: LeadStatus.NEW, assignedTo: rep2.id, notes: 'Downloaded whitepaper' },
    { companyName: 'Pinnacle Health Systems', contactName: 'Dr. Robert Kim', contactEmail: 'rkim@pinnaclehealth.org', contactPhone: '+1-555-0203', source: 'LinkedIn', status: LeadStatus.CONTACTED, assignedTo: rep2.id, notes: 'Healthcare vertical, compliance-sensitive' },
    { companyName: 'Forge Industrial', contactName: 'Mike O\'Brien', contactEmail: 'mobrien@forgeindustrial.com', contactPhone: '+1-555-0204', source: 'Trade Show', status: LeadStatus.QUALIFIED, assignedTo: rep2.id, notes: 'Heavy machinery sector' },
    { companyName: 'NovaPay Financial', contactName: 'Elena Vasquez', contactEmail: 'elena@novapay.com', contactPhone: '+1-555-0205', source: 'Cold Call', status: LeadStatus.CONVERTED, assignedTo: rep2.id, notes: 'Converted - fintech deal' },
    { companyName: 'GreenLeaf Organics', contactName: 'Tom Hardy', contactEmail: 'tom@greenleaf.org', contactPhone: '+1-555-0206', source: 'Website', status: LeadStatus.NEW, assignedTo: rep2.id, notes: 'Organic food distributor' },

    // Rep 3 leads
    { companyName: 'Quantum Robotics', contactName: 'Yuki Tanaka', contactEmail: 'yuki@quantumrobot.jp', contactPhone: '+1-555-0301', source: 'Trade Show', status: LeadStatus.QUALIFIED, assignedTo: rep3.id, notes: 'Japanese market expansion' },
    { companyName: 'Summit Legal Group', contactName: 'Patricia Owens', contactEmail: 'powens@summitlegal.com', contactPhone: '+1-555-0302', source: 'Referral', status: LeadStatus.CONTACTED, assignedTo: rep3.id, notes: 'Legal tech integration needed' },
    { companyName: 'Meridian Aerospace', contactName: 'Col. James Fletcher', contactEmail: 'jfletcher@meridian.aero', contactPhone: '+1-555-0303', source: 'LinkedIn', status: LeadStatus.CONVERTED, assignedTo: rep3.id, notes: 'Defense contractor, long sales cycle' },
    { companyName: 'ClearView Optics', contactName: 'Hannah Lee', contactEmail: 'hlee@clearview.com', contactPhone: '+1-555-0304', source: 'Website', status: LeadStatus.NEW, assignedTo: rep3.id, notes: 'Medical devices sector' },
    { companyName: 'Urban Harvest', contactName: 'Derek Williams', contactEmail: 'derek@urbanharvest.co', contactPhone: '+1-555-0305', source: 'Cold Call', status: LeadStatus.DISQUALIFIED, assignedTo: rep3.id, notes: 'Not a fit - too early stage' },

    // Rep 4 leads
    { companyName: 'Nexus Telecom', contactName: 'Sarah Al-Hassan', contactEmail: 'sarah@nexustelecom.net', contactPhone: '+1-555-0401', source: 'LinkedIn', status: LeadStatus.QUALIFIED, assignedTo: rep4.id, notes: 'Telecom infrastructure deal' },
    { companyName: 'Catalyst Education', contactName: 'Prof. Michael Adams', contactEmail: 'madams@catalyst.edu', contactPhone: '+1-555-0402', source: 'Referral', status: LeadStatus.CONTACTED, assignedTo: rep4.id, notes: 'EdTech platform interest' },
    { companyName: 'Tidewater Logistics', contactName: 'Brian Foster', contactEmail: 'bfoster@tidewater.com', contactPhone: '+1-555-0403', source: 'Trade Show', status: LeadStatus.QUALIFIED, assignedTo: rep4.id, notes: 'Supply chain management' },
    { companyName: 'Redwood Capital', contactName: 'Diana Chen', contactEmail: 'dchen@redwoodcap.com', contactPhone: '+1-555-0404', source: 'Website', status: LeadStatus.NEW, assignedTo: rep4.id, notes: 'Venture capital firm' },
    { companyName: 'BlueStar Hotels', contactName: 'Ahmed Khalil', contactEmail: 'akhalil@bluestar.hotel', contactPhone: '+1-555-0405', source: 'Cold Call', status: LeadStatus.CONVERTED, assignedTo: rep4.id, notes: 'Hospitality chain, 12 properties' },
    { companyName: 'Pacific Biotech', contactName: 'Dr. Karen Wu', contactEmail: 'kwu@pacificbio.com', contactPhone: '+1-555-0406', source: 'Website', status: LeadStatus.NEW, assignedTo: rep4.id, notes: 'Biotech startup, Series B' },
    { companyName: 'Ironworks Construction', contactName: 'Pete Ramirez', contactEmail: 'pete@ironworks.build', contactPhone: '+1-555-0407', source: 'Referral', status: LeadStatus.DISQUALIFIED, assignedTo: rep4.id, notes: 'Project-based, not recurring revenue' },
  ];

  const leads = [];
  for (const data of leadsData) {
    const lead = await prisma.lead.create({ data });
    leads.push(lead);
  }
  console.log(`  ✓ Created ${leads.length} leads`);

  // ── Opportunities (from CONVERTED leads + some from QUALIFIED) ──
  const convertedLeads = leads.filter(l => l.status === LeadStatus.CONVERTED);
  const qualifiedLeads = leads.filter(l => l.status === LeadStatus.QUALIFIED);

  const opportunitiesData = [
    // From converted leads - further along the pipeline
    { title: 'Ironclad Security - Enterprise License', dealValue: 85000, stage: PipelineStage.NEGOTIATION, leadId: convertedLeads[0].id, assignedTo: convertedLeads[0].assignedTo, expectedCloseDate: new Date('2026-10-15'), notes: 'Negotiating 3-year contract' },
    { title: 'NovaPay Financial - Platform Integration', dealValue: 120000, stage: PipelineStage.WON, leadId: convertedLeads[1].id, assignedTo: convertedLeads[1].assignedTo, expectedCloseDate: new Date('2026-08-01'), notes: 'Signed! Implementation starting next month' },
    { title: 'Meridian Aerospace - Defense Suite', dealValue: 340000, stage: PipelineStage.PROPOSAL, leadId: convertedLeads[2].id, assignedTo: convertedLeads[2].assignedTo, expectedCloseDate: new Date('2026-12-30'), notes: 'Proposal submitted to procurement' },
    { title: 'BlueStar Hotels - Chain Management System', dealValue: 95000, stage: PipelineStage.QUALIFIED, leadId: convertedLeads[3].id, assignedTo: convertedLeads[3].assignedTo, expectedCloseDate: new Date('2026-11-20'), notes: 'Budget approved, requirements gathering' },

    // From qualified leads - earlier in pipeline
    { title: 'Acme Manufacturing - Bulk Order System', dealValue: 65000, stage: PipelineStage.CONTACTED, leadId: qualifiedLeads[0].id, assignedTo: qualifiedLeads[0].assignedTo, expectedCloseDate: new Date('2027-01-15'), notes: 'Initial discussions ongoing' },
    { title: 'Vertex Dynamics - Analytics Platform', dealValue: 48000, stage: PipelineStage.QUALIFIED, leadId: qualifiedLeads[1].id, assignedTo: qualifiedLeads[1].assignedTo, expectedCloseDate: new Date('2026-12-01'), notes: 'Technical evaluation phase' },
    { title: 'Atlas Freight - Logistics Dashboard', dealValue: 72000, stage: PipelineStage.PROPOSAL, leadId: qualifiedLeads[2].id, assignedTo: qualifiedLeads[2].assignedTo, expectedCloseDate: new Date('2026-10-30'), notes: 'Sent proposal, awaiting response' },
    { title: 'Forge Industrial - IoT Integration', dealValue: 155000, stage: PipelineStage.NEGOTIATION, leadId: qualifiedLeads[3].id, assignedTo: qualifiedLeads[3].assignedTo, expectedCloseDate: new Date('2026-09-15'), notes: 'Price negotiation in progress' },
    { title: 'Quantum Robotics - Control System', dealValue: 210000, stage: PipelineStage.NEW, leadId: qualifiedLeads[4].id, assignedTo: qualifiedLeads[4].assignedTo, expectedCloseDate: new Date('2027-03-01'), notes: 'Just created from qualified lead' },
    { title: 'Nexus Telecom - Infrastructure Upgrade', dealValue: 180000, stage: PipelineStage.CONTACTED, leadId: qualifiedLeads[5].id, assignedTo: qualifiedLeads[5].assignedTo, expectedCloseDate: new Date('2026-11-30'), notes: 'Second call scheduled' },
    { title: 'Tidewater Logistics - Supply Chain AI', dealValue: 92000, stage: PipelineStage.QUALIFIED, leadId: qualifiedLeads[6].id, assignedTo: qualifiedLeads[6].assignedTo, expectedCloseDate: new Date('2027-02-15'), notes: 'Qualifying requirements' },

    // Some LOST deals for realistic data
    { title: 'Atlas Freight - Phase 2 Expansion', dealValue: 45000, stage: PipelineStage.LOST, leadId: qualifiedLeads[2].id, assignedTo: qualifiedLeads[2].assignedTo, expectedCloseDate: new Date('2026-07-01'), notes: 'Lost to competitor - price sensitivity' },
    { title: 'Nexus Telecom - Pilot Program', dealValue: 25000, stage: PipelineStage.LOST, leadId: qualifiedLeads[5].id, assignedTo: qualifiedLeads[5].assignedTo, expectedCloseDate: new Date('2026-06-15'), notes: 'Budget cut, project shelved' },
  ];

  const opportunities = [];
  for (const data of opportunitiesData) {
    const opp = await prisma.opportunity.create({
      data: {
        ...data,
        dealValue: data.dealValue,
      },
    });
    opportunities.push(opp);
  }
  console.log(`  ✓ Created ${opportunities.length} opportunities`);

  // ── Customers (from WON deals) ──
  const customer1 = await prisma.customer.create({
    data: {
      companyName: 'NovaPay Financial',
      industry: 'Financial Technology',
      website: 'https://novapay.com',
      address: '500 Market St, San Francisco, CA 94105',
      leadId: convertedLeads[1].id,
      assignedTo: convertedLeads[1].assignedTo,
    },
  });

  console.log('  ✓ Created 1 customer');

  // ── Contacts ──
  await prisma.contact.createMany({
    data: [
      { name: 'Elena Vasquez', email: 'elena@novapay.com', phone: '+1-555-0205', jobTitle: 'VP of Engineering', customerId: customer1.id },
      { name: 'James Liu', email: 'jliu@novapay.com', phone: '+1-555-0206', jobTitle: 'CTO', customerId: customer1.id },
      { name: 'Maria Santos', email: 'msantos@novapay.com', phone: '+1-555-0207', jobTitle: 'Product Manager', customerId: customer1.id },
    ],
  });
  console.log('  ✓ Created 3 contacts');

  // ── Activities ──
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const activitiesData = [
    // Activities on opportunities
    { type: ActivityType.CALL, description: 'Initial discovery call with Ironclad Security team', dueDate: yesterday, completed: true, opportunityId: opportunities[0].id, createdBy: rep1.id },
    { type: ActivityType.MEETING, description: 'Contract review meeting with legal', dueDate: today, completed: false, opportunityId: opportunities[0].id, createdBy: rep1.id },
    { type: ActivityType.NOTE, description: 'NovaPay signed! Celebration lunch scheduled for team', dueDate: null, completed: false, opportunityId: opportunities[1].id, createdBy: rep2.id },
    { type: ActivityType.FOLLOW_UP, description: 'Send implementation timeline to Meridian procurement', dueDate: tomorrow, completed: false, opportunityId: opportunities[2].id, createdBy: rep3.id },
    { type: ActivityType.EMAIL, description: 'Sent pricing comparison to BlueStar Hotels CFO', dueDate: yesterday, completed: true, opportunityId: opportunities[3].id, createdBy: rep4.id },
    { type: ActivityType.CALL, description: 'Weekly check-in call with Acme Manufacturing', dueDate: today, completed: false, opportunityId: opportunities[4].id, createdBy: rep1.id },
    { type: ActivityType.MEETING, description: 'Technical deep-dive with Vertex engineering team', dueDate: nextWeek, completed: false, opportunityId: opportunities[5].id, createdBy: rep1.id },
    { type: ActivityType.FOLLOW_UP, description: 'Follow up on Atlas Freight proposal response', dueDate: today, completed: false, opportunityId: opportunities[6].id, createdBy: rep2.id },
    { type: ActivityType.NOTE, description: 'Forge Industrial wants to include IoT sensors in scope', dueDate: null, completed: false, opportunityId: opportunities[7].id, createdBy: rep2.id },
    { type: ActivityType.CALL, description: 'Introductory call with Quantum Robotics CTO', dueDate: tomorrow, completed: false, opportunityId: opportunities[8].id, createdBy: rep3.id },

    // Activities on customer
    { type: ActivityType.MEETING, description: 'Quarterly business review with NovaPay leadership', dueDate: nextWeek, completed: false, customerId: customer1.id, createdBy: rep2.id },
    { type: ActivityType.NOTE, description: 'NovaPay interested in expanding to 3 more regions', dueDate: null, completed: false, customerId: customer1.id, createdBy: rep2.id },
    { type: ActivityType.FOLLOW_UP, description: 'Send updated SLA documentation to NovaPay legal', dueDate: today, completed: false, customerId: customer1.id, createdBy: rep2.id },
  ];

  for (const data of activitiesData) {
    await prisma.activity.create({ data });
  }
  console.log(`  ✓ Created ${activitiesData.length} activities`);

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials (all passwords: password123):');
  console.log('  Managers: manager1@pipelineiq.com, manager2@pipelineiq.com');
  console.log('  Reps:     rep1@pipelineiq.com, rep2@pipelineiq.com, rep3@pipelineiq.com, rep4@pipelineiq.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
