# app-modules

Les **modules communs** des applis de jayjayc501 sur Cloudflare. Chaque appli installe ce dont elle a besoin ;
le code est partagé, **les données jamais** : chaque appli garde sa propre base et ses propres comptes.

| Module | Rôle | État |
|---|---|---|
| `connexion` | Se connecter avec Google (puis Apple), garder la session, savoir qui appelle le serveur | v0.1 : Google |
| *(plus tard)* | notifications, modération par IA, envoi d'images, paiements… | — |

Versions : une appli installe **une version précise** du module (un « commit » figé, voir le tableau) et n'en change
que quand on le décide : une évolution du module ne casse jamais une appli toute seule.

| Version | Commit à installer | Contenu |
|---|---|---|
| 0.1.0 | `063d1c55c484141ca5e057fe8d17ac4270e73933` | Connexion Google, page de test, tables des comptes |
| 0.1.1 | `75be4e195576799f3bd218cc78dbb28f2bcf20a1` | Page de test : départ vers Google par navigation (corrige « state_mismatch » sur téléphone) |

---

## Module `connexion`

Basé sur [Better Auth](https://www.better-auth.com) (bibliothèque gratuite), qui tourne dans le **Worker
Cloudflare de l'appli** et range les comptes dans **la base D1 de l'appli**.

```
Appli mobile (Expo)  ──►  Worker Cloudflare de l'appli  ──►  Base D1 de l'appli
  connexion/appli.ts        connexion/serveur.ts               tables user, session, account, verification
                                     │                         + les tables de l'appli
                                     └──► Google (puis Apple)
```

### Ce que contient le module

- `connexion/serveur.ts` : `creerConnexion()` (le service de connexion), `gererConnexion()` (répond aux adresses
  `/api/auth/...` et `/test-connexion`), `lireSession()` (qui est connecté ?), `methodesActives()`.
- `connexion/appli.ts` : `creerClientConnexion()`, `seConnecter()`, `seDeconnecter()`, `enTetesConnexion()`.
- `connexion/migrations/0001_comptes.sql` : les tables des comptes, à mettre dans la base de l'appli.
- `/test-connexion` : une page pour essayer la connexion depuis un navigateur, sans l'appli.

### Ajouter la connexion à une nouvelle appli

1. **Installer le module** (commit de la version voulue, tableau ci-dessus) dans le dossier du serveur et dans
   celui de l'appli mobile :
   ```json
   "dependencies": { "app-modules": "github:jayjayc501/app-modules#75be4e195576799f3bd218cc78dbb28f2bcf20a1" }
   ```
2. **Base de l'appli** : copier `connexion/migrations/0001_comptes.sql` en premier dans le dossier `migrations/`
   du serveur, puis ajouter les tables de l'appli dans `0002_...sql`, `0003_...sql`.
3. **Serveur** : recopier `exemple/src/index.ts` (modèle complet, une vingtaine de lignes) et changer le nom,
   le scheme et les adresses de l'appli. Options du Worker : `compatibility_flags: ["nodejs_compat"]`.
4. **Secrets Cloudflare du Worker** : `BETTER_AUTH_SECRET` (au hasard, 32 caractères ou plus, jamais changé
   ensuite sinon tout le monde est déconnecté) et `GOOGLE_CLIENT_SECRET`. L'identifiant Google (`GOOGLE_CLIENT_ID`)
   n'est pas secret.
5. **Google** : créer **un client OAuth par appli** (console Google Cloud › API et services › Identifiants ›
   Créer des identifiants › ID client OAuth › Application Web). Adresse de redirection autorisée :
   `https://<adresse du serveur>/api/auth/callback/google`. Écran de consentement : **Externe** et **publié**.
6. **Appli mobile** : `npx expo install expo-secure-store expo-network expo-linking expo-web-browser expo-constants`,
   puis :
   ```ts
   import { creerClientConnexion, seConnecter } from 'app-modules/connexion/appli';
   export const connexion = creerClientConnexion({ urlServeur: 'https://…', scheme: 'monappli' });
   // bouton : await seConnecter(connexion, 'google', '/');
   // session : const { data } = connexion.useSession();
   ```
7. **Essayer** : ouvrir `https://<adresse du serveur>/test-connexion` sur le téléphone.

### Règles

- **Une base par appli**, jamais de base de comptes commune.
- **Un client Google par appli** (l'écran Google affiche le nom de l'appli).
- `modeTest` (e-mail + mot de passe) : réservé aux tests automatiques, **jamais en production**.

---

## Vérifications automatiques

À chaque modification, GitHub Actions (`.github/workflows/verification.yml`) :

1. vérifie les types ;
2. vérifie que `0001_comptes.sql` crée exactement ce qu'attend Better Auth (`npm run verifier-schema`) ;
3. lance l'appli d'exemple avec une base D1 locale et teste de bout en bout : redirection vers Google,
   retour vers l'appli mobile, inscription de test, session, adresse protégée, déconnexion (`npm run tester`).

Le code est en TypeScript, sans étape de construction : Wrangler (serveur) et Expo (appli) le lisent directement.
