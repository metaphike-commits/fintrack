import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { pdfParseResponseSchema } from "@/lib/ai/schemas";

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

/** Throws a descriptive error on malformed JSON or an unexpected shape —
 *  the caller distinguishes this from network/API errors. */
function parseRows(content: string): { id: string; date: string; label: string; montant: number; direction: "revenu" | "depense" }[] {
  let json: unknown;
  try {
    json = JSON.parse(content ?? "{}");
  } catch {
    throw new Error("FORMAT: JSON invalide dans la réponse IA.");
  }

  const result = pdfParseResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error("FORMAT: structure inattendue dans la réponse IA.");
  }

  return result.data.rows.map((r) => ({ id: crypto.randomUUID(), ...r }));
}

export async function POST(req: NextRequest) {
  try {
    const { text, images, mimeType }: { text?: string; images?: string[]; mimeType?: string } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY manquante." }, { status: 503 });

    const client = new OpenAI({ apiKey });

    let completion;

    if (images?.length) {
      const imgMime = mimeType ?? "image/jpeg";
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
                image_url: { url: `data:${imgMime};base64,${img}`, detail: "high" as const },
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
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("FORMAT:")) {
      return NextResponse.json({ error: "Réponse IA invalide — réessayez ou vérifiez le fichier." }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur réseau ou API OpenAI." }, { status: 500 });
  }
}
