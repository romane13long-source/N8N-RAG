# Radar VIE — Candidatures automatiques Data/Tech

Workflow n8n qui repère automatiquement les offres VIE liées à la data sur le site officiel de Business France, les note avec Gemini, et les enregistre dans un Google Sheet pour validation.

## Contenu du dépôt

- [`n8n/workflows/vie-mvp.workflow.ts`](n8n/workflows/vie-mvp.workflow.ts) — le workflow n8n (format TypeScript SDK), exporté depuis n8n Cloud.
- [`specs/specs-cible-vie.md`](specs/specs-cible-vie.md) — les specs complètes du projet (objectif, critères, contraintes, points ouverts).
- [`specs/specs-mvp-vie.md`](specs/specs-mvp-vie.md) — description courte de ce que fait la version actuelle du workflow.
- [`skills/`](skills/) — skills Claude Code utilisés pendant la construction de ce projet ([`interview-specs`](skills/interview-specs/SKILL.md), [`hostile-review`](skills/hostile-review/SKILL.md), [`doubt-driven-development`](skills/doubt-driven-development/SKILL.md)). Version à jour dans [claude-skills](https://github.com/romane13long-source/claude-skills).

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

---

# RAG Livre — Pipeline RAG hybride (projet de cours)

Deuxième workflow de ce dépôt : un pipeline RAG (Retrieval-Augmented Generation) complet sur un livre PDF, avec recherche hybride (vecteur + mots-clés) et reranking.

- [`n8n/workflows/RAG Livre v22.workflow.ts`](n8n/workflows/RAG%20Livre%20v22.workflow.ts) — version finale.

## Architecture

**Ingestion** (formulaire d'upload PDF) :
Upload → Extraction texte → Nettoyage/structuration → Chunking sémantique (découpe par section/paragraphe, chevauchement) → Extraction de mots-clés par chunk (Augmentation) → Embedding Gemini → Insertion Postgres (Supabase), mots-clés stockés en metadata pour la recherche plein texte.

**Chat / Answering**, construit nœud par nœud (pas de nœud "AI Agent" natif, pour que chaque étape soit explicite) :

1. **Contexte** — récupère l'historique de la conversation (Postgres).
2. **Routing** — Gemini reformule la question en requête de recherche autonome à partir du contexte (résout les pronoms/références implicites).
3. **Search** — recherche en parallèle par similarité vectorielle (nœud natif Supabase Vector Store) et par mots-clés (`ts_rank` Postgres).
4. **Reranking** — fusion des deux classements par Reciprocal Rank Fusion (RRF, k=60) : un passage bien classé dans les deux méthodes remonte en tête.
5. **Generation** — Gemini répond à partir des meilleurs passages + historique, puis l'échange est sauvegardé.

## Modèles utilisés

- Chat/Routing/Génération : `gemini-flash-lite-latest`
- Embeddings : `gemini-embedding-2` (3072 dimensions)

## Points de vigilance

- Le quota gratuit de l'API Gemini est limité par minute : des tests rapprochés peuvent déclencher des erreurs 429 ("too many requests"), pas un bug du workflow.
- Nécessite une table `documents` (colonnes `content`, `metadata jsonb`, `embedding vector(3072)`, `content_tsv` généré à partir de `content` + `metadata->>'keywords'`) et une table `chat_messages` (historique de conversation) dans Supabase.
