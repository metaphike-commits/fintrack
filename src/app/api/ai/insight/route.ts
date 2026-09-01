import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { insightPartSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

interface InsightPayload {
  totalRevenus: number;
  totalDepenses: number;
  solde: number;
  objectifEpargne: number;
  nombrePostes: number;
  plusGrosseDepense?: string;
  tauxEpargne: number;
  // V3.2 enrichments
  soldeTotal?: number | null;
  nombreComptes?: number;
  resteAPayer?: number;
  pointBas?: number | null;
  pointBasJour?: number;
  prochainPaiementLabel?: string;
  prochainPaiementMontant?: number;
  runwayJours?: number | null;
  confortJours?: number | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ insight: null, action: null, error: "OPENAI_API_KEY non configurée." }, { status: 200 });
  }

  const payload: InsightPayload = await req.json();

  const client = new OpenAI({ apiKey });

  const contextLines = [
    `- Revenus mensuels : ${payload.totalRevenus} €`,
    `- Dépenses fixes : ${payload.totalDepenses} €`,
    `- Solde net mensuel : ${payload.solde} €`,
    `- Taux d'épargne : ${payload.tauxEpargne.toFixed(1)}%`,
    `- Objectif épargne : ${payload.objectifEpargne} €`,
    payload.plusGrosseDepense ? `- Plus grosse dépense : ${payload.plusGrosseDepense}` : null,
    payload.soldeTotal != null ? `- Solde total comptes : ${payload.soldeTotal} €` : null,
    payload.nombreComptes ? `- Nombre de comptes : ${payload.nombreComptes}` : null,
    payload.resteAPayer != null ? `- Reste à payer ce mois : ${payload.resteAPayer} €` : null,
    payload.pointBas != null ? `- Point bas du mois (solde minimum projeté) : ${payload.pointBas} € (dans ${payload.pointBasJour ?? "?"} jours)` : null,
    payload.prochainPaiementLabel ? `- Prochain gros paiement : ${payload.prochainPaiementLabel} — ${payload.prochainPaiementMontant} €` : null,
    payload.runwayJours != null ? `- Runway trésorerie : ${payload.runwayJours} jours` : null,
    payload.confortJours != null ? `- Runway confort : ${payload.confortJours} jours` : null,
  ].filter(Boolean).join("\n");

  const prompt = `Tu es un conseiller financier personnel concis et bienveillant.
Données financières de l'utilisateur :
${contextLines}

Génère EXACTEMENT deux éléments, séparés par "|||" :
1. Un INSIGHT : observation factuelle sur la situation (max 120 caractères).
2. Une ACTION : recommandation concrète et actionnelle (max 120 caractères).

Format de réponse : [insight]|||[action]
Ton : direct, factuel, sans jugement, comme un bon DAF personnel.
Ne commence pas par "Bonjour". Commence directement.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.4,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const [rawInsight, rawAction] = raw.split("|||");

    const insightResult = insightPartSchema.safeParse(rawInsight);
    const actionResult = insightPartSchema.safeParse(rawAction);

    if (!insightResult.success && !actionResult.success) {
      return NextResponse.json({ insight: null, action: null, error: "Réponse IA invalide (format inattendu)." });
    }

    return NextResponse.json({
      insight: insightResult.success ? insightResult.data : null,
      action: actionResult.success ? actionResult.data : null,
    });
  } catch {
    return NextResponse.json({ insight: null, action: null, error: "Erreur OpenAI." }, { status: 200 });
  }
}
