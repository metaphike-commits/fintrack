import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const CATEGORIES = [
  // Revenus
  "salaire", "freelance", "remboursement", "allocation",
  // Logement
  "loyer", "électricité", "eau", "internet",
  // Transport
  "transport", "stationnement", "carburant",
  // Vie courante
  "alimentation", "restauration", "santé", "loisirs", "vêtements",
  // Financier
  "abonnements", "assurance", "épargne", "crédit", "impôts", "amende",
  // Autre
  "autre",
];

interface InputRow {
  id: string;
  label: string;
  montant: number;
  direction: "revenu" | "depense";
}

export async function POST(req: NextRequest) {
  const { rows }: { rows: InputRow[] } = await req.json();

  if (!rows?.length) {
    return NextResponse.json({ rows: [] });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = rows.map((r) => ({
      id: r.id,
      categorie: r.direction === "revenu" ? "salaire" : "autre",
    }));
    return NextResponse.json({ rows: fallback });
  }

  const client = new OpenAI({ apiKey });

  const list = rows
    .map((r) => `${r.id}|${r.direction}|${r.montant}|${r.label}`)
    .join("\n");

  const prompt = `Catégorise ces transactions bancaires françaises.
Catégories disponibles : ${CATEGORIES.join(", ")}.
Format de chaque ligne : id|direction|montant|libellé

Réponds UNIQUEMENT avec un tableau JSON sans markdown :
[{"id":"...","categorie":"..."}]

Transactions :
${list}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = raw.replace(/^```(?:json)?|```$/gm, "").trim();
    const parsed: { id: string; categorie: string }[] = JSON.parse(cleaned);

    return NextResponse.json({ rows: parsed });
  } catch {
    const fallback = rows.map((r) => ({
      id: r.id,
      categorie: r.direction === "revenu" ? "salaire" : "autre",
    }));
    return NextResponse.json({ rows: fallback });
  }
}
