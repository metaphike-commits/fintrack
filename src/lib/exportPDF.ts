export interface RapportData {
  generatedAt: string;
  solde: number | null;
  runwayJours: number | null;
  pointBas: { solde: number; dateStr: string } | null;
  tensionScore: number;
  tensionLevel: string;
  momentum: number | null;
  confortThreshold: number;
  revenus: number;
  depenses: number;
  net: number;
  categories: { label: string; montant: number; pct: number }[];
  actifs: number;
  passifs: number;
  netWorth: number;
  objectifs: { label: string; actuel: number; cible: number; pct: number }[];
  actions: string[];
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
}

function tensionColor(level: string): string {
  if (level === "critique") return "#ef4444";
  if (level === "élevé") return "#f97316";
  if (level === "modéré") return "#f59e0b";
  return "#22c55e";
}

function buildHTML(d: RapportData): string {
  const runway = d.runwayJours !== null
    ? `${d.runwayJours}j (${Math.round(d.runwayJours / 30)} mois)`
    : "—";

  const momentumStr = d.momentum !== null
    ? `${d.momentum >= 0 ? "+" : ""}${Math.round(d.momentum)} jours/mois`
    : "—";

  const tColor = tensionColor(d.tensionLevel);

  const categoriesRows = d.categories.map((c) => `
    <tr>
      <td>${c.label}</td>
      <td class="num">${fmt(c.montant)}</td>
      <td class="num">${c.pct.toFixed(1)}%</td>
      <td>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.min(c.pct, 100)}%;background:#6366f1"></div>
        </div>
      </td>
    </tr>`).join("");

  const objectifsRows = d.objectifs.length > 0
    ? d.objectifs.map((o) => `
    <tr>
      <td>${o.label}</td>
      <td class="num">${fmt(o.actuel)} / ${fmt(o.cible)}</td>
      <td>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.min(o.pct, 100)}%;background:#22c55e"></div>
        </div>
      </td>
    </tr>`).join("")
    : `<tr><td colspan="3" class="empty">Aucun objectif défini</td></tr>`;

  const actionsHTML = d.actions.length > 0
    ? `<ul class="actions-list">${d.actions.map((a) => `<li>${a}</li>`).join("")}</ul>`
    : `<p class="empty">Aucune action recommandée — situation stable.</p>`;

  const pointBasHTML = d.pointBas
    ? `<tr>
        <td>Date du point bas</td>
        <td class="num">${d.pointBas.dateStr}</td>
      </tr>
      <tr>
        <td>Solde projeté au point bas</td>
        <td class="num" style="color:${d.pointBas.solde < d.confortThreshold ? "#ef4444" : "#22c55e"}">
          ${fmt(d.pointBas.solde)}${d.pointBas.solde < d.confortThreshold ? " ⚠" : ""}
        </td>
      </tr>`
    : `<tr><td colspan="2" class="empty">Projection indisponible</td></tr>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fintrack — Rapport mensuel ${d.generatedAt}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
      padding: 32px 40px;
      max-width: 820px;
      margin: 0 auto;
    }
    /* Header */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 24px;
    }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-badge {
      width: 28px; height: 28px;
      background: #6366f1;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 13px; font-weight: 700;
    }
    .logo-name { font-size: 16px; font-weight: 700; color: #111; }
    .report-meta { text-align: right; }
    .report-title { font-size: 14px; font-weight: 600; color: #374151; }
    .report-date { font-size: 11px; color: #6b7280; margin-top: 2px; }
    /* Sections */
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 4px; }
    .kpi {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .kpi-label { font-size: 10px; color: #6b7280; margin-bottom: 4px; }
    .kpi-value { font-size: 18px; font-weight: 700; color: #111; line-height: 1; }
    .kpi-sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    th {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      font-size: 12px;
      color: #374151;
      padding: 7px 8px;
      border-bottom: 1px solid #f3f4f6;
    }
    td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
    .empty { color: #9ca3af; font-style: italic; padding: 12px 8px; }
    /* Bars */
    .bar-track {
      height: 6px;
      background: #f3f4f6;
      border-radius: 3px;
      overflow: hidden;
      min-width: 80px;
    }
    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0s;
    }
    /* Actions */
    .actions-list { padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
    .actions-list li { font-size: 12px; color: #374151; line-height: 1.5; }
    /* Flux row */
    .flux-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .flux-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .flux-label { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
    .flux-value { font-size: 15px; font-weight: 700; }
    /* Footer */
    .report-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
    }
    /* Patrimoine grid */
    .patrim-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .patrim-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .patrim-label { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
    .patrim-value { font-size: 15px; font-weight: 700; }
    @media print {
      body { padding: 0; }
      @page { margin: 20mm 18mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="logo">
      <div class="logo-badge">F</div>
      <span class="logo-name">Fintrack</span>
    </div>
    <div class="report-meta">
      <div class="report-title">Rapport mensuel</div>
      <div class="report-date">Généré le ${d.generatedAt}</div>
    </div>
  </div>

  <!-- Trésorerie -->
  <div class="section">
    <div class="section-title">Trésorerie</div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Solde actuel</div>
        <div class="kpi-value">${d.solde !== null ? fmt(d.solde) : "—"}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Runway</div>
        <div class="kpi-value" style="font-size:14px">${runway}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Score de tension</div>
        <div class="kpi-value" style="color:${tColor}">${d.tensionScore}</div>
        <div class="kpi-sub">${d.tensionLevel}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Momentum</div>
        <div class="kpi-value" style="font-size:14px;color:${d.momentum !== null && d.momentum >= 0 ? "#22c55e" : "#ef4444"}">${momentumStr}</div>
      </div>
    </div>
  </div>

  <!-- Flux mensuel -->
  <div class="section">
    <div class="section-title">Flux mensuel</div>
    <div class="flux-grid">
      <div class="flux-card">
        <div class="flux-label">Revenus</div>
        <div class="flux-value" style="color:#22c55e">+${fmt(d.revenus)}</div>
      </div>
      <div class="flux-card">
        <div class="flux-label">Dépenses</div>
        <div class="flux-value" style="color:#ef4444">−${fmt(d.depenses)}</div>
      </div>
      <div class="flux-card">
        <div class="flux-label">Net mensuel</div>
        <div class="flux-value" style="color:${d.net >= 0 ? "#22c55e" : "#ef4444"}">${d.net >= 0 ? "+" : ""}${fmt(d.net)}</div>
      </div>
    </div>
  </div>

  <!-- Projection 90j -->
  <div class="section">
    <div class="section-title">Projection 90 jours</div>
    <table>
      <thead>
        <tr>
          <th>Indicateur</th>
          <th class="num">Valeur</th>
        </tr>
      </thead>
      <tbody>
        ${pointBasHTML}
        <tr>
          <td>Seuil de confort configuré</td>
          <td class="num">${fmt(d.confortThreshold)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Répartition dépenses -->
  <div class="section">
    <div class="section-title">Répartition des dépenses</div>
    <table>
      <thead>
        <tr>
          <th>Catégorie</th>
          <th class="num">Mensuel</th>
          <th class="num">Part</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${categoriesRows || `<tr><td colspan="4" class="empty">Aucune dépense enregistrée</td></tr>`}</tbody>
    </table>
  </div>

  <!-- Patrimoine -->
  <div class="section">
    <div class="section-title">Patrimoine</div>
    <div class="patrim-grid">
      <div class="patrim-card">
        <div class="patrim-label">Actifs totaux</div>
        <div class="patrim-value" style="color:#22c55e">${fmt(d.actifs)}</div>
      </div>
      <div class="patrim-card">
        <div class="patrim-label">Passifs totaux</div>
        <div class="patrim-value" style="color:#ef4444">${fmt(d.passifs)}</div>
      </div>
      <div class="patrim-card">
        <div class="patrim-label">Net worth</div>
        <div class="patrim-value" style="color:${d.netWorth >= 0 ? "#6366f1" : "#ef4444"}">${fmt(d.netWorth)}</div>
      </div>
    </div>
    ${d.objectifs.length > 0 ? `
    <table>
      <thead>
        <tr><th>Objectif</th><th class="num">Progression</th><th></th></tr>
      </thead>
      <tbody>${objectifsRows}</tbody>
    </table>` : ""}
  </div>

  <!-- Recommandations -->
  <div class="section">
    <div class="section-title">Actions recommandées</div>
    ${actionsHTML}
  </div>

  <div class="report-footer">
    Fintrack · Données 100 % locales · Aucune information transmise à un tiers · ${d.generatedAt}
  </div>
</body>
</html>`;
}

