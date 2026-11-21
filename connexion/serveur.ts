/**
 * Module connexion — partie SERVEUR (Cloudflare Worker + base D1).
 *
 * Chaque appli appelle `creerConnexion(...)` avec SA base D1 et SES clés Google :
 * les comptes ne sont jamais partagés entre applis, seul ce code l'est.
 *
 * Méthodes de connexion : Google (v0.1). Apple viendra s'ajouter ici (v0.2) sans rien changer aux applis.
 */
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { expo } from '@better-auth/expo';
/** Clés d'une méthode de connexion (Google aujourd'hui, Apple demain). */
export type ClesMethode = {
  /** Identifiant du client OAuth (public). */
  clientId?: string;
  /** Secret du client OAuth (à garder dans les secrets Cloudflare, jamais dans le code). */
  clientSecret?: string;
};

export type OptionsConnexion = {
  /** La base D1 de l'appli (binding Cloudflare, par exemple `env.DB`). */
  base: unknown;
  /** Secret de signature des sessions (secret Cloudflare `BETTER_AUTH_SECRET`, 32 caractères ou plus). */
  secret: string;
  /** Adresse publique du serveur, sans `/` final : `https://monappli.xxx.workers.dev`. */
  urlServeur: string;
  /** Nom de l'appli (affiché dans certains écrans et e-mails). */
  nomAppli?: string;
  /**
   * « Schemes » des applis mobiles autorisées à revenir après la connexion,
   * sans `://` : `['jetelavaisdit', 'jetelavaisdit-test']`.
   */
  schemesAppli?: string[];
  /** Autres sites web autorisés à appeler le serveur (adresse complète, sans `/` final). */
  originesWeb?: string[];
  /** Méthodes de connexion actives. Une méthode sans `clientId` + `clientSecret` est ignorée. */
  methodes: { google?: ClesMethode };
  /**
   * Mode test : ajoute la connexion e-mail + mot de passe.
   * Réservé aux tests automatiques, **jamais en production**.
   */
  modeTest?: boolean;
};

function methodeComplete(cles?: ClesMethode): cles is Required<ClesMethode> {
  return Boolean(cles?.clientId && cles?.clientSecret);
}

/** Méthodes réellement utilisables avec la configuration donnée (pour la page de test). */
export function methodesActives(o: Pick<OptionsConnexion, 'methodes'>): string[] {
  return Object.entries(o.methodes)
    .filter(([, cles]) => methodeComplete(cles))
    .map(([nom]) => nom);
}

/** Options Better Auth construites à partir de la configuration de l'appli. */
export function optionsConnexion(o: OptionsConnexion) {
  const socialProviders: NonNullable<BetterAuthOptions['socialProviders']> = {};
  if (methodeComplete(o.methodes.google)) {
    socialProviders.google = {
      clientId: o.methodes.google.clientId,
      clientSecret: o.methodes.google.clientSecret,
      // Toujours proposer le choix du compte Google (utile sur un téléphone partagé).
      prompt: 'select_account',
    };
  }

  return {
    appName: o.nomAppli,
    baseURL: o.urlServeur,
    basePath: '/api/auth',
    secret: o.secret,
    // Cloudflare D1 : Better Auth reconnaît le binding directement (Better Auth 1.5 et plus).
    database: o.base as BetterAuthOptions['database'],
    trustedOrigins: [
      ...(o.schemesAppli ?? []).map((scheme) => `${scheme}://`),
      ...(o.originesWeb ?? []),
    ],
    socialProviders,
    emailAndPassword: { enabled: Boolean(o.modeTest) },
    account: {
      // Une même personne qui se connecte avec Google puis Apple (même e-mail) garde un seul compte.
      accountLinking: { enabled: true, trustedProviders: ['google', 'apple'] },
    },
    advanced: {
      // Adresse IP réelle du visiteur derrière Cloudflare.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
    },
    plugins: [expo()],
  } satisfies BetterAuthOptions;
}

/** Crée le service de connexion de l'appli (à appeler à chaque requête : la base D1 n'existe que là). */
export function creerConnexion(o: OptionsConnexion) {
  return betterAuth(optionsConnexion(o));
}

export type Connexion = ReturnType<typeof creerConnexion>;

