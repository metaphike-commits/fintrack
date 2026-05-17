# HANDOFF.md — Etat du repo

Mis a jour obligatoirement a la fin de chaque sprint par le dernier contributeur.
Le prochain dev ou agent lit ce fichier en priorite avant toute action.

---

## IMPORTANT — Repo de travail officiel V4+

**Tout le travail V5 et au-delà se fait sur le repo dédié :**

```
https://github.com/metaphike-commits/fintrack-v4
```

Le repo `financial-trajectory-simulator-v2` est archivé à partir de V4.9.
Ne pas ouvrir de PR ni pousser de commits V5 dessus.

---

## Current State — V6 COMPLÈTE · 2026-05-15

### Sprint actif

**QA terrain / V7 à définir** — toute la roadmap V6 est livrée.

### Etat

**V6.1–V6.6 livrées et buildables. `npx tsc --noEmit` = 0 erreur au 2026-05-15.**

---

## Ce qui a ete livre (V4.0 → V5.3)

| Sprint | Contenu                              | Statut   |
|--------|--------------------------------------|----------|
| V4.1   | Cockpit stratégique (Signal IA, Runway gauge, Tension Score, Momentum, projection 90j, alertes) | ✅ |
| V4.2   | Timeline opérationnelle (3 états, écart, réconciliation, bilan panel) | ✅ |
| V4.3   | Analyse Premium (donut SVG, heatmap, score comportemental, IA narrative) | ✅ |
| V4.4   | Patrimoine (actifs, passifs, objectifs, net worth, taux d'endettement) | ✅ |
| V4.5   | Scénarios Premium (projection 90j temps-réel, comparison matrix, runway+tension par scénario, "promouvoir en base") | ✅ |
| V4.6   | Settings Premium (seuil de confort, export/import JSON, raccourcis) + Import IA (stats bar, filtres, full-width) | ✅ |
| V4.7   | Base Financière Premium (catégories groupées, breakdown bars, search, net hero) | ✅ |
| V4.8   | Onboarding Premium (split-screen, preview live, jauge runway temps-réel, suggestions) | ✅ |
| V4.9   | Command Palette (Cmd+K, fuzzy search, navigation, thème, export, AppSidebarFooter partagé) | ✅ |
| V5.1   | Export PDF rapport mensuel (zero-dependency, window.print) | ✅ |
| V5.2   | Notifications seuil critique (opt-in, 24h cooldown, runway/pointBas/déficit) | ✅ |
| V5.3   | Raccourcis Alt+1..6 globaux (GlobalShortcuts.tsx, toutes les pages) | ✅ |
| V6.1   | Fondations data : `fts-engagements`, `fts-coups-durs`, BaseItem.type/fiabilite, Compte.decouvert, save slots | ✅ |
| V6.2   | Onboarding V2 : SlotSelector (3 créneaux jeu vidéo), CP1 comptes+découvert, CP2 flux enrichis | ✅ |
| V6.3   | Onboarding V2 : CP3 relevé bancaire+detectRecurring, CP4 dettes, CP5 patrimoine, CP6 coups durs, CP7 cockpit | ✅ |
| V6.4   | Cockpit enrichi : FragiliteScore (5 composants), ProchainVirement, arriérés runway, StatBox engagements | ✅ |
| V6.5   | Budget vs Réel : BudgetVsReel dans Analyse, double barre, dérive colorée, alertes > 20% | ✅ |
| V6.6   | Burn rate glissant (3 mois), direction "transfert" neutre P&L, reporté→arriéré auto en Timeline | ✅ |

### Correction critique livrée avec V5.x

**Bug projection runway** : les dépenses dont le `billingDay` est passé ce mois mais non pointées "payé"
étaient comptées deux fois (dans le solde bancaire ET dans la projection future).
Fix : `getPendingOverdueAmount()` dans `src/lib/timeline.ts` → `soldeProjection = soldeEffectif - pendingOverdue`.
Le solde affiché reste `soldeEffectif` (solde bancaire réel) ; les calculs utilisent `soldeProjection`.

---

## Roadmap V6 — Modèle financier complet

| Sprint | Nom | Contenu |
|--------|-----|---------|
| V6.1 | Fondations data | `fts-engagements` (dettes/arriérés), `fts-coups-durs`, extension `BaseItem` (type, fiabilité), extension `Compte` (découvert), save slots onboarding |
| V6.2 | Onboarding V2 — slots + CP1-2 | Écran save slots (3 créneaux nommés, style jeu vidéo), CP1 comptes+découvert, CP2 flux enrichis (billingDay+compte+type) |
| V6.3 | Onboarding V2 — CP3-7 | CP3 relevé optionnel, CP4 dettes+arriérés, CP5 patrimoine (skippable), CP6 coups durs (skippable), CP7 cockpit d'ancrage |
| V6.4 | Cockpit enrichi | Widget prochain virement, arriérés dans runway, score fragilité financière |
| V6.5 | Budget vs Réel | Comparatif prévu/réel par catégorie, dérive, alertes dépassement |
| V6.6 | Burn rate + transferts | Burn rate variable depuis import, transferts inter-comptes neutres, reporté→arriéré auto |

---

## Architecture V4–V5

### Modules

```
src/modules/cockpit/          CockpitView, GaugeCircle, ProjectionCockpit, SignalIA,
                              CockpitKPIs, CeQuiArrive, AlertesActives, ScenarioRapide
src/modules/analyse/          AnalyseView (DonutChart, TendanceChart, HeatmapCalendrier,
                              ScoreCard, DowChart, AIAnalyseNarrative)
src/modules/patrimoine/       PatrimoineView (NetWorthHero, AddActifForm, AddPassifForm, objectifs)
src/modules/focus/            FocusView (inchangé)
src/modules/settings/         SettingsView (PDF export + Notifications)
```

### Stores (persist keys — NE JAMAIS CHANGER sans validation humaine)

```
fts-onboarding          src/store/onboarding.ts     (étendu V6.1 : saveSlots)
fts-base-financiere     src/store/baseFinanciere.ts  (étendu V6.1 : type, fiabilite)
fts-compte              src/store/compte.ts          legacy soldeCourant fallback
fts-comptes             src/store/comptes.ts         (étendu V6.1 : découvert)
fts-timeline            src/store/timeline.ts
fts-scenarios           src/store/scenarios.ts
fts-transactions        src/store/transactions.ts
fts-preferences         src/store/preferences.ts     (étendu V5.2 : notifications)
fts-patrimoine          src/store/patrimoine.ts
fts-engagements         src/store/engagements.ts     (NOUVEAU V6.1)
fts-coups-durs          src/store/coupsDurs.ts       (NOUVEAU V6.1)
```

### Libs

```
src/lib/timeline.ts      getRowsForMonth, getPendingOverdueAmount (ajouté V5.x)
src/lib/tensionScore.ts  computeTensionScore, computeMomentum
src/lib/exportPDF.ts     printRapportPDF (ajouté V5.1)
src/lib/notifications.ts sendFintrackNotification, requestNotificationPermission (ajouté V5.2)
src/lib/analyse.ts       getDailySpending, getDayOfWeekStats, getScoreComportemental
src/lib/reconcile.ts     findMatch
```

### Composants

```
src/components/GlobalShortcuts.tsx                    Alt+1..6 (ajouté V5.3)
src/components/ui/CommandPalette/CommandPalette.tsx   Cmd+K
src/components/ui/AppSidebar/AppSidebarFooter.tsx     Footer partagé
```

---

## Regles invariantes à ne pas casser

- **Persist keys Zustand** : voir tableau stores ci-dessus — jamais renommer sans migration
- **`src/store/compte.ts`** reste legacy pour compatibilité (soldeCourant fallback)
- **ADR-009** : l'IA ne crée/modifie jamais un scénario silencieusement
- **Pas de librairie UI tierce** — SVG fait main, Lucide uniquement pour icônes
- Les transactions réconciliées ne doivent pas créer de doublon dans la Base Financière
- `OPENAI_API_KEY` dans `.env.local` requis pour les routes IA (`/api/ai/*`)
- `soldeProjection` ≠ `soldeEffectif` : toujours distinguer les deux dans les calculs

---

## Checks techniques

```bash
npx tsc --noEmit    # ✅ 0 erreur au 2026-05-15 (après V6.6)
npm run build       # non relancé depuis V5.3
```

**Note** : si `.next` est absent, lancer `npm run build` avant `npx tsc --noEmit`
pour régénérer les types Next.

---

## Prompt de reprise pour un autre agent

```
Tu reprends Fintrack. Repo de travail : https://github.com/metaphike-commits/fintrack-v4

Lis HANDOFF.md, TASKS.md en priorité.

V4.1–V6.6 sont livrées et buildables. Roadmap V6 terminée.
V6 a ajouté : fts-engagements, fts-coups-durs, onboarding 7 checkpoints, score fragilité,
ProchainVirement, BudgetVsReel, burn rate glissant, transferts neutres P&L, reporté→arriéré auto.

L'app est un Next.js 15 App Router avec Zustand persist, SVG hand-drawn charts,
pas de librairie UI tierce, pas de ORM, tout en localStorage.

Avant de coder :
1. résume l'état actuel en 5 lignes
2. identifie quel fichier/store tu vas toucher
3. vérifie que npx tsc --noEmit passe avant et après ta modification
4. ne touche jamais les persist keys Zustand sans validation humaine
```

---

_Dernière mise à jour : 2026-05-15 · Roadmap V6 complète (V6.1–V6.6) · Prochain : QA terrain ou V7_
