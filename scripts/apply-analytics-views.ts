#!/usr/bin/env tsx

/**
 * Script pour appliquer les vues analytics SQL
 * Usage: npx tsx scripts/apply-analytics-views.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Application des vues analytics...\n');

  // Lit le fichier SQL
  const sqlPath = path.join(process.cwd(), 'sql/analytics/dashboard_views.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Divise en statements individuels (séparés par ';')
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 ${statements.length} statements SQL à exécuter\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');

    try {
      console.log(`[${i + 1}/${statements.length}] Exécution: ${preview}...`);
      await prisma.$executeRawUnsafe(statement);
      console.log(`✅ OK\n`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ ERREUR: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Réussis: ${successCount}`);
  console.log(`❌ Échecs: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount === 0) {
    console.log('\n🎉 Toutes les vues analytics ont été créées avec succès !');
  } else {
    console.log('\n⚠️  Certaines vues ont échoué. Vérifiez les erreurs ci-dessus.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
