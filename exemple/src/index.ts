/**
 * Exemple minimal d'appli Cloudflare qui utilise le module connexion.
 * C'est aussi le modèle à recopier pour le serveur d'une nouvelle appli.
 */
import {
  creerConnexion,
  gererConnexion,
  lireSession,
  methodesActives,
} from '../../connexion/serveur.ts';

type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  URL_SERVEUR: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MODE_TEST?: string;
};

export default {
  async fetch(requete: Request, env: Env): Promise<Response> {
    const config = {
      base: env.DB,
      secret: env.BETTER_AUTH_SECRET,
      urlServeur: env.URL_SERVEUR,
      nomAppli: 'Exemple',
      schemesAppli: ['exemple'],
      methodes: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } },
      modeTest: env.MODE_TEST === '1',
    };
    const connexion = creerConnexion(config);

    // 1. Adresses du module (/api/auth/..., /test-connexion).
    const reponse = await gererConnexion(connexion, requete, {
      nomAppli: config.nomAppli,
      methodes: methodesActives(config),
      pageTest: true,
    });
    if (reponse) return reponse;

    // 2. Adresses de l'appli. Exemple d'adresse réservée aux personnes connectées :
    const { pathname } = new URL(requete.url);
    if (pathname === '/moi') {
      const session = await lireSession(connexion, requete);
      if (!session) return Response.json({ connecte: false }, { status: 401 });
      return Response.json({ connecte: true, nom: session.utilisateur.name, email: session.utilisateur.email });
    }

    return new Response('Exemple app-modules : serveur en marche.');
  },
};
