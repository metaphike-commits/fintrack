import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CATEGORIES_FLAT } from "@/lib/categories";
import { categorizeResponseSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

interface InputRow {
  id: string;
  label: string;
  montant: number;
  direction: "revenu" | "depense";
}

export async function POST(req: NextRequest) {
  const { rows, bank }: { rows: InputRow[]; bank?: string } = await req.json();

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

  const bankLine = bank ? `\nRelevé issu de : ${bank}. Tiens compte des conventions de libellé de cette banque.` : "";

  const prompt = `Catégorise ces transactions bancaires françaises.${bankLine}
Catégories disponibles : ${CATEGORIES_FLAT.join(", ")}.
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

    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      const fallback = rows.map((r) => ({
        id: r.id,
        categorie: r.direction === "revenu" ? "salaire" : "autre",
      }));
      return NextResponse.json({ rows: fallback });
    }

    const result = categorizeResponseSchema.safeParse(json);
    if (!result.success) {
      const fallback = rows.map((r) => ({
        id: r.id,
        categorie: r.direction === "revenu" ? "salaire" : "autre",
      }));
      return NextResponse.json({ rows: fallback });
    }

    // Keep only categories that actually exist in the app's taxonomy — an
    // unrecognized `categorie` string from the model falls back per-row
    // rather than propagating a value the UI has no color/icon/group for.
    const known = new Set(CATEGORIES_FLAT);
    const validated = result.data.map((r) => {
      const source = rows.find((row) => row.id === r.id);
      const fallbackCat = source?.direction === "revenu" ? "salaire" : "autre";
      return { id: r.id, categorie: known.has(r.categorie) ? r.categorie : fallbackCat };
    });

    return NextResponse.json({ rows: validated });
  } catch {
    const fallback = rows.map((r) => ({
      id: r.id,
      categorie: r.direction === "revenu" ? "salaire" : "autre",
    }));
    return NextResponse.json({ rows: fallback });
  }
}
