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
- Connexion : Better Auth ≥ 1.5 (D1 reconnu directement), plugin `expo()` côté serveur, `expoClient` côté appli.
- Distribution : dépendance Git avec étiquette de version (`github:jayjayc501/app-modules#v0.1.0`) ;
  TypeScript sans étape de construction. Toute évolution = nouvelle étiquette ; ne jamais déplacer une étiquette.
- Premier utilisateur : « Je te l'avais dit » (dépôt privé `jayjayc501/jetelavaisdit`, branche `cloudflare`).

## Façon de travailler

- Petits changements : commit direct sur `main`. Changement qui touche les applis : branche + pull request,
  le propriétaire dit « fusionne ».
- Toujours faire passer `verification.yml` (types, schéma, test de bout en bout) avant une nouvelle étiquette.
- Pas de npm ni d'accès à Cloudflare depuis le terminal de Claude : on vérifie par GitHub Actions
  (`gh run list` / `gh run view --log`). SQL : tester d'abord avec le module `sqlite3` de Python.

## Historique

- 21/11/2026 : création, module `connexion` v0.1 (Google) en cours.
