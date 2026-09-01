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

## ⚠️ Ce fichier était périmé — lu et corrigé le 2026-08-05

Ce HANDOFF pointait vers un repo GitHub (`fintrack-v4`) et décrivait un état
"V4.1–V6.6" daté du 23/05. En pratique, ce dossier local (`financial-trajectory-simulator-v3`,
branche `master`, **aucun remote configuré**) a continué à évoluer séparément
depuis — Budget, Review, Themes (5 thèmes), FinanceSyncProvider, et tout le
travail décrit ci-dessous n'existaient dans aucune doc avant aujourd'hui.
Cette section documente donc l'état réel de **ce dossier**, pas de `fintrack-v4`
(que je n'ai pas les moyens de vérifier). Décision de repo/remote non tranchée
ici — à valider humainement si ça compte encore.

## Current State — Sprint fiabilisation · 2026-08-05

### Sprint actif

**Sprint fiabilisation pré-feature-IA** (priorités définies par audit, puis
audit indépendant recalibré sur le code réel plutôt que sur des suppositions
génériques). Terminé.

### Etat

`npm run lint` = 0 erreur (22 warnings connus, voir ADR-011) · `npx tsc --noEmit` = 0 erreur (à froid, sans build préalable) · `npm run build` = OK · `npm run test` = 45/45 (Vitest, nouveau).

### Livré (2026-08-05)

- **Import Settings sécurisé** — restaurer une sauvegarde JSON exigeait juste de choisir un fichier ; ça écrasait tout instantanément. Ajout d'une étape de confirmation explicite + bouton "sauvegarder l'état actuel d'abord" (`SettingsView.tsx`, même pattern que `confirmReset`). Validation minimale de forme (au moins une clé Fintrack reconnue) avant écriture.
- **Validation zod sur les 4 routes IA** — `categorize`, `insight`, `pdf-parse`, `scenario-parse` ne faisaient que `JSON.parse` + cast TypeScript (aucune garantie runtime). Nouveau `src/lib/ai/schemas.ts`, erreurs de format distinguées des erreurs réseau/API. `categorize` rejette maintenant les catégories que l'IA invente (hors taxonomie `CATEGORIES_FLAT`).
- **Runway harmonisé** — nouveau hook `useSoldeEffectif()` (`src/hooks/useSoldeEffectif.ts`), utilisé par Cockpit/Focus/Scenarios/Timeline/Budget au lieu que chacun refasse `getSoldeRunway(comptes) ?? soldeCourant` séparément. **Volontairement pas unifié plus loin** : Cockpit/Timeline/Budget déduisent `pendingOverdue` et incluent les engagements (vues "réelles") ; Focus/Scénarios ne le font pas (vues exploratoires, badge "Simulation" déjà visible — décision actée au sprint du 23/05, pas un bug).
- **ESLint installé** — inexistant avant (ni script, ni config, ni dépendance). `eslint-config-next` pinné en `^15` (aligné sur `next@15.5.18`). `react/no-unescaped-entities` désactivée (UI 100% française, apostrophes partout) — voir ADR-011.
- **Vitest installé** — 0 test avant. 45 tests ciblés sur `lib/runway.ts`, `lib/projection.ts`, `lib/timeline.ts`, `lib/budget.ts`, dont plusieurs régressions explicites (dérivation `billingDay` depuis `dateDebut`, dépassement de budget qui continue à peser sur la projection au lieu d'être ignoré). Voir ADR-012.
- **Corrections découvertes en cours de session, hors sprint mais déjà commises dans le code** (avant ce sprint fiabilisation, même session) : bug `billingDay` mensuel non dérivé de `dateDebut` (`lib/dateUtils.ts` `resolveBillingDay`), double comptage des comptes crédit dans `getSoldeRunway`, mélange visuel zone négative/seuil de confort dans la courbe Timeline, dépenses variables (enveloppes Budget) désormais liées à la Timeline via une courbe indépendante (n'altère jamais les vrais calculs).

### Non fait / repoussé volontairement

- Les 22 warnings ESLint restants (`react-hooks/exhaustive-deps`, imports inutilisés) — plusieurs touchent des `useMemo` avec `now = new Date()` où ajouter la dépendance changerait le comportement ; nécessite une revue au cas par cas, pas un fix mécanique.
- Commit du travail en attente (~45 fichiers modifiés/nouveaux sur `master`, jamais commités) — signalé, pas résolu : décision de découpage en branches/PR à valider humainement (AGENTS.md exige branche-par-tâche).
- Mise à jour de `docs/PROJECT_BRIEF.md`/`docs/TASKS.md` avec le roadmap réel de ce dossier vs celui de `fintrack-v4` — non tranché, nécessite de clarifier d'abord quel repo est réellement actif.

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
npm run lint        # ✅ 0 erreur, 22 warnings connus (2026-08-05)
npx tsc --noEmit    # ✅ 0 erreur, testé à froid sans .next (2026-08-05)
npm run build       # ✅ OK (2026-08-05) — ⚠️ toujours arrêter le serveur dev
                     #    avant : next dev --turbopack et next build en
                     #    concurrence sur le même .next/ corrompent le build
                     #    (MODULE_NOT_FOUND turbopack_runtime) — pas un bug
                     #    de code, vécu pendant ce sprint.
npm run test        # ✅ 45/45 (Vitest, nouveau)
```

---

## Prompt de reprise pour un autre agent

```
Tu reprends Fintrack (financial-trajectory-simulator-v3, local, pas de remote git).

⚠️ Ce dossier n'est PAS synchronisé avec https://github.com/metaphike-commits/fintrack-v4
mentionné plus haut dans ce fichier — vérifie avec l'humain lequel des deux est
réellement le repo actif avant de supposer quoi que ce soit sur la roadmap V4-V6.

Lis HANDOFF.md (section "Sprint fiabilisation · 2026-08-05" en premier — le
reste du fichier est un ancien état daté du 23/05, gardé pour référence),
TASKS.md, DECISIONS.md (ADR-011 ESLint, ADR-012 Vitest, les plus récents).

Sprint fiabilisation terminé : ESLint + Vitest installés, import Settings
sécurisé (confirmation avant restauration JSON), validation zod sur les 4
routes IA, runway harmonisé via useSoldeEffectif(). 45 tests passent.

L'app est un Next.js 15 App Router avec Zustand persist, SVG hand-drawn charts,
pas de librairie UI tierce, pas de ORM, tout en localStorage.

Avant de coder :
1. résume l'état actuel en 5 lignes
2. identifie quel fichier/store tu vas toucher
3. vérifie npm run lint + npx tsc --noEmit + npm run test avant et après ta modification
4. si tu dois lancer npm run build, arrête d'abord tout `next dev` en cours (même .next/, conflit)
5. ne touche jamais les persist keys Zustand sans validation humaine
```

---

_Dernière mise à jour : 2026-08-05 · Sprint fiabilisation livré (lint/tests/zod/runway/import) · Prochain : décider du repo de référence (ce dossier vs fintrack-v4) puis, si validé, commit du travail en attente en branches/PR_
