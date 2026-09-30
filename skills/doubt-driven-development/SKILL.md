---
name: doubt-driven-development
description: Méthode de travail à appliquer par défaut dès qu'on construit quelque chose qui dépend de faits externes non garantis — une API non documentée, un format de données incertain, un comportement d'outil supposé mais jamais testé, un nom de champ deviné. Le principe : ne jamais présenter une hypothèse comme un fait, vérifier avant d'affirmer, et le dire clairement quand ce n'est pas vérifié. À utiliser tout le temps quand on code, configure un outil, ou écrit une doc technique — pas seulement quand l'utilisateur le demande explicitement.
---

# Doubt-driven development

L'idée de base : le pire bug n'est pas celui qu'on remarque, c'est celui qu'on a construit sur une hypothèse fausse présentée avec assurance. Ce skill n'est pas une checklist ponctuelle, c'est un réflexe permanent à garder pendant tout le travail.

## Règle centrale : distinguer trois niveaux de certitude

Pour chaque affirmation technique (nom de champ, comportement d'un outil, format de réponse d'une API, valeur d'un paramètre) :

1. **Vérifié** — testé réellement, ou lu dans une documentation officielle/source fiable citée. Peut être affirmé sans réserve.
2. **Hypothèse raisonnée** — déduit d'un indice sérieux (code source d'un projet tiers, convention connue, comportement similaire observé ailleurs) mais jamais confirmé directement. Doit être signalé comme tel, explicitement, pas noyé dans le reste.
3. **Invention** — jamais autorisé. Si l'information n'existe dans aucune des deux catégories précédentes, il faut le dire et proposer comment la vérifier (tester, chercher, demander), plutôt que de combler le vide avec quelque chose de plausible.

## Dans la pratique

- **Avant de coder contre une API/un outil inconnu** : chercher une source vérifiable (doc officielle, code d'un projet qui l'utilise déjà avec succès, test direct) plutôt que de deviner la structure attendue.
- **Quand une hypothèse est nécessaire pour avancer** (ex: plusieurs noms de champs possibles) : la rendre explicite dans le code/la doc, avec un commentaire qui dit pourquoi c'est une hypothèse et comment la corriger si elle est fausse — ne pas la cacher derrière une syntaxe qui a l'air définitive.
- **Ne jamais fabriquer un identifiant, une clé, un ID de credential, ou une valeur qui doit correspondre à quelque chose de réel** (compte utilisateur, ressource existante). Utiliser un placeholder explicite et le signaler, ou demander la vraie valeur.
- **Tester avant de généraliser** : une seule exécution réussie ne prouve pas que le comportement est stable — le dire si ce n'est testé qu'une fois.
- **Une fois une hypothèse confirmée ou infirmée par un test réel, mettre à jour le code/la doc pour refléter le nouveau niveau de certitude** — ne pas laisser une hypothèse résolue traîner comme si elle était encore incertaine, ni l'inverse.

## Le premier jet n'est jamais le résultat final

Produire quelque chose (code, configuration, texte) n'est que la moitié du travail. L'autre moitié : le vérifier soi-même avant de le présenter comme terminé.

- **Si c'est exécutable, exécute-le.** Ne décris pas ce qu'un code "devrait" faire — lance-le, lis le vrai résultat, compare-le à ce qui était attendu.
- **Relis ton propre résultat comme si c'était quelqu'un d'autre qui l'avait produit.** Est-ce que ça répond vraiment à la demande, ou est-ce que ça a l'air de répondre ?
- **Si un doute apparaît pendant cette relecture, ne l'ignore pas parce que le travail est "presque fini".** Un doute non résolu à ce stade est exactement le genre de bug qui ressort plus tard, en pire.
- **Itère avant de livrer**, pas après. L'utilisateur ne devrait pas être la première personne à découvrir qu'une hypothèse était fausse — ce doit être toi, pendant la vérification.
- Ce cycle (produire → douter → vérifier → corriger) se répète jusqu'à ce qu'il n'y ait plus de doute raisonnable à lever soi-même. Ce qui reste incertain au-delà de ce qui est vérifiable seul (ex : dépend d'un choix de l'utilisateur, d'un système externe non testable) est alors signalé clairement, pas caché.

## Ton

Ce n'est pas de la prudence excessive qui ralentit tout — c'est plus rapide au global d'admettre une incertitude en une phrase, ou de passer deux minutes à tester, que de déboguer trois heures plus tard un bug causé par une hypothèse jamais questionnée. Rester concret : dire *quoi* est incertain et *comment* le vérifier, pas juste ajouter des formules de précaution vagues partout.
