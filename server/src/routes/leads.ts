import { Router, Request, Response } from 'express';
import { Role, LeadStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate, requireRole, getOwnershipFilter } from '../middleware/auth';
import { createLeadSchema, updateLeadSchema } from '../validators/schemas';

const router = Router();

// All lead routes require authentication
router.use(authenticate);

/**
 * GET /api/leads
 * List leads — filtered by ownership for reps, all for managers.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ownershipFilter = getOwnershipFilter(req.user!);
    const { status, search } = req.query;

    const where: any = { ...ownershipFilter };
    if (status && typeof status === 'string') {
      where.status = status as LeadStatus;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { opportunities: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ leads });
  } catch (err) {
    console.error('List leads error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leads/:id
 * Get single lead — returns 403 if rep doesn't own it.
 * Design decision: 403 (not 404) because this is an internal tool
 * where transparency is more appropriate than opacity.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        opportunities: {
          include: {
            _count: { select: { activities: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Ownership check — reps can only see their own leads
    if (req.user!.role === Role.SALES_REP && lead.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to view this lead' });
      return;
    }

    res.json({ lead });
  } catch (err) {
    console.error('Get lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/leads
 * Create a new lead. Reps can only assign to themselves.
 * Managers can assign to any rep.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;

    // Reps can only assign leads to themselves
    let assignedTo = req.user!.userId;
    if (data.assignedTo) {
      if (req.user!.role === Role.SALES_REP && data.assignedTo !== req.user!.userId) {
        res.status(403).json({ error: 'Reps can only assign leads to themselves' });
        return;
      }
      assignedTo = data.assignedTo;
    }

    const lead = await prisma.lead.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        source: data.source,
        notes: data.notes,
        assignedTo,
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ lead });
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/leads/:id
 * Update a lead. Ownership enforced for reps.
 * Only managers can reassign.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Ownership check
    if (req.user!.role === Role.SALES_REP && lead.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to modify this lead' });
      return;
    }

    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;

    // Only managers can reassign
    if (data.assignedTo && req.user!.role !== Role.SALES_MANAGER) {
      res.status(403).json({ error: 'Only managers can reassign leads' });
      return;
    }

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ lead: updated });
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/leads/:id/convert
 * Convert a QUALIFIED lead to a Customer + Opportunity.
 * Business rule: Lead must have status QUALIFIED.
 */
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Ownership check
    if (req.user!.role === Role.SALES_REP && lead.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to convert this lead' });
      return;
    }

    // Business rule: must be QUALIFIED
    if (lead.status !== LeadStatus.QUALIFIED) {
      res.status(409).json({ 
        error: 'Only QUALIFIED leads can be converted',
        currentStatus: lead.status,
      });
      return;
    }

    // Create customer and update lead status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create customer from lead
      const customer = await tx.customer.create({
        data: {
          companyName: lead.companyName,
          leadId: lead.id,
          assignedTo: lead.assignedTo,
        },
      });

      // Create default contact from lead info
      await tx.contact.create({
        data: {
          name: lead.contactName,
          email: lead.contactEmail,
          phone: lead.contactPhone,
          customerId: customer.id,
        },
      });

      // Mark lead as converted
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.CONVERTED },
      });

      return { customer, lead: updatedLead };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Convert lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
