import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { scenarioEnvelopeSchema, scenarioItemSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ scenario: null, error: "OPENAI_API_KEY non configurée." });
  }

  const { prompt, baseNet }: { prompt: string; baseNet: number } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ scenario: null, error: "Prompt vide." });
  }

  const client = new OpenAI({ apiKey });

  const systemPrompt = `Tu es un analyseur financier. L'utilisateur décrit un scénario en langage naturel.
Extrais les flux financiers et retourne un JSON valide avec cette structure exacte :
{
  "name": "Nom court (max 30 chars)",
  "description": "Une phrase résumant le scénario",
  "items": [
    {
      "label": "Nom du flux",
      "montant": 150,
      "direction": "depense",
      "frequence": "mensuel",
      "categorie": "abonnement"
    }
  ]
}
Règles :
- montant : toujours positif (nombre)
- direction : "revenu" si entrée d'argent, "depense" si sortie
- frequence : "mensuel" | "hebdomadaire" | "trimestriel" | "annuel" | "ponctuel"
- Si la fréquence n'est pas précisée, déduis-la du contexte (loyer → mensuel, bonus → ponctuel, etc.)
- Retourne uniquement le JSON, sans texte autour.`;

  const userPrompt = `Net mensuel actuel : ${baseNet} €
Scénario décrit : "${prompt.trim()}"`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ scenario: null, error: "Réponse IA mal formée (JSON invalide)." });
    }

    const envelope = scenarioEnvelopeSchema.safeParse(json);
    if (!envelope.success) {
      return NextResponse.json({ scenario: null, error: "Réponse IA invalide (structure inattendue)." });
    }

    // Each item validated individually — one malformed item is dropped
    // rather than invalidating the whole scenario.
    const items = envelope.data.items
      .map((raw) => scenarioItemSchema.safeParse(raw))
      .filter((r) => r.success)
      .map((r) => r.data);

    if (items.length === 0) {
      return NextResponse.json({ scenario: null, error: "Aucun flux financier reconnu dans la réponse IA." });
    }

    return NextResponse.json({
      scenario: { name: envelope.data.name, description: envelope.data.description, items },
    });
  } catch {
    return NextResponse.json({ scenario: null, error: "Erreur réseau ou API OpenAI." });
  }
}
