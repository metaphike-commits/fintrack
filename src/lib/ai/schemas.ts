import { z } from "zod";

/**
 * Runtime shape validation for OpenAI responses, before any parsed data is
 * used by the app or written to a store. `response_format: json_object` (or
 * a plain try/catch on JSON.parse) only guarantees syntactically valid JSON —
 * it says nothing about whether the fields we actually read are present and
 * of the right type. A model can return valid JSON with a missing `items`,
 * a `montant` as a string, or a `categorie` that isn't in our list.
 */

// ── /api/ai/scenario-parse ──────────────────────────────────────────────────

export const scenarioItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  montant: z.coerce.number().positive().finite().max(1_000_000),
  direction: z.enum(["revenu", "depense"]),
  frequence: z.enum(["mensuel", "hebdomadaire", "trimestriel", "annuel", "ponctuel"]),
  categorie: z.string().trim().min(1).max(40),
});

// Outer shape only — kept loose on `items` so one malformed item doesn't
// invalidate the whole scenario. Each item is validated individually by the
// route (safeParse + filter), same graceful-degradation behavior as before,
// but with real type coercion/bounds instead of ad-hoc `String()`/`Math.abs`.
export const scenarioEnvelopeSchema = z.object({
  name: z.string().trim().min(1).max(30),
  description: z.string().trim().max(200).optional().default(""),
  items: z.array(z.unknown()).max(20).default([]),
});

export type ScenarioItem = z.infer<typeof scenarioItemSchema>;
export type ParsedScenario = z.infer<typeof scenarioEnvelopeSchema> & { items: ScenarioItem[] };

// ── /api/ai/categorize ───────────────────────────────────────────────────────

export const categorizeRowSchema = z.object({
  id: z.string().min(1),
  categorie: z.string().trim().min(1).max(40),
});

export const categorizeResponseSchema = z.array(categorizeRowSchema).max(500);

// ── /api/ai/insight ───────────────────────────────────────────────────────────

export const insightPartSchema = z.string().trim().min(1).max(200);

// ── /api/ai/pdf-parse ────────────────────────────────────────────────────────

export const pdfParseRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  label: z.string().trim().min(1).max(80),
  montant: z.coerce.number().positive().finite().max(10_000_000),
  direction: z.enum(["revenu", "depense"]),
});

export const pdfParseResponseSchema = z.object({
  rows: z.array(pdfParseRowSchema).max(2000),
});
