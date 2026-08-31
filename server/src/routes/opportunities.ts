import { Router, Request, Response } from 'express';
import { Role, PipelineStage } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate, getOwnershipFilter } from '../middleware/auth';
import { createOpportunitySchema, updateOpportunitySchema, stageTransitionSchema } from '../validators/schemas';
import { isValidTransition, STAGES_REQUIRING_DEAL_VALUE, isTerminalStage, ALLOWED_TRANSITIONS } from '../utils/pipeline';

const router = Router();
router.use(authenticate);

/**
 * GET /api/opportunities
 * List opportunities — filtered by ownership for reps.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ownershipFilter = getOwnershipFilter(req.user!);
    const { stage, search } = req.query;

    const where: any = { ...ownershipFilter };
    if (stage && typeof stage === 'string') {
      where.stage = stage as PipelineStage;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { lead: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        lead: { select: { id: true, companyName: true, contactName: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ opportunities });
  } catch (err) {
    console.error('List opportunities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/opportunities/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: {
        lead: { select: { id: true, companyName: true, contactName: true, contactEmail: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        activities: {
          include: {
            creator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && opportunity.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to view this opportunity' });
      return;
    }

    res.json({ opportunity });
  } catch (err) {
    console.error('Get opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/opportunities
 * Create opportunity — lead must exist and be owned by user (for reps).
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;

    // Verify lead exists and user has access
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && lead.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to create opportunities for this lead' });
      return;
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        title: data.title,
        dealValue: data.dealValue,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        notes: data.notes,
        leadId: data.leadId,
        assignedTo: lead.assignedTo, // Inherit assignment from lead
      },
      include: {
        lead: { select: { id: true, companyName: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ opportunity });
  } catch (err) {
    console.error('Create opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/opportunities/:id
 * Update opportunity fields (not stage — use /stage endpoint).
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const opportunity = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && opportunity.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to modify this opportunity' });
      return;
    }

    const parsed = updateOpportunitySchema.safeParse(req.body);
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
      res.status(403).json({ error: 'Only managers can reassign opportunities' });
      return;
    }

    const updated = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.dealValue !== undefined && { dealValue: data.dealValue }),
        ...(data.expectedCloseDate !== undefined && { expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      },
      include: {
        lead: { select: { id: true, companyName: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ opportunity: updated });
  } catch (err) {
    console.error('Update opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/opportunities/:id/stage
 * Pipeline stage transition — validates against allowed transition map.
 * Returns 409 for invalid transitions.
 */
router.put('/:id/stage', async (req: Request, res: Response) => {
  try {
    const opportunity = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && opportunity.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to modify this opportunity' });
      return;
    }

    const parsed = stageTransitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const { stage: targetStage } = parsed.data;
    const currentStage = opportunity.stage;

    // Check if current stage is terminal
    if (isTerminalStage(currentStage)) {
      res.status(409).json({
        error: `Cannot transition from terminal stage ${currentStage}`,
        currentStage,
        targetStage,
        allowedTransitions: [],
      });
      return;
    }

    // Validate transition
    if (!isValidTransition(currentStage, targetStage)) {
      res.status(409).json({
        error: `Invalid stage transition from ${currentStage} to ${targetStage}`,
        currentStage,
        targetStage,
        allowedTransitions: ALLOWED_TRANSITIONS[currentStage],
      });
      return;
    }

    // Check deal_value > 0 for stages past QUALIFIED
    if (STAGES_REQUIRING_DEAL_VALUE.includes(targetStage) && Number(opportunity.dealValue) <= 0) {
      res.status(409).json({
        error: 'Deal value must be greater than 0 to move past QUALIFIED stage',
        currentDealValue: Number(opportunity.dealValue),
        targetStage,
      });
      return;
    }

    const updated = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: { stage: targetStage },
      include: {
        lead: { select: { id: true, companyName: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ opportunity: updated });
  } catch (err) {
    console.error('Stage transition error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
