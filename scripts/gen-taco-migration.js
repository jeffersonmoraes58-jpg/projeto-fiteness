/**
 * Gera o migration.sql que popula food_database com a Tabela Brasileira de
 * Composição de Alimentos (TACO 4ª ed., NEPA/UNICAMP) como alimentos públicos.
 *
 * Uso:  node scripts/gen-taco-migration.js /tmp/taco.json > <migration>/migration.sql
 */
const fs = require('fs');

const src = process.argv[2] || '/tmp/taco.json';
const raw = JSON.parse(fs.readFileSync(src, 'utf8'));

// "NA" / "Tr" / "" / null  →  número ou null
function num(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  const s = String(v).trim();
  if (s === '' || s === 'NA' || s === 'Tr' || s === '*') return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

const CAT_MAP = {
  'Cereais e derivados': 'carboidratos',
  'Verduras, hortaliças e derivados': 'vegetais',
  'Frutas e derivados': 'frutas',
  'Gorduras e óleos': 'gorduras',
  'Pescados e frutos do mar': 'proteinas',
  'Carnes e derivados': 'proteinas',
  'Aves e derivados': 'proteinas',
  'Leite e derivados': 'laticinios',
  'Bebidas (alcoólicas e não alcoólicas)': 'outros',
  'Ovos e derivados': 'proteinas',
  'Produtos açucarados': 'outros',
  'Miscelâneas': 'outros',
  'Outros alimentos industrializados': 'outros',
  'Alimentos preparados': 'outros',
  'Leguminosas e derivados': 'proteinas',
  'Nozes e sementes': 'gorduras',
};

function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlNum(n) {
  return n === null ? 'NULL' : String(n);
}

const rows = [];
for (const item of raw) {
  const name = (item.description || '').trim();
  if (!name) continue;
  const kcal = num(item.energy_kcal);
  const protein = num(item.protein_g);
  const carbs = num(item.carbohydrate_g);
  const fat = num(item.lipid_g);
  // pula linhas sem nenhum macro (categorias-cabeçalho etc.)
  if (kcal === null && protein === null && carbs === null && fat === null) continue;

  const id = 'taco_' + String(item.id).padStart(4, '0');
  const category = CAT_MAP[item.category] || 'outros';
  rows.push(
    `(${sqlStr(id)}, ${sqlStr(name)}, 100, 'g', ` +
      `${sqlNum(kcal ?? 0)}, ${sqlNum(protein ?? 0)}, ${sqlNum(carbs ?? 0)}, ${sqlNum(fat ?? 0)}, ` +
      `${sqlNum(num(item.fiber_g))}, ${sqlNum(num(item.sodium_mg))}, ${sqlNum(num(item.saturated_g))}, ` +
      `${sqlStr(category)}, true, NOW(), NOW())`,
  );
}

const header = `-- Popula food_database com a Tabela TACO (4ª ed., NEPA/UNICAMP) como
-- alimentos públicos (nutritionistId NULL, isPublic true). Idempotente:
-- só insere se ainda não houver nenhum alimento público carregado.
-- Gerado por scripts/gen-taco-migration.js — ${rows.length} alimentos.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "food_database" WHERE "isPublic" = true) THEN
    INSERT INTO "food_database"
      ("id", "name", "portion", "portionUnit", "calories", "protein", "carbs", "fat", "fiber", "sodium", "saturatedFat", "category", "isPublic", "createdAt", "updatedAt")
    VALUES
`;

process.stdout.write(header + rows.join(',\n') + ';\n  END IF;\nEND $$;\n');
process.stderr.write(`ok: ${rows.length} alimentos\n`);
