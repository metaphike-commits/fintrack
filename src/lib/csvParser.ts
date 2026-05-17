// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = typeof window !== "undefined" ? require("xlsx") : null;

async function extractPDFContent(file: File): Promise<{ text?: string; images?: string[] }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  // Try text extraction first
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  if (text.trim().length > 80) return { text };

  // Fallback: render pages to JPEG images and send to vision API
  const images: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 4); i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
  }
  return { images };
}

export interface ParsedRow {
  id: string;
  date: string;
  label: string;
  montant: number;
  direction: "revenu" | "depense";
}

function detectDelimiter(line: string): string {
  const semis = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

function parseDate(raw: string): string {
  const s = raw.trim().replace(/["']/g, "");
  const parts = s.split(/[\/\-.]/);
  if (parts.length !== 3) return s;
  if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/["'\s]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function splitLine(line: string, delim: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === delim && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(content: string): ParsedRow[] {
  // Strip UTF-8 BOM
  const text = content.replace(/^﻿/, "");
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delim = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delim).map((h) =>
    h.toLowerCase().replace(/['"]/g, "").trim()
  );

  const find = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const dateCol = find("date");
  const labelCol = find("libel", "label", "description", "opération", "operation", "motif");
  const montantCol = find("montant", "amount");
  const debitCol = find("débit", "debit");
  const creditCol = find("crédit", "credit");

  if (dateCol === -1 || labelCol === -1) return [];

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delim);
    const date = parseDate(cols[dateCol] ?? "");
    const label = (cols[labelCol] ?? "").trim();
    if (!label) continue;

    let montant = 0;
    let direction: "revenu" | "depense" = "depense";

    if (montantCol !== -1) {
      const raw = parseAmount(cols[montantCol] ?? "0");
      montant = Math.abs(raw);
      direction = raw >= 0 ? "revenu" : "depense";
    } else if (debitCol !== -1 && creditCol !== -1) {
      const debit = parseAmount(cols[debitCol] ?? "");
      const credit = parseAmount(cols[creditCol] ?? "");
      if (credit > 0) { montant = credit; direction = "revenu"; }
      else if (debit !== 0) { montant = Math.abs(debit); direction = "depense"; }
    }

    if (montant === 0) continue;

    rows.push({
      id: crypto.randomUUID(),
      date,
      label,
      montant,
      direction,
    });
  }

  return rows;
}

/** Groups rows by normalized label and returns one rep per label appearing ≥2 times. */
export function detectRecurring(rows: ParsedRow[]): ParsedRow[] {
  const groups = new Map<string, { row: ParsedRow; count: number }>();
  for (const row of rows) {
    const key = row.label
      .toLowerCase()
      .replace(/\d+/g, " ")
      .replace(/[^a-zàâéèêëîïôùûüç\s]/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 50);
    if (key.length < 3) continue;
    const entry = groups.get(key);
    if (entry) { entry.count++; } else { groups.set(key, { row, count: 1 }); }
  }
  return [...groups.values()]
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.row.montant - a.row.montant)
    .slice(0, 15)
    .map((g) => g.row);
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const isPDF   = /\.pdf$/i.test(file.name);
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);

  if (isPDF) {
    const content = await extractPDFContent(file);
    const res = await fetch("/api/ai/pdf-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Erreur PDF : ${res.status}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.rows ?? [];
  }

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const csv: string = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    return parseCSV(csv);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseCSV(e.target?.result as string ?? ""));
    reader.readAsText(file, "utf-8");
  });
}
