# Specs MVP — Radar de candidatures (v0)

*Version réduite du 29 septembre 2026, dérivée de `specs-definitives.md` et `architecture-n8n.md`. Objectif : un seul workflow n8n, le plus simple possible, pour valider le mécanisme de bout en bout avant d'ajouter les briques complexes (génération de CV/lettre, envoi, Business France).*

## Pourquoi une v0 réduite

Le projet complet (3 workflows, 2 sources, génération de documents, envoi automatique) est trop d'un coup pour une première construction à la main. Cette v0 vérifie que la chaîne **collecte → filtre → note avec l'IA → stocke** fonctionne réellement, avant d'investir du temps dans la génération de CV/lettre et l'envoi.

## Ce que fait la v0

1. Récupère des offres Data Scientist en France via l'API Adzuna (un seul mot-clé, un seul pays).
2. Écarte les offres trop expérimentées (senior, lead) ou hors profil (stage, alternance).
3. Note chaque offre restante avec Gemini (score 0-100 + raison).
4. Enregistre chaque offre dans l'onglet `Candidatures` du Google Sheet, avec déduplication automatique par `offre_id`.

## Ce que la v0 ne fait PAS (reporté à plus tard)

| Fonctionnalité | Statut |
|---|---|
| Source Business France | Exclue — zone grise juridique non tranchée (API non officielle, CGU introuvables) |
| Multi-pays / multi-mots-clés | Exclu — un seul pays (France), un seul terme (« data scientist ») |
| Génération CV / lettre (Gemini + Google Docs) | Reportée à v1 |
| Envoi automatique / pack prêt (Gmail) | Reporté à v1 |
| Déduplication par Merge explicite | Remplacée par un simple "Append or Update" sur `offre_id` — plus simple, même résultat |
| Workflow séparé WF2 (Envoi) | Sans objet tant qu'il n'y a pas d'envoi |
| Workflow séparé WF3 (Alerte erreur) | Construit à part (déjà fait), pas relié à cette v0 pour l'instant |

## Architecture : un seul workflow, 8 nœuds, aucune branche

```
Déclencheur Manuel
  → Récupérer Offres Adzuna (HTTP Request)
  → Extraire Résultats (Split Out)
  → Normaliser Offre (Edit Fields)
  → Filtrer Critères (Filter)
  → Limiter Volume (Limit)
  → Scorer Offre (Basic LLM Chain + Gemini, sortie structurée)
  → Enregistrer Sheet (Google Sheets, Append or Update)
```

## Critères de filtrage (avant l'IA, gratuit)

Exclure les offres dont le titre contient (insensible à la casse) : `senior`, `lead`, `stage`, `stagiaire`, `alternance`.

## Scoring Gemini

- Entrée : titre, entreprise, lieu, description (snippet Adzuna).
- Sortie structurée : `{ "score": number (0-100), "raison": string }`.
- Critère d'évaluation : pertinence pour un poste Data Scientist / ML Engineer, profil débutant à 2 ans d'expérience (pas senior/lead).

## Colonnes du Sheet utilisées par la v0

`offre_id · source · date_detection · titre · entreprise · pays · lieu · url · score · raison · statut`

(Les autres colonnes du schéma complet — `contrat`, `email_candidature`, `mode_candidature`, `langue`, `cv_pdf_url`, `lettre_pdf_url`, `date_envoi`, `notes` — existent dans le schéma cible mais ne sont pas remplies par la v0.)

Statut fixé par la v0 : toujours `À valider`.

## Prérequis techniques

- Compte développeur Adzuna (`app_id` + `app_key`) — gratuit sur developer.adzuna.com.
- Google Sheet « Candidatures » créé, avec au moins les colonnes ci-dessus dans l'onglet `Candidatures`.
- Credential Google Sheets créée dans n8n.
- Credential Google Gemini (API key) déjà créée.

## Chemin d'évolution vers les specs complètes

Une fois la v0 validée (offres réelles, notées, visibles dans le Sheet, sans doublons sur plusieurs exécutions) :
1. Ajouter Business France comme deuxième source (si le point juridique est tranché).
2. Étendre à plusieurs pays / mots-clés Adzuna.
3. Ajouter la génération de CV/lettre (Google Docs + Drive) sur les offres validées.
4. Ajouter l'envoi automatique (Gmail) une fois le statut « Validé » posé à la main dans le Sheet.
5. Relier WF3 (Alerte erreur) comme error workflow.
