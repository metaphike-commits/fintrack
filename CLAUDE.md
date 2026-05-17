# CLAUDE.md — Configuration Claude Code

Ce fichier configure le comportement de Claude Code sur ce repo.
Il complète `AGENTS.md` avec des règles spécifiques à Claude.

---

## Stack et conventions

- **Framework** : Next.js 15 App Router — tout le code dans `src/`
- **Langage** : TypeScript strict — `"strict": true` dans tsconfig
- **Style** : Tailwind CSS uniquement pour les utilitaires de layout/espacement. Les couleurs et tokens viennent de `src/styles/tokens.ts`, jamais en dur
- **State** : Zustand avec `persist` middleware — store dans `src/store/`
- **IA** : OpenAI SDK uniquement (`openai` package) — jamais `@anthropic-ai/sdk`
- **Icons** : Lucide React uniquement — jamais d'Unicode symbols comme icônes

## Conventions de nommage

| Type | Convention | Exemple |
|---|---|---|
| Composants React | PascalCase | `Button.tsx`, `CardHeader.tsx` |
| Hooks | camelCase avec `use` | `useRunway.ts` |
| Utilitaires | camelCase | `formatCurrency.ts` |
| Types | PascalCase | `RunwayConfig`, `FinancialBaseItem` |
| Routes API | kebab-case dans `app/api/` | `app/api/ai/diagnostic/route.ts` |
| Branches git | kebab-case | `feature/s1-button-component` |

## Structure des composants UI

Chaque composant du design system suit ce pattern :

```
src/components/ui/
└── Button/
    ├── Button.tsx        ← composant principal
    ├── Button.types.ts   ← types si complexe
    └── index.ts          ← re-export
```

## Règles de réponse

- Répondre en français sauf pour les noms de variables/fonctions
- Toujours lire `docs/HANDOFF.md` avant de commencer une tâche
- Signaler les ambiguïtés avant de coder — ne pas interpréter silencieusement
- Pas de commentaires évidents dans le code — seulement les WHY non-obvieux
- Une PR = une tâche de `docs/TASKS.md` — pas plus

## Ce que Claude ne doit pas faire sans demander

- Changer l'architecture des dossiers
- Ajouter une dépendance npm
- Refactorer du code hors du scope de la tâche
- Modifier `docs/DECISIONS.md` ou `docs/HANDOFF.md` sans y être invité
- Créer des fichiers de documentation non demandés
