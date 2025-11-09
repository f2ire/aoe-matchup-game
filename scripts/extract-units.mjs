/**
 * Script d'extraction de TOUTES les unités d'Age of Empires IV
 * Télécharge les données officielles depuis le repository aoe4world/data
 * Génère un fichier JSON optimisé avec les URLs CDN des icônes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_URL = 'https://raw.githubusercontent.com/aoe4world/data/main/units/all-unified.json';

console.log('🔍 Téléchargement des unités d\'AoE4 depuis aoe4world/data...\n');

/**
 * Télécharge un fichier JSON depuis une URL
 */
function downloadJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Erreur lors du parsing JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Erreur lors du téléchargement: ${error.message}`));
    });
  });
}

// Télécharger les données
const rawData = await downloadJSON(DATA_URL);
const allUnits = rawData.data || rawData;

console.log(`📊 Nombre total d'unités trouvées: ${allUnits.length}\n`);

// Extraire uniquement les données nécessaires pour réduire la taille
const extractedUnits = allUnits.map(unit => {
  // Récupérer la première variation (âge 2 par défaut, ou disponible)
  const variation = unit.variations?.find(v => v.age === 2) || unit.variations?.[0] || unit;
  
  return {
    id: unit.id,
    name: unit.name,
    icon: unit.icon || variation.icon,
    
    // Stats de base
    hitpoints: variation.hitpoints || 0,
    costs: {
      food: variation.costs?.food || 0,
      wood: variation.costs?.wood || 0,
      gold: variation.costs?.gold || 0,
      stone: variation.costs?.stone || 0,
    },
    
    // Armure
    armor: variation.armor || [],
    
    // Armes
    weapons: variation.weapons?.map(weapon => ({
      name: weapon.name,
      type: weapon.type,
      damage: weapon.damage,
      speed: weapon.speed,
      range: weapon.range,
      modifiers: weapon.modifiers || []
    })) || [],
    
    // Métadonnées
    type: unit.type,
    civs: unit.civs,
    classes: unit.classes,
    displayClasses: unit.displayClasses || [],
    unique: unit.unique,
    age: variation.age,
    
    // Mouvement (si unité mobile)
    movement: variation.movement,
    
    // Description
    description: variation.description || '',
  };
});

// Filtrer les unités valides (qui ont des HP et ne sont pas des héros spéciaux)
const validUnits = extractedUnits.filter(unit => 
  unit.hitpoints > 0 && 
  unit.icon &&
  !unit.classes.includes('hero') // Exclure les héros spéciaux
);

console.log(`✅ Unités valides extraites: ${validUnits.length}`);
console.log(`📦 Taille estimée: ~${Math.round(JSON.stringify(validUnits).length / 1024)}KB\n`);

// Créer le dossier de destination
const outputDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Sauvegarder dans un fichier JSON
const outputPath = path.join(outputDir, 'aoe4-units.json');
fs.writeFileSync(
  outputPath, 
  JSON.stringify(validUnits, null, 2),
  'utf-8'
);

console.log(`💾 Données sauvegardées dans: ${outputPath}`);
console.log(`\n🎉 Extraction terminée avec succès!`);

// Statistiques
const civilizations = [...new Set(validUnits.flatMap(u => u.civs))];
console.log(`\n📊 Statistiques:`);
console.log(`   - Civilisations: ${civilizations.length}`);
console.log(`   - Unités par type:`);
const byType = validUnits.reduce((acc, u) => {
  acc[u.type] = (acc[u.type] || 0) + 1;
  return acc;
}, {});
Object.entries(byType).forEach(([type, count]) => {
  console.log(`     • ${type}: ${count}`);
});
