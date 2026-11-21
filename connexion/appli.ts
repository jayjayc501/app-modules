/**
 * Module connexion — partie APPLI (Expo / React Native, Android et iPhone).
 *
 * Paquets à installer dans l'appli (avec `npx expo install`) :
 *   expo-secure-store expo-network expo-linking expo-web-browser expo-constants
 * Le « scheme » de l'appli (app.json › expo.scheme) doit aussi être déclaré côté serveur
 * (option `schemesAppli` de `creerConnexion`).
 */
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export type OptionsClient = {
  /** Adresse du serveur de l'appli, sans `/` final : `https://monappli.xxx.workers.dev`. */
  urlServeur: string;
  /** Scheme de l'appli (app.json › expo.scheme), sans `://`. */
  scheme: string;
  /** Préfixe des données gardées sur le téléphone (par défaut : le scheme). */
  prefixe?: string;
};

/** Client de connexion de l'appli : session, connexion, déconnexion. */
export function creerClientConnexion(o: OptionsClient) {
  return createAuthClient({
    baseURL: o.urlServeur,
    plugins: [
      expoClient({
        scheme: o.scheme,
        storagePrefix: o.prefixe ?? o.scheme,
        storage: SecureStore,
      }),
    ],
  });
}

export type ClientConnexion = ReturnType<typeof creerClientConnexion>;

/** Méthodes de connexion proposées par le module. */
export type MethodeConnexion = 'google' | 'apple';

/**
 * Ouvre la connexion Google (ou Apple) dans le navigateur du téléphone, puis revient dans l'appli.
 * `retour` : écran de l'appli où revenir, par exemple `/`.
 * Sur Android et iPhone, la navigation après la connexion est à faire par l'appli.
 */
export async function seConnecter(client: ClientConnexion, methode: MethodeConnexion, retour = '/') {
  return client.signIn.social({ provider: methode, callbackURL: retour });
}

/** Déconnecte l'appli. */
export async function seDeconnecter(client: ClientConnexion) {
  return client.signOut();
}

/**
 * En-têtes à ajouter aux appels vers le serveur de l'appli pour qu'il sache qui est connecté.
 * À utiliser avec `fetch(url, { headers: enTetesConnexion(client), credentials: 'omit' })`.
 */
export function enTetesConnexion(client: ClientConnexion): Record<string, string> {
  const cookie = client.getCookie();
  return cookie ? { Cookie: cookie } : {};
}
