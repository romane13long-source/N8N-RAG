# Specs MVP — Radar VIE (Business France)

Chaque exécution récupère les offres VIE publiées sur le site de Business France, ne garde que celles liées à la data (Data Scientist, ML Engineer, IA), les note avec Gemini, et les enregistre dans le Google Sheet « Candidatures ». C'est un seul workflow n8n, déclenché à la main pour l'instant.

## Ce que fait la v0

1. Interroge l'API du site VIE de Business France (100 offres, tous secteurs).
2. Filtre pour ne garder que les offres data (mots-clés dans le titre) et écarte les intitulés "senior"/"lead".
3. Note chaque offre restante avec Gemini (score 0-100 + raison).
4. Enregistre dans le Sheet, avec déduplication automatique par `offre_id`.

## Ce que la v0 ne fait PAS

| Fonctionnalité | Statut |
|---|---|
| Adzuna | Abandonné pour cette version — Business France seul |
| Génération CV / lettre | Reportée |
| Envoi automatique | Reporté |
| Pagination complète (>100 offres) | Non gérée — une seule page pour l'instant |
| Description du poste dans le scoring | Champ incertain, voir note technique ci-dessous |

## Point de vigilance juridique (non résolu, décision assumée par vous)

Cette source utilise une API non documentée par Business France, protégée par une clé technique (`X-API-KEY`) embarquée dans le site public plutôt que délivrée officiellement. Aucune CGU trouvée qui l'autorise ou l'interdise. Vous avez choisi de continuer malgré cette zone grise.

## Note technique — champs incertains

L'API ne documente pas ses champs. Le workflow essaie plusieurs noms possibles pour titre/entreprise/ville/pays (vérifié sur un projet tiers qui utilise cette même API). **Le champ description du poste est une hypothèse non vérifiée** — à confirmer sur votre première exécution réelle.

## Prérequis

- Votre propre clé `X-API-KEY`, récupérée depuis l'onglet Network du navigateur sur mon-vie-via.businessfrance.fr (ne pas réutiliser une clé trouvée ailleurs).
- Google Sheet « Candidatures » + credential Google Sheets dans n8n.
- Credential Google Gemini (déjà créée).
