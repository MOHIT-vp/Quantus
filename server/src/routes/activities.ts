import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { createActivitySchema, updateActivitySchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

/**
 * GET /api/activities
 * List activities. Can filter by opportunityId or customerId.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { opportunityId, customerId, upcoming } = req.query;
    const where: any = {};

    if (opportunityId && typeof opportunityId === 'string') {
      // Verify access
      const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      if (!opp) {
        res.status(404).json({ error: 'Opportunity not found' });
        return;
      }
      if (req.user!.role === Role.SALES_REP && opp.assignedTo !== req.user!.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      where.opportunityId = opportunityId;
    } else if (customerId && typeof customerId === 'string') {
      const cust = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!cust) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      if (req.user!.role === Role.SALES_REP && cust.assignedTo !== req.user!.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      where.customerId = customerId;
    } else if (req.user!.role === Role.SALES_REP) {
      where.createdBy = req.user!.userId;
    }

    // Filter upcoming activities (due today or future, not completed)
    if (upcoming === 'true') {
      where.completed = false;
      where.dueDate = { gte: new Date() };
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
        customer: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ activities });
  } catch (err) {
    console.error('List activities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/activities
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;

    // Verify access to parent entity
    if (data.opportunityId) {
      const opp = await prisma.opportunity.findUnique({ where: { id: data.opportunityId } });
      if (!opp) {
        res.status(404).json({ error: 'Opportunity not found' });
        return;
      }
      if (req.user!.role === Role.SALES_REP && opp.assignedTo !== req.user!.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    if (data.customerId) {
      const cust = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!cust) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      if (req.user!.role === Role.SALES_REP && cust.assignedTo !== req.user!.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const activity = await prisma.activity.create({
      data: {
        type: data.type,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        opportunityId: data.opportunityId,
        customerId: data.customerId,
        createdBy: req.user!.userId,
      },
      include: {
        creator: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
        customer: { select: { id: true, companyName: true } },
      },
    });

    res.status(201).json({ activity });
  } catch (err) {
    console.error('Create activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/activities/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Only the creator or a manager can edit
    if (req.user!.role === Role.SALES_REP && activity.createdBy !== req.user!.userId) {
      res.status(403).json({ error: 'You can only modify your own activities' });
      return;
    }

    const parsed = updateActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;
    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.completed !== undefined && { completed: data.completed }),
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    res.json({ activity: updated });
  } catch (err) {
    console.error('Update activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
