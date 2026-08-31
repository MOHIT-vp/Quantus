import { z } from 'zod';
import { LeadStatus, PipelineStage, ActivityType } from '@prisma/client';

// ── Auth ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

// ── Leads ──────────────────────────────────────────────
export const createLeadSchema = z.object({
  companyName: z.string().min(1, 'Company name required').max(200),
  contactName: z.string().min(1, 'Contact name required').max(200),
  contactEmail: z.string().email('Valid email required'),
  contactPhone: z.string().max(30).optional(),
  source: z.string().min(1, 'Source required').max(100),
  notes: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().optional(), // Only managers can set this
});

export const updateLeadSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional().nullable(),
  source: z.string().min(1).max(100).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().uuid().optional(), // Only managers can reassign
});

// ── Opportunities ──────────────────────────────────────
export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title required').max(300),
  dealValue: z.number().min(0, 'Deal value must be non-negative'),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional(),
  leadId: z.string().uuid('Valid lead ID required'),
});

export const updateOpportunitySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  dealValue: z.number().min(0).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().uuid().optional(), // Only managers can reassign
});

export const stageTransitionSchema = z.object({
  stage: z.nativeEnum(PipelineStage),
});

// ── Customers ──────────────────────────────────────────
export const updateCustomerSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  assignedTo: z.string().uuid().optional(), // Only managers
});

// ── Contacts ──────────────────────────────────────────
export const createContactSchema = z.object({
  name: z.string().min(1, 'Name required').max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
  customerId: z.string().uuid('Valid customer ID required'),
});

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
});

// ── Activities ──────────────────────────────────────────
export const createActivitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  description: z.string().min(1, 'Description required').max(2000),
  dueDate: z.string().datetime().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
});

export const updateActivitySchema = z.object({
  type: z.nativeEnum(ActivityType).optional(),
  description: z.string().min(1).max(2000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
});
