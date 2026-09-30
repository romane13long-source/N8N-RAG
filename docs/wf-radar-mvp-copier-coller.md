# WF Radar MVP — Document copier-coller pour n8n

Ce document donne, nœud par nœud, tout ce qu'il faut coller dans l'interface n8n. Suivez l'ordre. Testez après chaque nœud (bouton "Test workflow" ou "Test step").

Workflow à créer : nommez-le **`Radar MVP`**.

---

## Nœud 1 — Déclencheur Manuel

- Recherchez : `Manual Trigger`
- Aucune configuration.

---

## Nœud 2 — Récupérer Offres Adzuna

- Recherchez : `HTTP Request`
- Renommez : `Récupérer Offres Adzuna`
- **Method** : `GET`
- **URL** :
```
https://api.adzuna.com/v1/api/jobs/fr/search/1
```
- **Send Query Parameters** : activé. Ajoutez ces 4 paires (Name / Value) :

| Name | Value |
|---|---|
| app_id | *votre app_id Adzuna* |
| app_key | *votre app_key Adzuna* |
| results_per_page | `20` |
| what | `data scientist` |

---

## Nœud 3 — Extraire Résultats

- Recherchez : `Split Out`
- Renommez : `Extraire Résultats`
- **Field to Split Out** : `results`

---

## Nœud 4 — Normaliser Offre

- Recherchez : `Edit Fields` (nom interne : Set)
- Renommez : `Normaliser Offre`
- Mode : `Manual Mapping`
- Ajoutez ces champs (type "Expression" pour chacun, cliquez l'icône fx à côté du champ) :

| Name | Value (Expression) |
|---|---|
| offre_id | `{{ 'adzuna_' + $json.id }}` |
| titre | `{{ $json.title }}` |
| entreprise | `{{ $json.company.display_name }}` |
| lieu | `{{ $json.location.display_name }}` |
| pays | `France` |
| url | `{{ $json.redirect_url }}` |
| description | `{{ $json.description }}` |
| date_detection | `{{ $now.toISO() }}` |
| source | `adzuna` |

---

## Nœud 5 — Filtrer Critères

- Recherchez : `Filter`
- Renommez : `Filtrer Critères`
- Combinator : `AND`
- Options du nœud (section "Options" en bas du panneau) → **décochez "Case Sensitive"**.
- Ajoutez 5 conditions, toutes avec :
  - Left Value : `{{ $json.titre }}`
  - Operator : `String` → `Does Not Contain`
  - Right Value : selon la ligne ci-dessous

| # | Right Value |
|---|---|
| 1 | `senior` |
| 2 | `lead` |
| 3 | `stage` |
| 4 | `stagiaire` |
| 5 | `alternance` |

---

## Nœud 6 — Limiter Volume

- Recherchez : `Limit`
- Renommez : `Limiter Volume`
- **Max Items** : `15`

---

## Nœud 7 — Scorer Offre (+ 2 sous-nœuds IA)

### 7a. Nœud principal
- Recherchez : `Basic LLM Chain`
- Renommez : `Scorer Offre`
- **Prompt Type** : `Define`
- **Text** (Prompt, mode Expression) — copiez-collez tel quel :
```
Tu évalues des offres d'emploi pour Romane, qui candidate à des postes de Data Scientist ou ML Engineer en CDI/CDD/VIE, avec 0 à 2 ans d'expérience, disponible immédiatement.

Offre à évaluer :
Titre : {{ $json.titre }}
Entreprise : {{ $json.entreprise }}
Lieu : {{ $json.lieu }}
Description : {{ $json.description }}

Donne un score de 0 à 100 selon la pertinence de cette offre pour ce profil (poste Data Scientist ou ML Engineer, niveau débutant à 2 ans d'expérience, jamais senior ni lead), et une raison courte (1 à 2 phrases) qui justifie ce score.
```
- **Require Specific Output Format** : activé (coche "Has Output Parser").

### 7b. Sous-nœud : Google Gemini Chat Model
- Cliquez sur le connecteur "Chat Model" sous le nœud Scorer Offre → `Google Gemini Chat Model`
- **Credential** : votre credential Google Gemini (API key) déjà créée.
- **Model Name** : `models/gemini-3.1-flash-lite`

### 7c. Sous-nœud : Structured Output Parser
- Cliquez sur le connecteur "Output Parser" sous le nœud Scorer Offre → `Structured Output Parser`
- **Schema Type** : `From JSON`
- **JSON Example** — copiez-collez :
```json
{
  "score": 82,
  "raison": "Poste de Data Scientist correspondant au profil débutant recherché, stack cohérente avec l'expérience de Romane."
}
```

---

## Nœud 8 — Enregistrer Sheet

- Recherchez : `Google Sheets`
- Renommez : `Enregistrer Sheet`
- **Credential** : votre credential Google Sheets.
- **Operation** : `Append or Update Row`
- **Document** : sélectionnez votre Google Sheet « Candidatures »
- **Sheet** : onglet `Candidatures`
- **Matching Columns** : `offre_id`
- **Mapping** (mode "Map Each Column Manually") :

| Colonne Sheet | Value (Expression) |
|---|---|
| offre_id | `{{ $json.offre_id }}` |
| source | `{{ $json.source }}` |
| date_detection | `{{ $json.date_detection }}` |
| titre | `{{ $json.titre }}` |
| entreprise | `{{ $json.entreprise }}` |
| pays | `{{ $json.pays }}` |
| lieu | `{{ $json.lieu }}` |
| url | `{{ $json.url }}` |
| score | `{{ $json.output.score }}` |
| raison | `{{ $json.output.raison }}` |
| statut | `À valider` *(texte fixe, pas une expression)* |

⚠️ Le chemin `$json.output.score` est l'emplacement habituel où n8n place la réponse structurée du Basic LLM Chain. Si le test d'exécution montre une autre structure (regardez le panneau de sortie du nœud "Scorer Offre" après un test), ajustez `output.score` / `output.raison` en conséquence — ne collez pas ce chemin les yeux fermés, vérifiez-le sur votre exécution réelle.

---

## Test de bout en bout

1. Sauvegardez (Cmd+S).
2. Cliquez sur le nœud `Déclencheur Manuel`, puis **Test workflow**.
3. Vérifiez à chaque nœud (petit badge vert) que le nombre d'items a du sens : Adzuna doit renvoyer ~20 offres, le filtre doit en retirer certaines, 15 max passent au scoring.
4. Ouvrez le nœud `Scorer Offre` après exécution, onglet Output : vérifiez que `score` et `raison` sont bien présents et cohérents.
5. Ouvrez votre Google Sheet : les lignes doivent apparaître avec statut `À valider`.
6. Relancez une deuxième fois : le nombre de lignes ne doit **pas** doubler (test de la déduplication par `offre_id`).
