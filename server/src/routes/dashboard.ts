import { Router, Request, Response } from 'express';
import { Role, PipelineStage } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticate, getOwnershipFilter } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * GET /api/dashboard/metrics
 * Computed via real aggregation queries.
 * Managers see team-wide metrics; reps see only their own.
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const ownershipFilter = getOwnershipFilter(req.user!);

    // Total leads
    const totalLeads = await prisma.lead.count({ where: ownershipFilter });

    // Leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: ownershipFilter,
      _count: { _all: true },
    });

    // Total opportunities (all stages)
    const totalOpportunities = await prisma.opportunity.count({ where: ownershipFilter });

    // Open opportunities (not WON or LOST)
    const openOpportunities = await prisma.opportunity.count({
      where: {
        ...ownershipFilter,
        stage: { notIn: [PipelineStage.WON, PipelineStage.LOST] },
      },
    });

    // Won count
    const wonCount = await prisma.opportunity.count({
      where: { ...ownershipFilter, stage: PipelineStage.WON },
    });

    // Lost count
    const lostCount = await prisma.opportunity.count({
      where: { ...ownershipFilter, stage: PipelineStage.LOST },
    });

    // Pipeline value (SUM of deal values for open opportunities)
    const pipelineValueResult = await prisma.opportunity.aggregate({
      where: {
        ...ownershipFilter,
        stage: { notIn: [PipelineStage.WON, PipelineStage.LOST] },
      },
      _sum: { dealValue: true },
    });
    const pipelineValue = Number(pipelineValueResult._sum.dealValue || 0);

    // Won value
    const wonValueResult = await prisma.opportunity.aggregate({
      where: { ...ownershipFilter, stage: PipelineStage.WON },
      _sum: { dealValue: true },
    });
    const wonValue = Number(wonValueResult._sum.dealValue || 0);

    // Conversion rate: won ÷ total qualified (opportunities that have been through qualification)
    const qualifiedTotal = wonCount + lostCount + openOpportunities;
    const conversionRate = qualifiedTotal > 0 ? (wonCount / qualifiedTotal) * 100 : 0;

    // Follow-ups due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const followUpsDueToday = await prisma.activity.count({
      where: {
        createdBy: req.user!.role === Role.SALES_REP ? req.user!.userId : undefined,
        completed: false,
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Customers count
    const totalCustomers = await prisma.customer.count({ where: ownershipFilter });

    res.json({
      metrics: {
        totalLeads,
        leadsByStatus: leadsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count._all;
          return acc;
        }, {} as Record<string, number>),
        totalOpportunities,
        openOpportunities,
        wonCount,
        lostCount,
        pipelineValue,
        wonValue,
        conversionRate: Math.round(conversionRate * 10) / 10,
        followUpsDueToday,
        totalCustomers,
      },
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dashboard/pipeline-summary
 * Returns opportunities grouped by stage with counts and values.
 */
router.get('/pipeline-summary', async (req: Request, res: Response) => {
  try {
    const ownershipFilter = getOwnershipFilter(req.user!);

    const stages = Object.values(PipelineStage);
    const summary = await Promise.all(
      stages.map(async (stage) => {
        const [count, valueResult] = await Promise.all([
          prisma.opportunity.count({ where: { ...ownershipFilter, stage } }),
          prisma.opportunity.aggregate({
            where: { ...ownershipFilter, stage },
            _sum: { dealValue: true },
          }),
        ]);
        return {
          stage,
          count,
          totalValue: Number(valueResult._sum.dealValue || 0),
        };
      })
    );

    res.json({ pipelineSummary: summary });
  } catch (err) {
    console.error('Pipeline summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dashboard/team-performance
 * Manager-only: returns per-rep metrics.
 */
router.get('/team-performance', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== Role.SALES_MANAGER) {
      res.status(403).json({ error: 'Only managers can view team performance' });
      return;
    }

    const reps = await prisma.user.findMany({
      where: { role: Role.SALES_REP },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            assignedLeads: true,
            assignedOpportunities: true,
            assignedCustomers: true,
          },
        },
      },
    });

    // Get per-rep pipeline values
    const repPerformance = await Promise.all(
      reps.map(async (rep) => {
        const [openValue, wonValue, wonCount, lostCount] = await Promise.all([
          prisma.opportunity.aggregate({
            where: {
              assignedTo: rep.id,
              stage: { notIn: [PipelineStage.WON, PipelineStage.LOST] },
            },
            _sum: { dealValue: true },
          }),
          prisma.opportunity.aggregate({
            where: { assignedTo: rep.id, stage: PipelineStage.WON },
            _sum: { dealValue: true },
          }),
          prisma.opportunity.count({
            where: { assignedTo: rep.id, stage: PipelineStage.WON },
          }),
          prisma.opportunity.count({
            where: { assignedTo: rep.id, stage: PipelineStage.LOST },
          }),
        ]);

        return {
          id: rep.id,
          name: rep.name,
          email: rep.email,
          leadsCount: rep._count.assignedLeads,
          opportunitiesCount: rep._count.assignedOpportunities,
          customersCount: rep._count.assignedCustomers,
          openPipelineValue: Number(openValue._sum.dealValue || 0),
          wonValue: Number(wonValue._sum.dealValue || 0),
          wonCount,
          lostCount,
        };
      })
    );

    res.json({ teamPerformance: repPerformance });
  } catch (err) {
    console.error('Team performance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
