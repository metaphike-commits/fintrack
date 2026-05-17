import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

interface ParsedItem {
  label: string;
  montant: number;
  direction: "revenu" | "depense";
  frequence: "mensuel" | "hebdomadaire" | "trimestriel" | "annuel" | "ponctuel";
  categorie: string;
}

interface ParsedScenario {
  name: string;
  description: string;
  items: ParsedItem[];
}

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
    const parsed: ParsedScenario = JSON.parse(raw);

    if (!parsed.name || !Array.isArray(parsed.items)) {
      return NextResponse.json({ scenario: null, error: "Réponse IA invalide." });
    }

    // Sanitize items
    const items = parsed.items
      .filter((i) => i.label && typeof i.montant === "number" && i.montant > 0)
      .map((i) => ({
        label: String(i.label),
        montant: Math.abs(i.montant),
        direction: i.direction === "revenu" ? "revenu" : "depense",
        frequence: ["mensuel", "hebdomadaire", "trimestriel", "annuel", "ponctuel"].includes(i.frequence)
          ? i.frequence
          : "mensuel",
        categorie: String(i.categorie ?? i.direction),
      })) as ParsedItem[];

    return NextResponse.json({
      scenario: { name: parsed.name, description: parsed.description ?? "", items },
    });
  } catch {
    return NextResponse.json({ scenario: null, error: "Erreur lors du parsing IA." });
  }
}
