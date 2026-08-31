import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { createContactSchema, updateContactSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

/**
 * GET /api/contacts
 * List contacts for customers the user has access to.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    const where: any = {};

    if (customerId && typeof customerId === 'string') {
      // Verify user has access to this customer
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      if (req.user!.role === Role.SALES_REP && customer.assignedTo !== req.user!.userId) {
        res.status(403).json({ error: 'You do not have permission to view contacts for this customer' });
        return;
      }
      where.customerId = customerId;
    } else if (req.user!.role === Role.SALES_REP) {
      // Rep can only see contacts for their customers
      where.customer = { assignedTo: req.user!.userId };
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ contacts });
  } catch (err) {
    console.error('List contacts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/contacts
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;

    // Verify customer exists and user has access
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    if (req.user!.role === Role.SALES_REP && customer.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to add contacts to this customer' });
      return;
    }

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        jobTitle: data.jobTitle,
        customerId: data.customerId,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });

    res.status(201).json({ contact });
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/contacts/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: { assignedTo: true } } },
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    if (req.user!.role === Role.SALES_REP && contact.customer.assignedTo !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to modify this contact' });
      return;
    }

    const parsed = updateContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const data = parsed.data;
    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
      },
    });

    res.json({ contact: updated });
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
