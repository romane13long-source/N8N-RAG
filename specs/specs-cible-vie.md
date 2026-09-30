Specs | Candidatures automatiques VIE Data / Tech

## 1. Objectif

Repérer automatiquement les nouvelles offres VIE tech liées à la donnée sur le site officiel de Business France, et préparer pour l'utilisatrice un CV et une lettre de motivation adaptés à chaque offre, avec validation humaine avant tout envoi, tout en assurant un suivi détaillé des candidatures et des réponses.

## 2. Phase 1 : déclencheur et résultat attendu

### 2.1 Déclencheur

Le processus démarre à chaque publication d'une nouvelle offre VIE correspondant aux critères ci-dessous, sur le site officiel de Business France (mon-vie-via.businessfrance.fr).

### 2.2 Critères de sélection des offres

| Critère | Valeur retenue |
|---|---|
| Métier | Tout poste tech touchant à la donnée, y compris des intitulés moins évidents (consultant data, développeur Python orienté data…) |
| Zone géographique | Toutes destinations VIE proposées par Business France — **le VIE est par définition une mission hors de France**, la zone "France" du critère générique ne s'applique pas ici |
| Mode de travail | Indifférent |
| Type de contrat | VIE uniquement (seul type de contrat que propose cette source — pas de CDI/CDD sur cette plateforme) |
| Niveau d'expérience | Débutant uniquement (jeune diplômé ou 0 à 2 ans d'expérience) — cohérent avec le dispositif VIE, qui cible structurellement les 18-28 ans en début de carrière |
| Rémunération | Aucune condition (l'indemnité VIE est fixée par pays, non négociable) |

### 2.3 Contenu de chaque candidature

- Un CV adapté à l'offre, qui met en avant les compétences demandées.
- Une lettre de motivation personnalisée.
- Langue : **point ouvert** — la règle "français en France / anglais ailleurs" ne fonctionne pas pour un flux 100% hors-France. À trancher : français pour les destinations francophones (Belgique, Suisse, Québec…), anglais pour les autres ? À confirmer par l'utilisatrice.
- **Garde-fou obligatoire (déjà posé dans les specs générales du projet) : rien n'est envoyé sans validation humaine préalable de l'utilisatrice.** Zéro invention : CV et lettre construits uniquement à partir d'une banque d'expériences réelles.

### 2.4 Suivi attendu

Un suivi centralisé et détaillé, avec pour chaque candidature :
- l'entreprise, le poste, le lieu et le lien vers l'offre ;
- la date d'envoi ;
- le CV et la lettre effectivement envoyés ;
- le statut (à valider, validé, envoyé, entretien, refus…), mis à jour automatiquement à partir des réponses des recruteurs (V1.1 — non implémenté dans la version actuelle).

### 2.5 Alertes

Un e-mail immédiat en cas de réponse positive d'un recruteur (V1.1 — non implémenté dans la version actuelle). Un e-mail d'alerte en cas d'échec technique persistant d'une étape (implémenté : WF3).

## 3. Phase 2 : outils et écosystème

| Élément | Choix |
|---|---|
| Source d'offres | Site officiel des offres VIE de Business France uniquement (mon-vie-via.businessfrance.fr) |
| Sources exclues | LinkedIn (conditions d'utilisation interdisant l'automatisation). Les autres jobboards (Welcome to the Jungle, Indeed, Glassdoor, pages carrières) ne sont pas exclus par principe, simplement hors périmètre de cette version, qui se concentre sur une seule source. |
| Outil de suivi | Google Sheets |
| Adresse e-mail | Adresse personnelle habituelle, pour l'envoi des candidatures, la réception des réponses et les alertes |
| Comptes | Profil à jour sur le site Business France |
| Documents de base | Un CV de référence en français uniquement, sans lettre modèle |

**Limites connues :**
- LinkedIn interdit les méthodes automatisées non autorisées, d'où son exclusion.
- L'accès aux offres VIE passe par une API technique du site, non documentée officiellement par Business France, et protégée par une clé technique embarquée dans le site public plutôt que délivrée à des développeurs tiers. Aucune CGU trouvée qui l'autorise ou l'interdise explicitement. Point de vigilance assumé, pas un feu vert confirmé — voir Point ouvert #1.

## 4. Phase 3 : contraintes opérationnelles et cas d'échec

| Contrainte | Valeur retenue |
|---|---|
| Volume maximum | 10 candidatures par jour visées — probablement optimiste pour une source VIE-only limitée à la data : le volume réel disponible sera vraisemblablement plus faible |
| Budget | Zéro : solutions gratuites uniquement |
| Règle d'arbitrage | En cas de conflit entre le budget et le volume ou la qualité, le budget prime |
| En cas d'échec d'une étape | 3 nouvelles tentatives (fixé dans les specs générales du projet), puis e-mail d'alerte, puis passage à l'offre suivante |

**Confidentialité :**
- La lecture de la boîte e-mail est limitée aux seuls messages liés aux candidatures.
- L'adresse postale et le téléphone ne sont transmis qu'aux recruteurs, jamais à l'IA utilisée pour rédiger les documents.

## 5. Points ouverts et risques

| # | Point | Nature | Impact |
|---|---|---|---|
| 1 | CGU et légitimité de l'API VIE de Business France | À vérifier / zone grise assumée | Si Business France s'y oppose formellement, la source doit être retirée |
| 2 | CV de référence en anglais inexistant | Dépendance | Version anglaise à produire depuis le français : décider si l'utilisatrice la relit avant usage |
| 3 | Règle de langue FR/EN inapplicable telle quelle (aucune offre VIE n'est en France) | Non tranché | Voir §2.3 — à trancher avec l'utilisatrice |
| 4 | Budget nul face au volume de candidatures personnalisées visé | Tension | Le volume réel VIE-data étant probablement faible, la tension est moindre que sur un flux multi-sources, mais existe toujours |
| 5 | Garde-fou « une seule candidature par entreprise » sur une période donnée | Non tranché | Risque d'envoyer plusieurs dossiers au même recruteur |
| 6 | Volume réel d'offres VIE data disponibles par jour | Inconnu | À mesurer sur la première semaine de test — peut remettre en cause l'indicateur "10/jour" |
| 7 | Droit de supprimer à tout moment le suivi et les documents générés (RGPD) | Non retenu explicitement | À confirmer |
| 8 | Accès du processus à la boîte e-mail personnelle | Risque de confidentialité | Nécessite un filtrage strict aux seuls messages de candidature |
