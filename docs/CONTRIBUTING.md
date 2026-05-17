# CONTRIBUTING.md — Règles de collaboration

Ce document s'applique à tous les contributeurs humains et agents IA.

---

## Principes fondamentaux

1. **Une PR = une responsabilité.**
   Une PR ne peut pas mélanger design system, logique métier, IA et refactor global. Si une PR touche à des domaines différents, elle doit être découpée.

2. **Le code non demandé n'est pas le bienvenu.**
   Ne pas refactorer du code hors du scope de la tâche. Ne pas "améliorer" des fichiers adjacents pendant qu'on travaille sur une feature. Le scope est défini par `docs/TASKS.md`.

3. **La documentation n'est pas optionnelle.**
   Chaque fin de sprint = `docs/HANDOFF.md` mis à jour. Chaque décision structurante = entrée dans `docs/DECISIONS.md`.

---

## Workflow Git

### Créer une branche

```bash
git checkout dev
git pull origin dev
git checkout -b feature/s1-button-component
```

### Nommage des branches

```
feature/[sprint]-[description-courte]   # nouvelle fonctionnalité
fix/[description]                        # correction de bug
docs/[description]                       # documentation uniquement
chore/[description]                      # maintenance, config
refactor/[description]                   # refactor sans changement de comportement
```

### Commits

Format : `type(scope): message court en français ou anglais`

```
feat(ds): add Button primary variant
fix(runway): handle negative balance edge case
docs(handoff): update sprint 1 handoff
chore(deps): add lucide-react
refactor(store): extract runway selectors
```

Types autorisés : `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`

---

## Pull Requests

### Règle d'or
**Une PR ne peut pas mélanger :**
- Design system + logique métier
- Logique métier + refactor global
- Feature produit + mise à jour de dépendances
- IA + UI + store en même temps

Si c'est nécessaire, découper en plusieurs PRs séquentielles.

### Cible des PRs
- Features et fixes → `dev`
- `dev` → `main` uniquement en fin de sprint, après validation

### Format du titre
```
[S1] feat: Add Button component with all variants
[S2] fix: Wizard step 3 navigation broken on mobile
[hotfix] fix: Runway calculation negative balance
```

### Checklist avant de soumettre une PR

- [ ] Le code compile sans erreur TypeScript (`npx tsc --noEmit`)
- [ ] Aucun `console.log` oublié
- [ ] Aucun `any` introduit
- [ ] Le scope de la PR correspond à une seule tâche de `docs/TASKS.md`
- [ ] Le titre de la PR indique le sprint (`[S1]`, `[S2]`...)
- [ ] Si nouvelle dépendance : un ADR a été ajouté dans `docs/DECISIONS.md`
- [ ] Si fin de sprint : `docs/HANDOFF.md` est mis à jour

### Review

- Au moins une review (humain ou agent désigné) avant merge sur `dev`
- Les commentaires de review doivent être résolus ou répondus avant merge
- Squash merge vers `dev` pour garder un historique lisible
- Merge commit vers `main` avec le numéro de sprint

---

## Process de décision

En cas de désaccord sur une approche technique :

1. Chacun argumente sa position en commentaire de PR ou dans une issue
2. Si pas de consensus → ouvrir une discussion dans `docs/DECISIONS.md` (draft ADR)
3. Hamza tranche — décision finale documentée dans l'ADR

Les agents IA ne tranchent pas. Ils proposent et attendent validation humaine pour les décisions architecturales.

---

## Setup local

```bash
# Prérequis
node >= 20
npm >= 10

# Installation
npm install

# Variables d'environnement
cp .env.example .env.local
# OPENAI_API_KEY=sk-...

# Dev
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

---

## Ce qui bloque un merge

- Erreurs TypeScript
- `any` non justifié
- Push direct sur `main` ou `dev`
- PR qui mélange plusieurs domaines
- Absence de mise à jour de `docs/HANDOFF.md` en fin de sprint
- Nouvelle dépendance sans ADR
