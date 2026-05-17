import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Tu es un parseur de relevés bancaires français. Extrais toutes les transactions.
Retourne un objet JSON {"rows": [...]} où chaque transaction a :
- date: string ISO YYYY-MM-DD
- label: string (libellé court, max 80 chars)
- montant: number (toujours positif)
- direction: "revenu" | "depense"

Règles :
- débit / sortie / virement émis / paiement = "depense"
- crédit / virement reçu / salaire / remboursement = "revenu"
- Ignore les lignes de solde, totaux, en-têtes, pieds de page
- Convertis les dates JJ/MM/AAAA ou JJ/MM/AA en YYYY-MM-DD`;

function parseRows(content: string) {
  const raw = JSON.parse(content ?? "{}");
  return (raw.rows ?? [])
    .map((r: { date?: string; label?: string; montant?: unknown; direction?: string }) => ({
      id: crypto.randomUUID(),
      date: r.date ?? new Date().toISOString().split("T")[0],
      label: (r.label ?? "Transaction").trim().slice(0, 80),
      montant: Math.abs(Number(r.montant) || 0),
      direction: r.direction === "revenu" ? "revenu" : "depense",
    }))
    .filter((r: { montant: number }) => r.montant > 0);
}

export async function POST(req: NextRequest) {
  try {
    const { text, images }: { text?: string; images?: string[] } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY manquante." }, { status: 503 });

    const client = new OpenAI({ apiKey });

    let completion;

    if (images?.length) {
      // Scanned PDF — use Vision API
      completion = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrais toutes les transactions de ce relevé bancaire :" },
              ...images.map((img) => ({
                type: "image_url" as const,
                image_url: { url: `data:image/jpeg;base64,${img}`, detail: "high" as const },
              })),
            ],
          },
        ],
      });
    } else if (text?.trim()) {
      // Text-based PDF
      completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extrais les transactions de ce relevé :\n\n${text.slice(0, 12000)}` },
        ],
      });
    } else {
      return NextResponse.json({ error: "Aucun contenu extrait du PDF. Le fichier est peut-être protégé." }, { status: 422 });
    }

    const rows = parseRows(completion.choices[0].message.content ?? "{}");
    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[pdf-parse]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
