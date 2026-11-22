# Instructions pour Claude — dépôt app-modules

Ce fichier est lu au début de chaque session. Il sert de mémoire au dépôt : mets-le à jour quand quelque chose
d'important change. Mode d'emploi des modules : [`README.md`](README.md).

## À propos

- Propriétaire : jayjayc501. Langue : français (réponses, commentaires, messages de commit). Fuseau : Europe/Paris.
  Il travaille souvent depuis son téléphone et n'est pas développeur : expliquer simplement, sans jargon.
- Dépôt **public** (créé le 21/11/2026) : modules communs à ses applis Cloudflare. **Aucun secret ici**, jamais :
  les clés restent dans chaque appli (secrets Cloudflare / GitHub de l'appli).
- Nom choisi par le propriétaire : `app-modules` (pas « socle »). Le module de connexion n'est pas « Google » :
  Google est la première méthode, Apple suivra (v0.2) dans le même module.

## Décisions

- Un module = du **code**, pas de données : **chaque appli a sa propre base D1 et ses propres comptes**, et son
  propre client Google. Pas de serveur ni de base de connexion communs (refusé par le propriétaire).
- Connexion : Better Auth 1.7 (D1 reconnu directement depuis 1.5 ; `getCookie()` est asynchrone en 1.7), plugin `expo()` côté serveur, `expoClient` côté appli.
- Distribution : dépendance Git **figée sur un commit** (`github:jayjayc501/app-modules#<commit>`), TypeScript sans
  étape de construction. Chaque version (champ `version` de `package.json`) est notée avec son commit dans le tableau
  « Versions » du README. Claude ne peut pas créer d'étiquette Git (refusé par le proxy, et contourner par un workflow
  a été refusé) : on n'utilise donc pas d'étiquettes. Le propriétaire peut en créer lui-même (GitHub › Releases) s'il le souhaite.
- Premier utilisateur : « Je te l'avais dit » (dépôt privé `jayjayc501/jetelavaisdit`, branche `main`), serveur ET appli,
  validé sur le téléphone du propriétaire le 22/11/2026 (connexion Google dans l'appli Android comprise).

## Façon de travailler

- Petits changements : commit direct sur `main`. Changement qui touche les applis : branche + pull request,
  le propriétaire dit « fusionne ».
- Toujours faire passer `verification.yml` (types, schéma, test de bout en bout) avant une nouvelle étiquette.
- Pas de npm ni d'accès à Cloudflare depuis le terminal de Claude : on vérifie par GitHub Actions
  (`gh run list` / `gh run view --log`). SQL : tester d'abord avec le module `sqlite3` de Python.

## Historique

- 21/11/2026 : création ; module `connexion` 0.1.0 (Google) = commit `063d1c5`, vérification verte
  (9 tests de bout en bout, schéma conforme). Better Auth installé : 1.7.27.
- 22/11/2026 : 0.1.1 = commit `75be4e1`. Premier essai réel sur le téléphone du propriétaire : erreur Better Auth
  « state_mismatch » au retour de Google, alors que le même parcours simulé par curl passait. La page de test lançait
  la connexion par un appel en arrière-plan (fetch) ; elle passe maintenant par `/test-connexion/aller`, une vraie
  navigation qui pose le cookie d'état dans la page qui part vers Google. Tests ajoutés (retour simulé avec et sans cookie).
- 22/11/2026 (nuit) : tests ajoutés sans changer le code (commit `7108b97`) : retours vers l'appli Android avec chemin
  (`exemple:///`, `exemple:///accueil`) acceptés, relais Expo `/api/auth/expo-authorization-proxy` présent.
  « Je te l'avais dit » utilise le module côté serveur ET côté appli (branche `cloudflare`).
- 22/11/2026 (matin) : « Je te l'avais dit » validé de bout en bout sur téléphone avec la 0.1.1, puis fusionné dans son `main`.
  Prochaines évolutions possibles : Apple (0.2, compte Apple Developer requis), modération par IA, notifications.
