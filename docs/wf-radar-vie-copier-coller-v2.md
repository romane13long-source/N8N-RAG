# Radar VIE — Reconstruction à la main (v2, corrigée)

Tout ce qu'on a appris des tests précédents est intégré ici. Suivez dans l'ordre, testez chaque nœud avant de passer au suivant. Créez un **nouveau workflow** nommé **`Radar VIE MVP v2`** (on repart à zéro plutôt que de continuer à corriger l'ancien).

---

## Nœud 1 — Déclencheur Manuel
`+` → `Manual Trigger`. Rien à configurer.

---

## Nœud 2 — Récupérer Offres VIE (HTTP Request)
- **Method** : POST
- **URL** : `https://civiweb-api-prd.azurewebsites.net/api/Offers/search`
- **Send Headers** → activé, ajoutez :

| Name | Value |
|---|---|
| Content-Type | `application/json` |
| Accept | `application/json, text/plain, */*` |
| X-API-KEY | *(votre clé — voir credential n8n "Business France VIE API", ne pas committer en clair)* |
| Origin | `https://mon-vie-via.businessfrance.fr` |
| Referer | `https://mon-vie-via.businessfrance.fr/` |

- **Send Body** → activé → JSON → collez tel quel (⚠️ **sans** `teletravail` ni `porteEnv` — ces deux champs réduisaient le résultat à 6 offres seulement lors de nos tests) :
```json
{
  "limit": 100,
  "skip": 0,
  "query": null,
  "activitySectorId": [],
  "missionsTypesIds": [],
  "missionsDurations": [],
  "geographicZones": [],
  "countriesIds": [],
  "studiesLevelId": [],
  "companiesSizes": [],
  "specializationsIds": [],
  "entreprisesIds": [],
  "missionStartDate": null
}
```
- Onglet **Settings** du nœud → **Retry On Fail** : activé, **Max Tries** : 3, **Wait Between Tries** : 5000 ms.
- **Testez ce nœud seul.** Vous devez voir bien plus que 6 offres (idéalement 50-100). Si vous voyez encore un petit nombre ou une erreur 401, arrêtez-vous et dites-le-moi avant de continuer.

---

## Nœud 3 — Extraire Offres (Code)
- Mode : Run Once for All Items (par défaut)
- Collez ce code :
```javascript
// Cette API n'est pas documentée : sa réponse peut être un tableau brut,
// ou un objet { result / results / data / offers / items: [...] }.
const items = $input.all();
let offers = [];

if (items.length > 1) {
  offers = items.map(i => i.json);
} else {
  const body = items[0].json;
  if (Array.isArray(body)) {
    offers = body;
  } else if (body && typeof body === 'object') {
    for (const key of ['result', 'results', 'data', 'offers', 'items']) {
      if (Array.isArray(body[key])) { offers = body[key]; break; }
    }
  }
}

return offers.map(o => ({ json: o }));
```

---

## Nœud 4 — Normaliser Offre (Edit Fields / Set)
Mode : Manual Mapping. Ajoutez ces champs, tous en **Expression** (icône fx) sauf `pays`/`contrat`/`source` (texte fixe) :

| Name | Value |
|---|---|
| offre_id | `{{ 'vie_' + ($json.id \|\| $json.offerId \|\| $json.Id \|\| $json.ID) }}` |
| titre | `{{ $json.missionTitle \|\| $json.title \|\| $json.mission \|\| $json.label \|\| $json.name \|\| '' }}` |
| entreprise | `{{ $json.organizationName \|\| $json.companyName \|\| $json.company \|\| $json.entreprise \|\| $json.organisation \|\| '' }}` |
| lieu | `{{ $json.cityName \|\| $json.city \|\| $json.ville \|\| '' }}` |
| pays | `{{ $json.countryName \|\| $json.country \|\| $json.pays \|\| '' }}` |
| contrat | `VIE` *(texte fixe)* |
| url | `{{ 'https://mon-vie-via.businessfrance.fr/offres/' + ($json.id \|\| $json.offerId \|\| $json.Id \|\| $json.ID) }}` |
| description | `{{ $json.missionDescription \|\| $json.description \|\| $json.summary \|\| $json.missionDetails \|\| '' }}` |
| date_detection | `{{ $now.toISO() }}` |
| source | `vie_businessfrance` *(texte fixe)* |

---

## Nœud 5 — Filtrer Mots-Clés (Filter) ⚠️ VÉRIFIEZ LA CONNEXION
**Combinator : OR**. Chaque condition : Left Value `{{ $json.titre }}`, Operator `String` → `Contains`.

| Right Value |
|---|
| data |
| analytics |
| analyste |
| ia |
| intelligence artificielle |
| machine learning |
| python |
| bi |
| business intelligence |
| décisionnel |
| big data |

Dans les **Options** du nœud → décochez "Case Sensitive".

**Important** : après l'avoir créé, vérifiez visuellement sur le canvas que ce nœud est bien **relié** entre "Normaliser Offre" et "Filtrer Exclusions" (trait plein des deux côtés) — c'est cette connexion qui a lâché la dernière fois.

---

## Nœud 6 — Filtrer Exclusions (Filter)
**Combinator : AND**. Left Value `{{ $json.titre }}`, Operator `Does Not Contain`.

| Right Value |
|---|
| senior |
| lead |

Options → décochez "Case Sensitive" aussi.

---

## Nœud 7 — Limiter Volume (Limit)
Max Items : `15`

---

## Nœud 8 — Scorer Offre (Basic LLM Chain)
- Prompt Type : **Define**
- Prompt (Expression) :
```
Tu évalues des offres VIE pour Romane, qui cherche un poste tech lié à la donnée (data, IA, analytics...), disponible immédiatement.

Offre à évaluer :
Titre : {{ $json.titre }}
Entreprise : {{ $json.entreprise }}
Pays : {{ $json.pays }}
Lieu : {{ $json.lieu }}
Description : {{ $json.description }}

(La description peut être vide, ce n'est pas anormal.)

Donne un score de 0 à 100 selon la pertinence de cette offre pour ce profil, et une raison courte (1 à 2 phrases) qui justifie ce score.
```
- **Require Specific Output Format** : activé
- Onglet **Settings** → **Retry On Fail** : activé, **Max Tries** : 3, **Wait Between Tries** : 8000 ms *(le modèle Gemini gratuit renvoie parfois une erreur 503 "surchargé" — le retry gère ça tout seul)*

### Sous-nœud Model → Google Gemini Chat Model
- Credential : votre credential Gemini existante
- Model Name : `models/gemini-3.1-flash-lite`

### Sous-nœud Output Parser → Structured Output Parser
- Schema Type : From JSON
- JSON Example :
```json
{
  "score": 78,
  "raison": "Poste lié à la donnée correspondant au profil recherché."
}
```

---

## Nœud 9 — Enregistrer Sheet (Google Sheets)
- Credential : votre credential Google Sheets
- Operation : **Append or Update Row**
- Document : cherchez **"Candidatures - Radar VIE"** (dans "Partagé avec moi")
- Sheet : le premier onglet (renommé "Candidatures" si vous l'avez fait)
- Matching Columns : `offre_id`
- Mapping (Map Each Column Manually) :

| Colonne | Value |
|---|---|
| offre_id | `{{ $json.offre_id }}` |
| source | `{{ $json.source }}` |
| date_detection | `{{ $json.date_detection }}` |
| titre | `{{ $json.titre }}` |
| entreprise | `{{ $json.entreprise }}` |
| pays | `{{ $json.pays }}` |
| lieu | `{{ $json.lieu }}` |
| contrat | `{{ $json.contrat }}` |
| url | `{{ $json.url }}` |
| score | `{{ $json.output.score }}` |
| raison | `{{ $json.output.raison }}` |
| statut | `À valider` *(texte fixe)* |

---

## Test final
1. Sauvegardez (Cmd+S).
2. **Execute workflow** depuis le Déclencheur Manuel.
3. Vérifiez que chaque flèche affiche un nombre d'items cohérent et **décroissant progressivement**, pas un saut brutal à 0 sauf si c'est légitime.
4. Ouvrez le Google Sheet : des lignes doivent apparaître avec statut "À valider".
5. Relancez une deuxième fois : le nombre de lignes ne doit pas doubler (déduplication par offre_id).
