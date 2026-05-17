# Financial Trajectory Simulator — V2

> **"Est-ce que je tiens ce mois-ci, et que dois-je faire maintenant ?"**

FTS est un outil de pilotage financier personnel centré sur la trésorerie quotidienne, la projection de runway, et la planification de décisions de vie via scénarios.

---

## Positionnement

V2 n'est pas une refonte graphique de V1. C'est une reconstruction orientée usage quotidien. Le produit répond à une question unique, posée chaque jour par des millions de personnes : est-ce que ma trésorerie tient, et qu'est-ce que je dois faire maintenant ?

**Ce que FTS V2 est :**
- Un outil de cash flow quotidien avec runway visible en permanence
- Un simulateur de décisions financières via scénarios what-if
- Une base structurelle de la situation financière (Base Financière)
- Un assistant IA proactif qui surface les insights sans bouton à cliquer

**Ce que FTS V2 n'est pas (encore) :**
- Un agrégateur bancaire natif
- Un outil de gestion patrimoniale
- Un remplaçant de comptable

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript strict |
| Style | Tailwind CSS + design tokens propres |
| State | Zustand + persist |
| IA | OpenAI GPT-4o (function calling) |
| Icons | Lucide React |
| Font | Geist (Vercel) |

---

## Lancer en local

```bash
# 1. Cloner le repo
git clone <url> financial-trajectory-simulator-v2
cd financial-trajectory-simulator-v2

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir OPENAI_API_KEY dans .env.local

# 4. Lancer le dev server
npm run dev
```

---

## Documentation

| Document | Contenu |
|---|---|
| [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) | Vision, positionnement, thèses produit |
| [docs/TASKS.md](docs/TASKS.md) | Backlog par sprint, tâches en cours |
| [docs/HANDOFF.md](docs/HANDOFF.md) | État fin de sprint, points d'attention |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Log des décisions architecturales (ADR) |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Règles de collaboration et workflow PR |
| [AGENTS.md](AGENTS.md) | Règles pour les agents IA |
| [CLAUDE.md](CLAUDE.md) | Configuration Claude Code |

---

## Branches

| Branche | Rôle |
|---|---|
| `main` | Production — PR uniquement, jamais de push direct |
| `dev` | Intégration sprint — PR uniquement |
| `feature/[sprint]-[description]` | Une feature, une branche |

---

## Collaborateurs

- Hamza — Product & Dev
- [Ami] — Dev

Agents IA autorisés : Claude Code (Anthropic)
