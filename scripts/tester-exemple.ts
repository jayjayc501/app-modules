/**
 * Test de bout en bout du module connexion sur l'appli d'exemple lancée avec `wrangler dev`
 * (base D1 locale, Google avec de fausses clés, mode test e-mail + mot de passe).
 *
 * Lancement : `node scripts/tester-exemple.ts http://127.0.0.1:8787`
 */
import assert from 'node:assert/strict';

const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
let echecs = 0;

async function etape(nom: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`OK    ${nom}`);
  } catch (e) {
    echecs++;
    console.error(`ÉCHEC ${nom}\n      ${e instanceof Error ? e.message : String(e)}`);
  }
}

const json = { 'content-type': 'application/json', origin: base };

await etape('le serveur de connexion répond (/api/auth/ok)', async () => {
  const r = await fetch(`${base}/api/auth/ok`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

await etape('sans connexion, pas de session', async () => {
  const r = await fetch(`${base}/api/auth/get-session`);
  assert.equal(r.status, 200);
  assert.equal(await r.json(), null);
  const moi = await fetch(`${base}/moi`);
  assert.equal(moi.status, 401);
});

await etape('« Se connecter avec Google » renvoie vers Google avec la bonne adresse de retour', async () => {
  const r = await fetch(`${base}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ provider: 'google', callbackURL: `${base}/test-connexion` }),
  });
  const texte = await r.text();
  assert.equal(r.status, 200, texte);
  const { url } = JSON.parse(texte) as { url: string };
  const google = new URL(url);
  assert.equal(google.hostname, 'accounts.google.com');
  assert.equal(google.searchParams.get('client_id'), 'client-de-test.apps.googleusercontent.com');
  assert.equal(google.searchParams.get('redirect_uri'), `${base}/api/auth/callback/google`);
  assert.equal(google.searchParams.get('prompt'), 'select_account');
});

await etape('retour vers l’appli mobile (scheme « exemple:// ») accepté', async () => {
  const r = await fetch(`${base}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'expo-origin': 'exemple://' },
    body: JSON.stringify({ provider: 'google', callbackURL: 'exemple://' }),
  });
  const texte = await r.text();
  assert.equal(r.status, 200, texte);
});

await etape('retour vers un scheme inconnu refusé', async () => {
  const r = await fetch(`${base}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'expo-origin': 'pirate://' },
    body: JSON.stringify({ provider: 'google', callbackURL: 'pirate://' }),
  });
  assert.notEqual(r.status, 200, 'un scheme non déclaré ne doit pas être accepté');
});

let cookie = '';
const email = `test-${Date.now()}@exemple.fr`;

await etape('inscription (mode test) : utilisateur, compte et session créés en base', async () => {
  const r = await fetch(`${base}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email, password: 'mot-de-passe-de-test', name: 'Testeur' }),
  });
  const texte = await r.text();
  assert.equal(r.status, 200, texte);
  cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie.includes('session_token'), `cookie de session attendu, reçu : ${cookie}`);
});

await etape('avec la session : get-session et adresse protégée', async () => {
  const r = await fetch(`${base}/api/auth/get-session`, { headers: { cookie } });
  const session = (await r.json()) as { user: { email: string; name: string } } | null;
  assert.equal(session?.user.email, email);
  const moi = await fetch(`${base}/moi`, { headers: { cookie } });
  assert.equal(moi.status, 200);
  assert.deepEqual(await moi.json(), { connecte: true, nom: 'Testeur', email });
});

await etape('déconnexion', async () => {
  const r = await fetch(`${base}/api/auth/sign-out`, { method: 'POST', headers: { ...json, cookie }, body: '{}' });
  assert.equal(r.status, 200, await r.text());
  const apres = await fetch(`${base}/moi`, { headers: { cookie } });
  assert.equal(apres.status, 401);
});

await etape('page /test-connexion', async () => {
  const r = await fetch(`${base}/test-connexion`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(html.includes('Se connecter avec Google'));
});

if (echecs) {
  console.error(`\n${echecs} test(s) en échec.`);
  process.exit(1);
}
console.log('\nTous les tests passent.');
