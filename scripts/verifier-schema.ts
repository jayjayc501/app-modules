/**
 * Vérifie que `connexion/migrations/*.sql` crée exactement ce qu'attend Better Auth.
 *
 * 1. Applique les fichiers SQL du module sur une base SQLite vide (en mémoire).
 * 2. Demande à Better Auth ce qu'il manquerait (`getMigrations`) avec les options du module.
 * 3. S'il manque quelque chose, affiche le SQL que Better Auth aurait créé, pour corriger le fichier.
 *
 * Lancement : `npm run verifier-schema` (Node 22.18 ou plus : lit le TypeScript directement).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { optionsConnexion } from '../connexion/serveur.ts';

const dossier = new URL('../connexion/migrations/', import.meta.url);

function options(base: DatabaseSync) {
  return {
    ...optionsConnexion({
      base,
      secret: 'secret-de-test-secret-de-test-secret-de-test',
      urlServeur: 'http://localhost',
      schemesAppli: ['exemple'],
      methodes: { google: { clientId: 'x', clientSecret: 'y' } },
      modeTest: true,
    }),
    database: base,
  };
}

// 1. Base construite avec les fichiers du module.
const base = new DatabaseSync(':memory:');
for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.sql')).sort()) {
  base.exec(readFileSync(new URL(fichier, dossier), 'utf8'));
  console.log(`Appliqué : ${fichier}`);
}

// 2. Ce qu'il manquerait selon Better Auth.
const { toBeCreated, toBeAdded } = await getMigrations(betterAuth(options(base)).options);
const manques = [
  ...toBeCreated.map((t: { table: string }) => `table « ${t.table} » à créer`),
  ...toBeAdded.map((t: { table: string; fields: Record<string, unknown> }) =>
    `table « ${t.table} » : colonnes à ajouter → ${Object.keys(t.fields).join(', ')}`,
  ),
];

if (manques.length === 0) {
  console.log('Schéma conforme : Better Auth ne voit rien à créer ni à ajouter.');
} else {
  console.error('Schéma NON conforme :\n- ' + manques.join('\n- '));
  // 3. SQL de référence : ce que Better Auth crée lui-même sur une base vide.
  const reference = new DatabaseSync(':memory:');
  await (await getMigrations(betterAuth(options(reference)).options)).runMigrations();
  const lignes = reference
    .prepare("select sql from sqlite_master where sql is not null and name not like 'sqlite_%' order by type desc, rowid")
    .all() as { sql: string }[];
  console.error('\n--- SQL créé par Better Auth sur une base vide ---\n' + lignes.map((l) => l.sql + ';').join('\n'));
  process.exit(1);
}
