# DECISIONS.md — Log des décisions architecturales

Format ADR (Architecture Decision Record) allégé.
Toute décision structurante doit être logguée ici avant d'être implémentée.
Ne pas modifier une décision existante — ajouter un ADR de révision si nécessaire.

---

## ADR-001 — Design system : composants propres, pas de librairie tierce

**Date :** 2026-05-11
**Statut :** Accepté

**Décision :**
Les composants UI sont écrits from scratch. Pas de shadcn/ui, pas de Radix, pas de MUI.

**Raison :**
Contrôle total du design token. Les librairies tierces imposent leurs conventions de nommage, leurs variantes et leurs styles de base, ce qui crée une friction dès qu'on veut s'en écarter. FTS a un langage visuel spécifique (runway coloré, tension levels, densité d'information) qui ne rentre pas dans les patterns génériques.

**Alternatives rejetées :**
- shadcn/ui : trop opinionated, difficile à sur-styler
- Radix UI primitives : utile mais introduit des conventions de composants qu'on ne contrôle pas entièrement
- MUI : trop lourd, trop "entreprise"

**Conséquence :**
Le Sprint 1 est entièrement dédié à la construction du design system. Aucune feature produit ne peut commencer avant que les composants de base soient livrés.

---

## ADR-002 — Base Financière avant Import IA

**Date :** 2026-05-11
**Statut :** Accepté

**Décision :**
La Base Financière est construite par l'utilisateur (via wizard onboarding) avant que l'import IA soit utilisé pour enrichir ou réconcilier.

**Raison :**
L'utilisateur sait déjà une grande partie de son système financier : son loyer, son salaire, ses abonnements fixes. Partir de l'import IA comme source principale reviendrait à demander à l'IA de deviner une structure que l'utilisateur peut fournir en 3 minutes. L'IA doit réconcilier et enrichir une base existante, pas la construire depuis zéro à partir de relevés bancaires parsés.

**Conséquence :**
Le Sprint 2 (Onboarding & Base Financière) précède le Sprint 6 (Import IA réconciliateur). L'import IA en Sprint 6 prend la Base Financière comme référentiel et tente de faire correspondre les transactions importées aux items structurels existants.

---

## ADR-003 — OpenAI uniquement pour les routes IA

**Date :** 2026-05-11
**Statut :** Accepté

**Décision :**
Toutes les routes API IA utilisent le SDK OpenAI (`openai` package) — `gpt-4o-mini` pour les routes textuelles (`categorize`, `insight`, `scenario-parse`), `gpt-4o` pour la route vision (`pdf-parse`, sur PDF scannés). Aucune route n'utilise `@anthropic-ai/sdk`.

**Raison :**
Cohérence de stack, un seul contrat d'API à maintenir, une seule clé d'environnement (`OPENAI_API_KEY`). Le SDK OpenAI est mature et bien documenté.

**Précision (corrigée 2026-09-01) :** aucune route n'utilise le function calling / tool use d'OpenAI. Chaque route fait un seul appel prompt → JSON (`response_format: json_object`), validé côté serveur avec zod. C'est du "structured-output prompting", pas du function calling au sens where le modèle choisit d'invoquer un outil.

**Conséquence :**
`@anthropic-ai/sdk` est interdit dans ce repo. Toute route IA est dans `src/app/api/ai/`.

---

## ADR-004 — Next.js App Router, pas Pages Router

**Date :** 2026-05-11
**Statut :** Accepté

**Décision :**
Next.js 15 avec App Router. Tout le code dans `src/`. Server Components par défaut, `"use client"` uniquement si nécessaire.

**Raison :**
App Router est le standard Next.js depuis v13. Server Components réduisent le JS client. Les routes API bénéficient des Route Handlers modernes.

**Conséquence :**
Pas de `getServerSideProps`, pas de `getStaticProps`. Les composants qui utilisent des hooks React (useState, useEffect, Zustand) ont `"use client"` en tête de fichier.

---

## ADR-005 — Zustand pour le state global, pas Redux ni Context

**Date :** 2026-05-11
**Statut :** Accepté

**Décision :**
Zustand avec middleware `persist` pour le state global. Pas de Redux, pas de React Context pour l'état applicatif.

**Raison :**
Zustand est léger, sans boilerplate, compatible avec Next.js App Router. Le middleware `persist` gère la sérialisation localStorage sans configuration complexe. Redux serait surdimensionné pour ce produit.

**Conséquence :**
Le store est dans `src/store/index.ts`. La fonction `partialize` contrôle ce qui est persisté. Les selectors sont des fonctions exportées depuis le store.

---

## ADR-006 — V3 : multi-comptes via nouveau store, pas de refonte de BaseItem

**Date :** 2026-05-13
**Statut :** Accepté

**Décision :**
V3.1 introduit un `useComptesStore` distinct de `useBaseFinanciereStore`. Les comptes sont des entités séparées. `BaseItem` reçoit un `compteId?: string` optionnel et un `billingDay?: number` optionnel. `src/store/compte.ts` (mono-compte) est déprécié mais pas supprimé en V3.1 pour ne pas casser les composants existants.

**Raison :**
Fusionner les comptes dans `BaseItem` serait une confusion conceptuelle : un compte est un conteneur persistant, un item est une ligne de budget récurrente. Les garder séparés permet de rattacher plusieurs items au même compte, et de calculer le runway depuis la somme des soldes de comptes sans dépendre des items.

**Alternatives rejetées :**
- Ajouter `comptes: Compte[]` dans `useBaseFinanciereStore` : mélange deux concepts distincts dans un même store.
- Remplacer `soldeCourant` par un array inline : brise la rétrocompatibilité immédiatement.

**Conséquence :**
`src/store/comptes.ts` (pluriel) est le nouveau store V3. `src/store/compte.ts` (singulier) reste fonctionnel jusqu'à ce que tous ses consommateurs soient migrés. La migration est progressive, sprint par sprint.

---

## ADR-007 — V3 : `billingDay` optionnel, jamais obligatoire

**Date :** 2026-05-13
**Statut :** Accepté

**Décision :**
Le champ `billingDay` (jour du mois de prélèvement, 1-31) est optionnel sur `BaseItem`. Il n'est visible dans l'UI que si `frequence === "mensuel"`. Les items sans `billingDay` sont distribués uniformément dans le mois pour les calculs de point bas.

**Raison :**
Forcer `billingDay` casserait tous les items existants et alourdirait l'onboarding. La valeur principale (point bas du mois) est approximée même sans `billingDay` exact — et s'améliore progressivement au fil des renseignements de l'utilisateur.

**Conséquence :**
`lib/projection.ts` doit gérer les deux cas : item avec `billingDay` (placement exact dans le mois) et item sans (distribution uniforme ou jour 1 par défaut).

---

## ADR-008 — V3 : Mode Focus en route séparée, pas un overlay

**Date :** 2026-05-13
**Statut :** Accepté

**Décision :**
Le Mode Focus est une route Next.js `/focus` avec son propre layout (sans AppShell, sans sidebar). Ce n'est pas une modal ou un overlay sur la Home.

**Raison :**
Un overlay ne peut pas être bookmarké, ne peut pas gérer proprement le scroll et le plein écran, et complique la gestion du state. Une route dédiée permet un layout totalement différent (pas d'AppShell), une URL partageable, et une navigation claire (retour via le bouton "Revenir au réel").

**Conséquence :**
`src/app/focus/page.tsx` avec un layout sans sidebar. Le lien vers `/focus` est accessible depuis la Home et la Timeline.

---

## ADR-009 — V3 : scénarios conversationnels — l'IA structure, l'humain valide

**Date :** 2026-05-13
**Statut :** Accepté

**Décision :**
La route `/api/ai/scenario-parse` prend une phrase en langage naturel et retourne un objet scénario structuré (delta items). Ce scénario est présenté à l'utilisateur pour validation avant toute écriture dans le store. L'IA ne peut jamais créer ou modifier un scénario silencieusement.

**Raison :**
Les calculs financiers doivent rester déterministes et sous contrôle de l'utilisateur. Une IA qui modifie des données sans confirmation crée de la méfiance et des erreurs potentiellement coûteuses.

**Conséquence :**
Le flow est toujours : input naturel → parsing IA → affichage du scénario proposé → confirmation utilisateur → écriture store. Jamais de raccourci.

---

## ADR-010 - V3 : support Excel via `xlsx`

**Date :** 2026-05-13
**Statut :** Accepte

**Decision :**
Le package `xlsx` est autorise pour lire les imports Excel `.xlsx` et `.xls` cote client dans le module Import.

**Raison :**
Les utilisateurs francais exportent souvent leurs releves depuis leur banque en Excel plutot qu'en CSV. Supporter Excel reduit la friction d'import et augmente la valeur de la reconciliation sans imposer une connexion bancaire native.

**Alternatives rejetees :**
- Forcer CSV uniquement : trop fragile pour l'usage reel.
- Connexion bancaire native immediate : trop sensible et trop couteuse pour V3.
- Parser Excel maison : risque technique inutile.

**Consequence :**
`src/lib/csvParser.ts` unifie CSV et Excel via `parseFile(file: File)`. Toute evolution de l'import doit garder explicite le format supporte et ne doit pas envoyer les releves bancaires a une API externe sans consentement clair.

---

## ADR-011 — Sprint fiabilisation : ESLint (`eslint-config-next`)

**Date :** 2026-08-05
**Statut :** Accepté

**Décision :**
`eslint` + `eslint-config-next` (pinné en `^15`, aligné sur `next@15.5.18` installé — la dernière version publiée du package est en `16.x` et n'est pas compatible avec ce projet) + `@eslint/eslintrc`, config flat `eslint.config.mjs` étendant `next/core-web-vitals` + `next/typescript`. Script `npm run lint` ajouté.

**Raison :**
Aucun lint n'existait sur ce repo (ni script, ni config, ni dépendance) malgré `npx tsc --noEmit` déjà en place. ESLint attrape des classes d'erreurs que TypeScript strict ne couvre pas (hooks React mal dépendantés, imports morts, a11y basique).

**Décision annexe — `react/no-unescaped-entities` désactivée :**
L'UI est entièrement en français (texte riche en apostrophes : "l'app", "n'est", "aujourd'hui"...). Cette règle exige `&apos;` partout pour un gain nul en correction réelle (un `'` littéral s'affiche correctement) — l'activer aurait forcé l'échappement de dizaines de chaînes existantes sans rapport avec ce sprint. Décision réversible si l'équipe préfère la stricte conformité HTML.

**Conséquence :**
`npm run lint` doit passer (0 erreur) avant tout merge. Les warnings restants (`react-hooks/exhaustive-deps`, variables inutilisées — 22 au 2026-08-05) sont volontairement laissés pour un futur sprint dédié : plusieurs `exhaustive-deps` touchent des `useMemo`/`useEffect` avec `now = new Date()`, où ajouter la dépendance changerait le comportement (recalcul à chaque render) plutôt que de le corriger — nécessite une revue au cas par cas, pas un fix mécanique.

---

## ADR-012 — Sprint fiabilisation : Vitest pour les tests unitaires

**Date :** 2026-08-05
**Statut :** Accepté

**Décision :**
`vitest` + `vite-tsconfig-paths` (résout l'alias `@/*` de `tsconfig.json`). Script `npm run test`. Tests co-localisés dans `src/lib/__tests__/`, ciblés sur les modules de calcul financier : `runway.ts`, `projection.ts`, `timeline.ts`, `budget.ts`.

**Raison :**
Zéro test existait sur ce repo. Vitest est plus léger que Jest, ESM/TS natif sans configuration de transform séparée, et suffisant pour tester des fonctions pures — pas besoin de `@vitejs/plugin-react` ni de DOM (`jsdom`), aucun des fichiers testés ne rend de JSX. Playwright (déjà mentionné dans le backlog `docs/TASKS.md` pour du E2E) reste hors scope de cette décision : sujet différent (bout-en-bout vs unitaire).

**Conséquence :**
`npm run test` doit passer avant tout merge touchant `src/lib/`. Les stores Zustand important `persist` (`store/budget.ts`, `store/engagements.ts`) sont importés transitivement par certains tests (via `lib/budget.ts`) — safe en environnement Node car `persist` détecte l'absence de `window` et n'essaie pas de toucher `localStorage`, comme il le fait déjà côté SSR Next.js.
