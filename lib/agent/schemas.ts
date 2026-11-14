// Shapes shared by the agent, its tools and the API routes (docs/DESIGN.md §8). zod, so the model's tool arguments are validated.
import * as z from 'zod';
import { REASONS } from './feedback.ts';

// Per request, never from the model: who is asking and for which flock (docs/DESIGN.md §8.4).
export const contextSchema = z.object({ userId: z.string().uuid(), flockId: z.string().uuid() });
export type AgentContext = z.infer<typeof contextSchema>;

export const searchApartmentsInput = z.object({
  maxRent: z.number().int().positive().describe('Combined monthly rent the whole flock can pay, in dollars'),
  beds: z.number().int().min(0).max(10).describe('Minimum bedrooms'),
  areas: z.array(z.string()).optional().describe('Neighborhoods, only if the user named some'),
});
export const rankApartmentsInput = z.object({ listingIds: z.array(z.string().uuid()).min(1).max(25) });
export const updateShortlistInput = z.object({
  picks: z.array(z.object({ listingId: z.string().uuid() })).min(1).max(5).describe('The best floor plans, best first. Ids only: the saved explanation is built from the checks, not from your words.'),
});
export const findOpenFlocksInput = z.object({}); // who is asking comes from the request context
export const sendInvitesInput = z.object({ usernames: z.array(z.string().min(1).max(40)).min(1).max(8) });
export const processFeedbackInput = z.object({
  listingId: z.string().uuid(),
  reason: z.enum(REASONS),
});

// POST /api/agent/feedback: a thumbs-down with reasons, or (no listing) "the flock changed, refresh the shortlist".
export const feedbackInput = z.object({
  flockId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  reasons: z.array(z.enum(REASONS)).min(1).max(REASONS.length).optional(),
}).refine((v) => !v.listingId === !v.reasons, 'Send listingId and reasons together, or neither.');

export const askInput = z.object({ flockId: z.string().uuid(), message: z.string().trim().min(1).max(2000) });
export const resumeInput = z.object({
  flockId: z.string().uuid(),
  decisions: z.array(z.object({ type: z.enum(['approve', 'reject']), message: z.string().max(500).optional() })).min(1).max(8),
});

// One line of the NDJSON stream the API sends (read in the browser by lib/agent/client.ts).
export type AgentEvent =
  | { type: 'token'; text: string }
  | { type: 'todos'; todos: { content: string; status: string }[] }
  | { type: 'step'; name: string } // a tool or subagent started
  | { type: 'tool_result'; name: string; content: string }
  | { type: 'interrupt'; actions: { name: string; args: Record<string, unknown> }[] }
  | { type: 'error'; message: string }
  | { type: 'done' };