export function buildActions(d: Omit<RapportData, "actions">): string[] {
  const items: string[] = [];

  if (d.runwayJours !== null && d.runwayJours < 30) {
    items.push(`Runway critique (${d.runwayJours} jours) — réduire immédiatement les dépenses non essentielles.`);
  } else if (d.runwayJours !== null && d.runwayJours < 60) {
    items.push(`Runway sous 60 jours — constituer un matelas de précaution avant la fin du mois.`);
  }

  if (d.pointBas !== null && d.pointBas.solde < d.confortThreshold) {
    items.push(`Point bas projeté (${d.pointBas.dateStr}) sous le seuil de confort — anticiper une rentrée d'argent ou reporter une dépense.`);
  }

  if (d.net < 0) {
    items.push(`Flux mensuel négatif (${Math.round(d.net)} €) — identifier les postes fixes à renégocier ou supprimer.`);
  }

  if (d.tensionScore >= 60) {
    items.push(`Score de tension élevé (${d.tensionScore}/100) — prioriser la constitution d'une réserve de 3 mois de dépenses.`);
  }

  if (d.momentum !== null && d.momentum < -10) {
    items.push(`Momentum négatif (${Math.round(d.momentum)} j/mois) — la trajectory de trésorerie se détériore, revoir le budget.`);
  }

  const debtRatio = d.actifs > 0 ? d.passifs / d.actifs : 0;
  if (debtRatio > 0.5 && d.passifs > 0) {
    items.push(`Taux d'endettement élevé (${Math.round(debtRatio * 100)}%) — prioriser le remboursement des passifs à taux élevé.`);
  }

  if (items.length === 0 && d.net >= 0 && (d.runwayJours === null || d.runwayJours >= 90)) {
    items.push(`Situation saine — envisager de diriger l'excédent mensuel (${fmt(d.net)}) vers un objectif d'épargne.`);
  }

  return items;
}

export function printRapportPDF(data: RapportData): void {
  const html = buildHTML(data);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}
