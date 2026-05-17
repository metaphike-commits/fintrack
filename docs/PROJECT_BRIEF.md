# Project Brief — Financial Trajectory Simulator V3

---

## Thèse produit V3

**V3 fusionne la puissance conceptuelle de V1 avec la discipline UX/UI de V2, pour répondre à une seule question : "Est-ce que je tiens ce mois-ci, et que dois-je faire maintenant ?"**

- V1 avait le moteur : runway, projection, scénarios, analyse comportementale. L'UX était rugueuse.
- V2 a le socle : design system, discipline, architecture propre. Mais elle a simplifié à l'excès des concepts que V1 avait bien résolus.
- V3 enrichit la profondeur produit sans repartir from scratch. Elle garde le design system V2, la gouvernance V2, et ajoute les couches manquantes.

---

## Le problème réel

La majorité des personnes ne savent pas, à un instant T, si leur trésorerie va tenir jusqu'à la fin du mois. Elles le découvrent quand c'est trop tard — quand le compte est à sec, quand le prélèvement est refusé, quand elles doivent arbitrer en urgence.

Les outils existants répondent à cette question de façon rétrospective (tu as trop dépensé en restaurant ce mois) ou administrative (voici ton budget catégorisé). Personne ne répond à la question prospective et actionnelle : **tu tiens, ou tu ne tiens pas — et voilà ce que tu peux faire maintenant.**

---

## Positionnement

| Dimension | Position FTS V3 |
|---|---|
| Audience cible | Salarié ou indépendant avec cash flow tendu, revenus < 4 000 €/mois nets |
| Question centrale | "Est-ce que je tiens ce mois-ci ?" |
| Différenciation | Multi-comptes + runway visible + scénarios conversationnels + analyse comportementale |
| Ton | Direct, factuel, sans jugement — comme un bon DAF personnel |
| IA | Proactive et inline — jamais un bouton à cliquer. Validée par l'utilisateur avant toute action. |

---

## Concepts structurants V3

### 1. Multi-comptes
L'utilisateur a plusieurs comptes : courant, épargne, crédit, cash. Chaque compte a un solde, un type, une institution. Le runway est calculé depuis la somme des comptes marqués `includedInRunway`. Les prélèvements sont rattachés au compte qui les porte.

### 2. Base Financière enrichie
En plus des items V2, chaque item mensuel peut avoir un `billingDay` (jour du mois de prélèvement). Cela permet de calculer le **point bas du mois** — le moment où le solde est le plus bas avant que le salaire rentre. C'est la donnée la plus importante pour éviter les incidents.

### 3. Page Aujourd'hui décisionnelle
Pas un dashboard récapitulatif. Une synthèse **actionnelle** qui répond immédiatement à : solde réel disponible, reste à payer ce mois, prochain gros paiement, point bas du mois, runway trésorerie, runway confort, insight IA, action recommandée.

### 4. Timeline + courbe de solde
La liste d'événements du mois est surmontée d'une courbe de solde projetée jour par jour. On voit immédiatement quand le solde va descendre en zone fragile, quel paiement en est responsable, et combien de jours de marge il reste.

### 5. Mode Focus
Vue plein écran, sans chrome, conçue pour la décision lucide. Courbe principale sur 90 jours, zone critique colorée, ligne aujourd'hui, scénario actif superposé. Crée une sensation de "tension lucide" — l'utilisateur voit exactement où il en est.

### 6. Scénarios conversationnels
L'utilisateur décrit sa décision en langage naturel. L'IA structure le scénario. L'utilisateur valide avant que quoi que ce soit soit enregistré. Le scénario peut être superposé sur la timeline et le Mode Focus.

### 7. Historique & analyse comportementale
Les transactions importées alimentent un module d'analyse : top marchands, jours de dépense, anomalies, dépenses compressibles, projection "si rien ne change". L'utilisateur comprend ses patterns sans avoir à chercher.

---

## Règles produit V3 — non négociables

1. **Les calculs financiers sont déterministes.** Jamais d'approximation, jamais d'arrondi surprenant.
2. **Toute action IA doit être validée par l'utilisateur avant d'être enregistrée.** L'IA suggère, l'humain décide.
3. **Le Mode Focus ne modifie jamais les données réelles.** C'est une vue en lecture seule de la projection.
4. **Un scénario ne touche jamais la Base Financière sans confirmation explicite.**
5. **L'import ne réconcilie pas silencieusement.** Chaque match proposé est présenté à l'utilisateur.

---

## Ce que V3 n'est pas

- Pas un agrégateur bancaire natif (import CSV/Excel + réconciliation IA)
- Pas un outil de gestion patrimoniale (pas d'investissements, portefeuilles, crypto)
- Pas un outil collaboratif multi-utilisateurs (usage individuel)
- Pas une application mobile native (Next.js responsive)
- Pas un outil de comptabilité (pas de bilan, pas de P&L)

---

## Marché et concurrence

| Acteur | Force | Gap que FTS comble |
|---|---|---|
| Bankin' / Linxo | Agrégation bancaire | Pas de projection ni de scénarios |
| YNAB | Méthodologie budget | Pas adapté France, pas de runway |
| Finary | Wealth tracking | Pas de cash flow quotidien |
| Cleo | IA conversationnelle | Pas de profondeur analytique |
| Copilot Money | Design de référence | US only, pas de marché FR |

**FTS V3 est le seul outil qui combine runway prospectif + multi-comptes + scénarios conversationnels + analyse comportementale + Mode Focus pour le marché français.**

---

## Métriques de succès V3

- L'utilisateur voit son point bas du mois sans explication : ✓ dès la Home V3.2
- L'utilisateur crée un scénario depuis une phrase naturelle en < 30 secondes : ✓ V3.5
- Le Mode Focus donne une sensation immédiate de la trajectoire : ✓ V3.4
- L'import réconcilie automatiquement > 70% des transactions sans erreur : ✓ V3.7

---

## Historique des versions

| Version | Thèse | État |
|---|---|---|
| V1 | Moteur riche, UX rugueuse | Archivée — référence conceptuelle |
| V2 | Socle UI/DS propre, produit simplifié | ✅ Livré sur `main` (2026-05-13) |
| V3 | Fusion V1 + V2 — profondeur + discipline | 🚧 En cours |
