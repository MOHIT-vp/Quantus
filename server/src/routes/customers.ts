import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate, getOwnershipFilter } from '../middleware/auth';
import { updateCustomerSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

/**
 * GET /api/customers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ownershipFilter = getOwnershipFilter(req.user!);
    const { search } = req.query;

    const where: any = { ...ownershipFilter };
    if (search && typeof search === 'string') {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { contacts: true, activities: true } },
        lead: { select: { id: true, companyName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ customers });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/customers/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, companyName: true, contactName: true, source: true } },
        contacts: { orderBy: { createdAt: 'desc' } },
        activities: {
          include: {
            creator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && customer.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to view this customer' });
      return;
    }

    res.json({ customer });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/customers/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && customer.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to modify this customer' });
      return;
    }

    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;

    if (data.assignedTo && req.user!.role !== Role.SALES_MANAGER) {
      res.status(403).json({ error: 'Only managers can reassign customers' });
      return;
    }

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ customer: updated });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
