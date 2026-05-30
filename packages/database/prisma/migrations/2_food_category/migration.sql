-- Add category field to food_database
ALTER TABLE "food_database" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'outros';

-- Seed categories based on food names already in the database
UPDATE "food_database" SET "category" = 'proteinas'
  WHERE LOWER(name) SIMILAR TO '%(frango|bife|carne|atum|salmão|ovo|tilapia|peixe|peru|alcatra|contrafile|proteina|whey|peito)%';

UPDATE "food_database" SET "category" = 'carboidratos'
  WHERE LOWER(name) SIMILAR TO '%(arroz|macarrão|batata|aveia|pao|pão|quinoa|trigo|mandioca|tapioca|milho)%';

UPDATE "food_database" SET "category" = 'frutas'
  WHERE LOWER(name) SIMILAR TO '%(banana|maçã|laranja|morango|uva|mamao|mamão|abacaxi|mango|manga|fruta)%';

UPDATE "food_database" SET "category" = 'vegetais'
  WHERE LOWER(name) SIMILAR TO '%(brocolis|brócolis|espinafre|cenoura|tomate|alface|couve|abobrinha|pepino|cebola|alho|vegetal|legume)%';

UPDATE "food_database" SET "category" = 'laticinios'
  WHERE LOWER(name) SIMILAR TO '%(leite|queijo|iogurte|requeijão|requeijao|manteiga|creme|whey|proteina)%';

UPDATE "food_database" SET "category" = 'gorduras'
  WHERE LOWER(name) SIMILAR TO '%(azeite|oleo|óleo|abacate|amendoim|castanha|nozes|amêndoa|amendoa|gordura)%';
