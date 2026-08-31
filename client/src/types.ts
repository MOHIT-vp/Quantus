export type Role = 'SALES_REP' | 'SALES_MANAGER';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'DISQUALIFIED';
export type PipelineStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type ActivityType = 'NOTE' | 'CALL' | 'MEETING' | 'EMAIL' | 'FOLLOW_UP';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  source: string;
  status: LeadStatus;
  notes?: string;
  assignedTo: string;
  assignedUser: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  _count?: { opportunities: number };
  opportunities?: Opportunity[];
}

export interface Opportunity {
  id: string;
  title: string;
  dealValue: number;
  expectedCloseDate?: string;
  stage: PipelineStage;
  notes?: string;
  leadId: string;
  assignedTo: string;
  lead: { id: string; companyName: string; contactName?: string; contactEmail?: string };
  assignedUser: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  _count?: { activities: number };
  activities?: Activity[];
}

export interface Customer {
  id: string;
  companyName: string;
  industry?: string;
  website?: string;
  address?: string;
  leadId?: string;
  assignedTo: string;
  assignedUser: { id: string; name: string; email: string };
  lead?: { id: string; companyName: string; contactName: string; source: string };
  contacts?: Contact[];
  activities?: Activity[];
  _count?: { contacts: number; activities: number };
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  customerId: string;
  customer?: { id: string; companyName: string };
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  dueDate?: string;
  completed: boolean;
  opportunityId?: string;
  customerId?: string;
  createdBy: string;
  creator: { id: string; name: string };
  opportunity?: { id: string; title: string };
  customer?: { id: string; companyName: string };
  createdAt: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  totalOpportunities: number;
  openOpportunities: number;
  wonCount: number;
  lostCount: number;
  pipelineValue: number;
  wonValue: number;
  conversionRate: number;
  followUpsDueToday: number;
  totalCustomers: number;
}

export interface PipelineStageSummary {
  stage: PipelineStage;
  count: number;
  totalValue: number;
}

export interface RepPerformance {
  id: string;
  name: string;
  email: string;
  leadsCount: number;
  opportunitiesCount: number;
  customersCount: number;
  openPipelineValue: number;
  wonValue: number;
  wonCount: number;
  lostCount: number;
}
