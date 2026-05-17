# TASKS.md — Backlog Fintrack

Mis a jour a chaque debut et fin de sprint.
Source de verite pour les agents IA et les contributeurs humains.

**Repo de travail V5+ : https://github.com/metaphike-commits/fintrack-v4**

---

## Product Vision

Fintrack est une app Next.js de simulation de trajectoire financière personnelle.
Question centrale : "Est-ce que je tiens ce mois-ci, et que dois-je faire maintenant ?"

Le produit combine : base financière structurée, multi-comptes, projection quotidienne jour par jour,
scénarios comparatifs, import CSV/Excel avec réconciliation IA, analyse comportementale,
patrimoine (actifs/passifs/objectifs), cockpit stratégique, et command palette globale.

---

## Etat livré — 2026-05-15

| Sprint | Contenu | Statut |
|--------|---------|--------|
| V4.1 | Cockpit (Signal IA, Runway gauge, Tension Score, Momentum, projection 90j, alertes, scénario rapide) | ✅ |
| V4.2 | Timeline opérationnelle (3 états : réalisés/à venir/reportés, écart, réconciliation, bilan panel) | ✅ |
| V4.3 | Analyse Premium (donut SVG, bar chart, heatmap calendrier, score comportemental, IA narrative, dow chart) | ✅ |
| V4.4 | Patrimoine (actifs, passifs, objectifs, net worth, taux d'endettement, barres de progression) | ✅ |
| V4.5 | Scénarios Premium (90j SVG chart multi-ligne, comparison matrix 6 mois, mini jauge tension, promouvoir en base) | ✅ |
| V4.6 | Settings Premium (seuil confort, export/import JSON, raccourcis) + Import IA (stats bar, filtres, full-width) | ✅ |
| V4.7 | Base Financière Premium (catégories groupées, breakdown bars, search live, net hero, taux d'engagement) | ✅ |
| V4.8 | Onboarding Premium (split-screen, preview live temps-réel, jauge runway SVG, suggestion chips) | ✅ |
| V4.9 | Command Palette Cmd+K (fuzzy search, navigation, thème, export, AppSidebarFooter partagé sur toutes les pages) | ✅ |
| V5.1 | Export PDF rapport mensuel (zero-dependency, window.print, aucune donnée envoyée) | ✅ |
| V5.2 | Notifications seuil critique (opt-in, 24h cooldown, runway/pointBas/déficit mensuel) | ✅ |
| V5.3 | Raccourcis Alt+1..6 globaux (GlobalShortcuts.tsx, toutes les pages, guarded input/meta) | ✅ |

**Correction critique** : Bug projection runway (dépenses billingDay passé non pointées) → `getPendingOverdueAmount()` + `soldeProjection` distinct de `soldeEffectif`.

---

## Active Sprint — V6.5 : Budget vs Réel

### Objectif

Comparatif mensuel dépenses prévues (base financière) vs transactions réelles importées,
par catégorie. Dérive colorée, alerte automatique sur dépassement.

### Tâches

- [ ] Calculer `prévu` par catégorie depuis `fts-base-financiere` (toMensuel par catégorie)
- [ ] Calculer `réel` par catégorie depuis `fts-transactions` (mois courant)
- [ ] Vue comparatif : tableau catégories / prévu / réel / dérive % + montant (vert/orange/rouge)
- [ ] Alerte automatique quand dérive > 20% sur une catégorie
- [ ] Intégrer dans AnalyseView (nouvel onglet) ou vue dédiée `/budget`
- [ ] `npx tsc --noEmit` = 0 erreur

### Critères de done

- Comparatif visible avec au moins une transaction importée
- Dérive colorée (vert < 0%, orange 0–20%, rouge > 20%)
- Alertes générées automatiquement sans interaction

---

## Livré — V6.1–V6.4

| Sprint | Contenu | Statut |
|--------|---------|--------|
| V6.1 | Fondations data : `fts-engagements`, `fts-coups-durs`, BaseItem.type/fiabilite, Compte.decouvert, save slots onboarding | ✅ |
| V6.2 | Onboarding V2 : SlotSelector (3 créneaux jeu vidéo), CP1 comptes+découvert, CP2 flux enrichis (billingDay+type+fiabilite) | ✅ |
| V6.3 | Onboarding V2 : CP3 relevé bancaire (CSV/XLSX+detectRecurring), CP4 dettes, CP5 patrimoine, CP6 coups durs, CP7 cockpit d'ancrage | ✅ |
| V6.4 | Cockpit enrichi : computeFragiliteScore (5 composants), ProchainVirement widget, arriérés dans runway, StatBox engagements | ✅ |

---

## Livré — V6.1–V6.6 (roadmap V6 complète)

| Sprint | Contenu | Statut |
|--------|---------|--------|
| V6.1 | Fondations data : `fts-engagements`, `fts-coups-durs`, BaseItem.type/fiabilite, Compte.decouvert, save slots onboarding | ✅ |
| V6.2 | Onboarding V2 : SlotSelector (3 créneaux jeu vidéo), CP1 comptes+découvert, CP2 flux enrichis (billingDay+type+fiabilite) | ✅ |
| V6.3 | Onboarding V2 : CP3 relevé bancaire (CSV/XLSX+detectRecurring), CP4 dettes, CP5 patrimoine, CP6 coups durs, CP7 cockpit d'ancrage | ✅ |
| V6.4 | Cockpit enrichi : computeFragiliteScore (5 composants), ProchainVirement widget, arriérés dans runway, StatBox engagements | ✅ |
| V6.5 | Budget vs Réel : BudgetVsReel dans Analyse, double barre prevu/reel, dérive colorée, alertes > 20% auto | ✅ |
| V6.6 | Burn rate glissant (3 mois), direction "transfert" neutre P&L, reporté→arriéré auto dans Timeline | ✅ |

---

## Backlog post-V6

---

## Later / Backlog non prioritaire

- Mode multi-utilisateurs / partage
- Application mobile React Native
- Tests E2E automatisés (Playwright)
- Amélioration réconciliation avec tolérance date configurable
- Sidebar collapsible (icon-only mode)

---

## Not Now

- Connexion bancaire native (complexité réglementaire élevée, import manuel suffisant)
- Migration Claude API (reste OpenAI gpt-4o-mini)
- Notifications automatiques sans opt-in
- Action IA qui crée ou modifie des données silencieusement
- Librairie UI tierce (shadcn, MUI, etc.)
- Refonte visuelle globale avant QA terrain V6

---

_Dernière mise à jour : 2026-05-15 · Roadmap V6 complète · Prochain : V7 ou QA terrain_
