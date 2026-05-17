# AGENTS.md — Règles pour agents IA

Ce fichier est lu en priorité par tout agent IA (Claude Code, Cursor, Copilot, etc.) qui travaille sur ce repo.
Le non-respect de ces règles entraîne un rejet de la PR.

---

## 0. Avant de commencer — lecture obligatoire

Dans cet ordre, avant toute action :

1. Lire `docs/HANDOFF.md` — état du repo à la fin du dernier sprint
2. Lire `docs/TASKS.md` — tâches en cours et backlog du sprint actif
3. Lire `docs/DECISIONS.md` — décisions déjà prises (ne pas les remettre en question sans justification explicite)
4. Lire `CLAUDE.md` si tu es Claude Code — conventions spécifiques

---

## 1. Règles Git — non négociables

- **Jamais de push direct sur `main` ou `dev`**
- Chaque tâche = une branche = une PR
- Format de branche : `feature/[sprint]-[description-courte]`
  - Exemples : `feature/s1-button-component`, `feature/s3-home-runway-hero`
- Format de commit : `type(scope): message`
  - Types autorisés : `feat`, `fix`, `docs`, `chore`, `refactor`, `test`
  - Exemple : `feat(ds): add Button primary variant`
- Une PR ne peut pas mélanger design system, logique métier, IA et refactor global

---

## 2. Règles de code

- TypeScript strict — zéro `any`, zéro `as unknown`
- Pas de `eslint-disable` sans commentaire expliquant pourquoi
- Composants UI dans `src/components/ui/`
- Modules métier dans `src/modules/`
- Logique pure (calculs, helpers) dans `src/lib/`
- Types dans `src/types/`
- Routes API dans `src/app/api/`
- Zéro logique métier dans les composants UI du design system
- Un composant = un fichier = un dossier si complexe

---

## 3. Règles de périmètre

- Ne refactore pas du code hors du scope de la tâche assignée
- Ne crée pas de nouveaux fichiers qui ne sont pas dans `docs/TASKS.md`
- Ne modifie pas `docs/DECISIONS.md` sans justification explicite dans la PR
- Ne change pas le design system depuis un sprint fonctionnel (et vice-versa)
- Si une ambiguïté bloque, **signale-la avant de coder** — ne devine pas

---

## 4. Fin de sprint — handoff obligatoire

À la fin de chaque sprint, mettre à jour `docs/HANDOFF.md` avec :
- Ce qui est livré (liste précise)
- Ce qui est en WIP (et pourquoi)
- Les décisions prises pendant le sprint (à reporter dans `docs/DECISIONS.md`)
- Les points d'attention pour le prochain dev ou agent

---

## 5. Ce qu'un agent ne doit jamais faire

- Pousser sur `main` ou `dev` directement
- Créer une PR qui mélange plusieurs sprints
- Modifier les fichiers de documentation sans rapport avec la tâche
- Supprimer ou renommer des fichiers sans le préciser dans la PR description
- Installer de nouvelles dépendances sans les justifier dans `docs/DECISIONS.md`
- Utiliser une librairie de composants tierce (shadcn, MUI, Radix) — les composants sont écrits from scratch
- Utiliser `@anthropic-ai/sdk` — l'API IA est OpenAI uniquement

---

## 6. Stack autorisée

```
next@15          react@19         typescript@5
tailwindcss      zustand          openai
lucide-react     geist            zod
```

Toute nouvelle dépendance doit faire l'objet d'un ADR dans `docs/DECISIONS.md` avant d'être ajoutée.
