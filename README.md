# Radar VIE — Candidatures automatiques Data/Tech

Workflow n8n qui repère automatiquement les offres VIE liées à la data sur le site officiel de Business France, les note avec Gemini, et les enregistre dans un Google Sheet pour validation.

## Contenu du dépôt

- [`n8n/workflows/vie-mvp.workflow.ts`](n8n/workflows/vie-mvp.workflow.ts) — le workflow n8n (format TypeScript SDK), exporté depuis n8n Cloud.
- [`specs/specs-cible-vie.md`](specs/specs-cible-vie.md) — les specs complètes du projet (objectif, critères, contraintes, points ouverts).
- [`specs/specs-mvp-vie.md`](specs/specs-mvp-vie.md) — description courte de ce que fait la version actuelle du workflow.

## Ce que fait le workflow aujourd'hui

1. Interroge l'API du site VIE de Business France (jusqu'à 100 offres).
2. Extrait et normalise les offres (l'API n'est pas documentée officiellement).
3. Filtre sur des mots-clés liés à la data/tech, puis écarte les postes senior/lead.
4. Note chaque offre restante avec Gemini (score 0-100 + raison).
5. Enregistre dans un Google Sheet, avec déduplication par `offre_id`.

## Ce qu'il ne fait pas (encore)

Génération de CV/lettre, envoi automatique de candidature, suivi des réponses — voir `specs/specs-cible-vie.md` pour la vision complète.

## Point de vigilance

La source (API VIE de Business France) n'est pas documentée officiellement ; aucune CGU trouvée qui l'autorise ou l'interdise explicitement. Voir la section correspondante dans les specs.

## Prérequis pour réutiliser ce workflow

- Une clé `X-API-KEY` pour l'API Business France (récupérable depuis l'onglet Network du navigateur sur mon-vie-via.businessfrance.fr).
- Un Google Sheet avec les colonnes `offre_id, source, date_detection, titre, entreprise, pays, lieu, contrat, url, score, raison, statut` (+ colonnes réservées pour les phases futures).
- Une credential Google Gemini (API key).
