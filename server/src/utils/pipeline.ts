import { PipelineStage } from '@prisma/client';

/**
 * Pipeline Stage Transition Map
 * 
 * Rules:
 * - Forward by exactly one stage
 * - Backward to any earlier stage  
 * - WON and LOST are terminal (no transitions out)
 * - deal_value must be > 0 to move past QUALIFIED
 * 
 * Rationale: Mirrors real sales process where deals progress
 * incrementally but can regress freely. Terminal states prevent
 * gaming of win/loss metrics.
 */

const STAGE_ORDER: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.CONTACTED,
  PipelineStage.QUALIFIED,
  PipelineStage.PROPOSAL,
  PipelineStage.NEGOTIATION,
];

// Terminal stages — no transitions allowed out of these
const TERMINAL_STAGES: PipelineStage[] = [PipelineStage.WON, PipelineStage.LOST];

/**
 * Build allowed transitions:
 * - From each non-terminal stage: can move to next stage, or back to any earlier stage
 * - From NEGOTIATION: can also move to WON or LOST
 */
export const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  [PipelineStage.NEW]: [PipelineStage.CONTACTED],
  [PipelineStage.CONTACTED]: [PipelineStage.QUALIFIED, PipelineStage.NEW],
  [PipelineStage.QUALIFIED]: [PipelineStage.PROPOSAL, PipelineStage.CONTACTED, PipelineStage.NEW],
  [PipelineStage.PROPOSAL]: [PipelineStage.NEGOTIATION, PipelineStage.QUALIFIED, PipelineStage.CONTACTED, PipelineStage.NEW],
  [PipelineStage.NEGOTIATION]: [PipelineStage.WON, PipelineStage.LOST, PipelineStage.PROPOSAL, PipelineStage.QUALIFIED, PipelineStage.CONTACTED, PipelineStage.NEW],
  [PipelineStage.WON]: [],   // Terminal
  [PipelineStage.LOST]: [],  // Terminal
};

export function isValidTransition(from: PipelineStage, to: PipelineStage): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getStageIndex(stage: PipelineStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  if (index !== -1) return index;
  if (stage === PipelineStage.WON) return STAGE_ORDER.length;
  if (stage === PipelineStage.LOST) return STAGE_ORDER.length + 1;
  return -1;
}

export function isTerminalStage(stage: PipelineStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

// Stages that require deal_value > 0
export const STAGES_REQUIRING_DEAL_VALUE: PipelineStage[] = [
  PipelineStage.PROPOSAL,
  PipelineStage.NEGOTIATION,
  PipelineStage.WON,
];
