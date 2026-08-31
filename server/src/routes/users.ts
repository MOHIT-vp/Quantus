import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * GET /api/users/reps
 * Returns list of sales reps — used by managers for reassignment dropdowns.
 * Manager-only endpoint.
 */
router.get('/reps', requireRole(Role.SALES_MANAGER), async (req: Request, res: Response) => {
  try {
    const reps = await prisma.user.findMany({
      where: { role: Role.SALES_REP },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    res.json({ reps });
  } catch (err) {
    console.error('List reps error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