/** Utilisateur connecté et sa session, ou `null` si la requête n'est pas connectée. */
export async function lireSession(connexion: Connexion, requete: Request) {
  const resultat = await connexion.api.getSession({ headers: requete.headers });
  return resultat ? { utilisateur: resultat.user, session: resultat.session } : null;
}

/**
 * Répond aux adresses du module :
 * - `/api/auth/...` : connexion, déconnexion, session (géré par Better Auth) ;
 * - `/test-connexion` : petite page pour essayer la connexion depuis un navigateur (si `pageTest` est vrai).
 * Renvoie `null` pour toute autre adresse : c'est alors à l'appli de répondre.
 */
export async function gererConnexion(
  connexion: Connexion,
  requete: Request,
  o: { nomAppli: string; methodes: string[]; pageTest?: boolean },
): Promise<Response | null> {
  const { pathname } = new URL(requete.url);
  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    return connexion.handler(requete);
  }
  if (o.pageTest && pathname === '/test-connexion') {
    return pageTestConnexion(o.nomAppli, o.methodes);
  }
  return null;
}

// ─── Page de test ───────────────────────────────────────────────────────────

/**
 * Page `/test-connexion` : essayer la connexion depuis un navigateur de téléphone ou d'ordinateur,
 * sans avoir besoin de l'appli. Affiche qui est connecté, et des boutons pour se connecter ou se déconnecter.
 */

const NOMS: Record<string, string> = { google: 'Google', apple: 'Apple' };

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function pageTestConnexion(nomAppli: string, methodes: string[]): Response {
  const boutons = methodes.length
    ? methodes
        .map((m) => `<button data-methode="${echapper(m)}">Se connecter avec ${echapper(NOMS[m] ?? m)}</button>`)
        .join('')
    : '<p class="alerte">Aucune méthode de connexion n’est encore configurée sur ce serveur.</p>';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Test de connexion · ${echapper(nomAppli)}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0d0c12; color: #f4f4f6; margin: 0; padding: 32px 20px; }
  main { max-width: 420px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sous-titre { color: #9a99a6; margin: 0 0 24px; font-size: 14px; }
  .carte { background: #1a1922; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  button { display: block; width: 100%; padding: 14px; margin: 10px 0 0; border: 0; border-radius: 12px;
           font-size: 16px; font-weight: 600; background: #c8ff3d; color: #0d0c12; cursor: pointer; }
  button.secondaire { background: transparent; color: #f4f4f6; border: 1px solid #3a3946; }
  .alerte { color: #ffb4b4; }
  .etat { font-size: 17px; }
  .petit { color: #9a99a6; font-size: 13px; word-break: break-all; }
</style>
</head>
<body>
<main>
  <h1>${echapper(nomAppli)}</h1>
  <p class="sous-titre">Page de test du module de connexion</p>
  <div class="carte">
    <p class="etat" id="etat">Vérification…</p>
    <p class="petit" id="detail"></p>
  </div>
  <div id="boutons" hidden>${boutons}</div>
  <button id="deconnexion" class="secondaire" hidden>Se déconnecter</button>
  <p class="alerte" id="erreur"></p>
</main>
<script>
  const api = (chemin, options) => fetch('/api/auth' + chemin, { credentials: 'include', ...options });
  const erreur = (texte) => { document.getElementById('erreur').textContent = texte; };

  async function afficher() {
    const reponse = await api('/get-session');
    const donnees = reponse.ok ? await reponse.json() : null;
    const connecte = Boolean(donnees && donnees.user);
    document.getElementById('etat').textContent = connecte
      ? 'Connecté : ' + (donnees.user.name || donnees.user.email)
      : 'Pas connecté';
    document.getElementById('detail').textContent = connecte ? donnees.user.email : '';
    document.getElementById('boutons').hidden = connecte;
    document.getElementById('deconnexion').hidden = !connecte;
  }

  document.querySelectorAll('[data-methode]').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      erreur('');
      const reponse = await api('/sign-in/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: bouton.dataset.methode, callbackURL: location.origin + '/test-connexion' }),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (donnees.url) location.href = donnees.url;
      else erreur('Connexion impossible : ' + (donnees.message || reponse.status));
    });
  });

  document.getElementById('deconnexion').addEventListener('click', async () => {
    await api('/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    afficher();
  });

  const parametres = new URLSearchParams(location.search);
  if (parametres.get('error')) erreur('Retour avec une erreur : ' + parametres.get('error'));
  afficher().catch((e) => erreur(String(e)));
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
