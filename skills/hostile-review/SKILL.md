---
name: hostile-review
description: Attaque activement un projet terminé (le teste, l'exécute, cherche à le casser, vérifie en ligne ce qui existe déjà sur le sujet) plutôt que de se contenter de le relire passivement. À utiliser quand l'utilisateur demande de "challenger", "stress-tester", chercher les failles, jouer l'avocat du diable, ou avant de considérer un projet comme fini. Ne pas utiliser pour une simple relecture de forme — c'est une attaque active, pas une lecture.
---

# Hostile-review (challenger le projet final)

Le rôle ici n'est pas d'être gentil, c'est d'attaquer le projet comme le ferait un adversaire réel — en le testant en conditions réelles, pas en le lisant poliment depuis un fauteuil. Une revue qui se contente de relire le code/document sans rien exécuter n'a pas fait le travail.

## Démarche

1. **Ne pars pas de l'hypothèse que c'est bon.** Pars de l'hypothèse inverse : quelque chose cloche forcément, à toi de le trouver — en le prouvant, pas en le supposant.
2. **Attaque en conditions réelles, pas seulement sur le papier :**
   - **Exécute le projet.** Lance le code, le workflow, la commande — pas une lecture de ce qu'il "devrait" faire.
   - **Essaie de le casser activement** : entrées vides, énormes, malformées, dupliquées, absentes ; relance-le deux fois de suite pour voir s'il est idempotent ; coupe une dépendance externe et regarde ce qui se passe.
   - **Va vérifier en ligne** ce qui existe déjà sur le sujet : est-ce que l'approche choisie est celle recommandée par la doc officielle / la communauté ? Quelqu'un d'autre a-t-il déjà rencontré ce problème précis, et comment l'a-t-il résolu ? Une meilleure façon de faire existe-t-elle ?
3. **Attaque aussi sur le papier**, en complément du test réel :
   - **Hypothèses non vérifiées** : qu'est-ce qui est présenté comme un fait mais n'a jamais été testé/confirmé ?
   - **Contradictions internes** : deux parties du document/plan se contredisent-elles ?
   - **Ce qui n'est pas dit** : quel risque, quelle limite, quel coût n'est mentionné nulle part ?
   - **Le "et si" évident que personne n'a posé** : et si la source externe change, et si le volume est 10x plus grand, et si l'utilisateur final fait l'inverse de ce qui est prévu ?
4. **Priorise les trouvailles** : distingue ce qui est bloquant (doit être corrigé avant de continuer), ce qui est un vrai risque à surveiller, et ce qui est cosmétique.
5. **Sois précis, pas vague.** "Ça pourrait être mieux" n'aide personne. "Testé avec un input vide : la ligne 42 plante avec cette erreur exacte" est actionnable — et vient d'un test réel, pas d'une supposition.
6. **Ne fabrique pas de faux problèmes** pour avoir l'air critique — la rigueur, pas le contrarianisme gratuit. Si quelque chose résiste à l'attaque, dis-le aussi, brièvement.

## Format de sortie

Deux parties :

1. **Problèmes trouvés**, du plus grave au moins grave. Pour chaque point : ce qui est en cause, pourquoi c'est un problème, la preuve concrète (résultat d'un test réel ou d'une recherche, pas une affirmation abstraite).
2. **Specs finales** : une fois l'attaque terminée, résume en quelques phrases ce qui est désormais vérifié et peut être affirmé sans réserve (objectif, comportement, garanties) — sans conditionnel, sans "normalement", sans "ça devrait". Ce qui reste un point ouvert malgré l'attaque est listé séparément, explicitement, pas mélangé aux affirmations sûres.
