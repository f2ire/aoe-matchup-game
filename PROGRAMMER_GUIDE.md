# AOE4 Matchup — Programmer Guide

> Guide de référence pour les tâches courantes de data-modding. Chaque section est autonome.
> Toujours lire CLAUDE.md pour la documentation exhaustive des propriétés.

---

## Table des matières
1. [Patcher une technologie](#1-patcher-une-technologie)
2. [Patcher une ability](#2-patcher-une-ability)
3. [Créer une technologie synthétique](#3-créer-une-technologie-synthétique)
4. [Créer une ability synthétique](#4-créer-une-ability-synthétique)
5. [Ajouter une arme secondaire](#5-ajouter-une-arme-secondaire)

---

## Référence rapide : propriétés d'effet

| `property`         | Unité             | `effect` supportés       | Notes |
|--------------------|-------------------|--------------------------|-------|
| `hitpoints`        | HP                | `change`, `multiply`     | `multiply` = **additif** entre patches (voir CLAUDE.md) |
| `meleeAttack`      | dégâts            | `change`, `multiply`     | `type:'passive'` = base, `type:'bonus'` = avec `target.class` |
| `rangedAttack`     | dégâts            | `change`, `multiply`     | Même logique que melee |
| `siegeAttack`      | dégâts siège      | `change`, `multiply`     | Ignore l'armure ranged |
| `meleeArmor`       | armure            | `change`                 | |
| `rangedArmor`      | armure            | `change`                 | |
| `attackSpeed`      | cycle d'attaque   | `change`, `multiply`     | Plus petit = plus rapide |
| `moveSpeed`        | vitesse           | `change`, `multiply`     | Cap à 2.0 après application |
| `maxRange`         | portée max        | `change`                 | |
| `burst`            | projectiles/tir   | `change`                 | |
| `costReduction`    | coût (tous)       | `multiply`               | ex: `0.8` = −20% |
| `stoneCostReduction` | coût pierre seul | `multiply`              | ex: `0.8` = −20% pierre |
| `rangedResistance` | résistance ranged | `change`                 | % de réduction (0–100) |
| `meleeResistance`  | résistance mêlée  | `change`                 | Positif = réduction, négatif = vulnérabilité |
| `healingRate`      | soin/frappe       | `change`                 | HP par frappe reçue |
| `chargeMultiplier` | bonus charge      | `change`                 | bonus 1er hit = `primaryDmg × value`. Requiert `charge-attack` actif. Knight/ghulam/firelancer ont priorité. |

**`select`** — filtre les unités ciblées :
```ts
select: { id: ['spearman', 'horseman'] }           // IDs explicites
select: { class: [['infantry_melee']] }             // classe
select: { class: [['cavalry']], id: ['knight'] }    // ET logique
select: { class: [['land_military']], excludeId: ['atabeg'] }  // exclusion
// Pas de select = toutes les unités
```

---

## 1. Patcher une technologie

**Fichier :** `src/data/patches/technologies.ts`

### Cas 1 — Corriger les effets (override complet)

Utiliser quand les effets raw sont faux ou absents. `update.effects` **remplace** le tableau entier.

```ts
// EXEMPLE : adjustable-crossbars — aoe4world oublie l'effet burst sur la mangonel
{
  id: 'adjustable-crossbars',
  reason: 'Raw data missing burst +1 on Mangonel.',
  update: {
    effects: [
      {
        property: 'burst',
        select: { id: ['mangonel'] },
        effect: 'change',
        value: 1,
        type: 'passive'
      }
    ]
  }
},
```

### Cas 2 — Ajouter un effet aux effets raw existants

Utiliser `after` pour concaténer sans perdre les effets raw.

```ts
// EXEMPLE : geometry — ajoute trebuchet aux cibles (raw oublie ces unités)
{
  id: 'geometry',
  reason: 'Raw data missing trebuchet targets.',
  after: (tech) => ({
    ...tech,
    effects: [
      ...(tech.effects || []),
      {
        property: 'rangedAttack',
        select: { id: ['counterweight-trebuchet', 'traction-trebuchet'] },
        effect: 'multiply',
        value: 1.2,
        type: 'passive'
      }
    ]
  })
},
```

### Cas 3 — Cacher une tech complètement

Doit vider **les deux niveaux** (`tech.effects` ET `variation.effects`) car les deux sont vérifiés par `isCombatTechnology`.

```ts
// EXEMPLE : inspired-warriors — inutile dans l'UI, remplacée par son ability
{
  id: 'inspired-warriors',
  reason: 'No UI value, covered by ability.',
  after: (tech) => ({
    ...tech,
    effects: [],
    variations: tech.variations.map((v: any) => ({ ...v, effects: [] })),
  })
},
```

### Cas 4 — Exclure une tech pour certaines unités

La tech reste visible pour les autres unités, mais disparaît pour les unités listées.

```ts
// EXEMPLE : steeled-arrow — ne s'applique pas au sultans-elite-tower-elephant (tir à poudre)
{
  id: 'steeled-arrow',
  reason: 'sultans-elite fires gunpowder, not arrows.',
  excludedUnits: ['sultans-elite-tower-elephant'],
},
```

### Cas 5 — Tooltip UI + Foreign Engineering (Byzantins)

```ts
{
  id: 'gambesons',
  reason: 'FEC: available to Byzantine via foreign engineering.',
  foreignEngineering: true,
  foreignEngineeringUnits: ['arbaletrier'],      // Byz ne peut l'utiliser que sur cette unité
  uiTooltip: 'Byzantine FEC: +20% AS on Arbalétrier.',   // affiché côté Byz
  uiTooltipNative: '+20% attack speed on Arbalétrier.',  // affiché côté civ native
},
```

### Cas 6 — Tooltip spécifique par unité

```ts
{
  id: 'incendiary-arrows',
  reason: 'Special bleed effect on kipchak-archer only.',
  unitTooltips: {
    'kipchak-archer': '+5.2 Bleed damage.'
  },
},
```

### Cas 7 — Réduction de coût pierre uniquement

```ts
// EXEMPLE : stone-armies — torguud coûte 20% moins en pierre
{
  id: 'stone-armies',
  reason: 'Torguud stone cost −20%. stoneCostReduction only affects stone.',
  update: {
    effects: [
      {
        property: 'stoneCostReduction',
        select: { id: ['torguud'] },
        effect: 'multiply',
        value: 0.8,
        type: 'passive'
      }
    ]
  }
},
```

---

## 2. Patcher une ability

**Fichier :** `src/data/patches/abilities.ts`

Même système de patch que les technologies — `update` pour override, `after` pour modification chirurgicale.

> **Règle critique :** Les effets doivent être à **un seul niveau** (ability OU variation, pas les deux).
> `getAbilityVariation` concatène les deux → double application si les deux sont remplis.

### Cas 1 — Corriger les effets d'une ability raw

```ts
// EXEMPLE : ability-quick-strike — ghulam fait 2 attaques rapides (raw a une valeur inconnue)
{
  id: 'ability-quick-strike',
  reason: 'Effective cycle = (base + 0.5) × 0.5. Raw data has property:unknown.',
  update: {
    effects: [
      { property: 'attackSpeed', select: { id: ['ghulam'] }, effect: 'change', value: 0.5, type: 'ability' },
      { property: 'attackSpeed', select: { id: ['ghulam'] }, effect: 'multiply', value: 0.5, type: 'ability' }
    ]
  }
},
```

### Cas 2 — Corriger les effets de variation (après deep-merge)

Quand les effets sont dans les **variations** (pas au top-level), `update.effects` n'a pas d'effet.
Utiliser `after` pour réécrire `v.effects` sur chaque variation.

```ts
// EXEMPLE : ability-fortitude (Sipahi) — raw variation a "change +0.67" (additive, wrong)
// Doit être "multiply ×0.67" (−33% cycle = +50% attack speed)
{
  id: 'ability-fortitude',
  reason: 'Raw variation has change +0.67 (adds to cycle = SLOWER). Must be multiply ×0.67.',
  after: (ability) => ({
    ...ability,
    variations: ability.variations.map((v: any) => ({
      ...v,
      effects: [
        { property: 'attackSpeed', select: { id: ['sipahi'] }, effect: 'multiply', value: 0.67, type: 'ability' },
        { property: 'meleeResistance', select: { id: ['sipahi'] }, effect: 'change', value: -50, type: 'ability' }
      ]
    }))
  })
},
```

### Cas 3 — Forcer `active:'always'` (auto-activation)

```ts
// EXEMPLE : ability-camel-unease — toujours active dès la sélection de l'unité
{
  id: 'ability-camel-unease',
  reason: 'Always-on passive debuff for nearby horse cavalry.',
  update: {
    active: 'always',
    effects: [
      {
        property: 'versusOpponentDamageDebuff',
        select: { id: ['camel-rider', 'camel-archer', 'camel-lancer'] },
        target: { class: [['cavalry', 'horse']] },
        effect: 'multiply',
        value: 0.8,
        type: 'ability'
      }
    ]
  }
},
```

### Cas 4 — Cacher une ability

```ts
{
  id: 'ability-tactical-charge',
  reason: 'Charge modelled via charge-attack instead.',
  after: (ability) => ({ ...ability, hidden: true })
},
```

---

## 3. Créer une technologie synthétique

> **Distinction importante :**
> - La tech **existe dans `all-optimized_tec.json`** → utiliser `technologyPatches` (system standard).
> - La tech **n'existe pas du tout dans le JSON** → le système de patch seul ne suffit pas — lire "Cas : tech absente du JSON" ci-dessous.

### Cas standard — La tech existe dans le JSON

Ajouter une entrée dans `technologyPatches` avec les effets complets. `update.effects` remplace le tableau entier.

```ts
// EXEMPLE : awl-pikes — raw n'a pas de select, on le restreint à spearman + horseman
{
  id: 'awl-pikes',
  reason: 'Raw effects have no select (applies to all). Restricted to spearman + horseman per in-game description.',
  update: {
    effects: [
      {
        property: 'meleeAttack',
        select: { id: ['spearman', 'horseman'] },
        effect: 'change',
        value: 2,
        type: 'passive'
      }
    ]
  }
},
```

### Technologie de type AGE (age_up_upgrade)

Les techs avec la classe `age_up_upgrade` dans le JSON apparaissent automatiquement dans la ligne `AGE:` du `TechnologySelector`. Aucun changement de code nécessaire, la classe suffit.

```ts
// EXEMPLE : stone-armies — classe age_up_upgrade → apparaît en ligne AGE:
{
  id: 'stone-armies',
  reason: 'Grants Rus Tribute age-4 stats. Class age_up_upgrade → shows in AGE row.',
  update: {
    effects: [
      { property: 'hitpoints',    select: { id: ['rus-tribute'] }, effect: 'change', value: 30, type: 'passive' },
      { property: 'meleeAttack',  select: { id: ['rus-tribute'] }, effect: 'change', value: 4,  type: 'passive' },
      { property: 'meleeAttack',  select: { id: ['rus-tribute'] }, target: { class: [['cavalry']] }, effect: 'change', value: 5, type: 'bonus' },
      { property: 'meleeArmor',   select: { id: ['rus-tribute'] }, effect: 'change', value: 1,  type: 'passive' },
      { property: 'rangedArmor',  select: { id: ['rus-tribute'] }, effect: 'change', value: 1,  type: 'passive' },
    ]
  }
},
```

### Cas : tech absente du JSON (entièrement synthétique)

`applyTechnologyPatches` fait un `.map()` sur les techs existantes — **impossible d'y injecter une nouvelle tech**. Deux options :

**Option A — Modéliser comme une ability** *(recommandé)*
Si la "technologie" est en réalité un bouton cliquable (passive, aura, règle spéciale), créer une ability synthétique à la place (voir section 4). C'est ce que font : `ability-council-hall`, `ability-dynasty-song`, `stone-armies`, etc.

**Option B — Créer une factory function + l'injecter dans `applyTechnologyPatches`**
Même pattern que les abilities synthétiques (`createChargeAttackAbility`, `createMingDynastyAbility`…).

Étape 1 — Ajouter l'import `TechnologyEffect` en tête de fichier :
```ts
import type { Technology, TechnologyVariation, TechnologyEffect } from '../unified-technologies';
```

Étape 2 — Écrire la factory dans `patches/technologies.ts` (après `technologyPatches`) :
```ts
function createMyTech(): Technology {
  return {
    id: 'my-tech-id',
    name: 'My Tech',
    type: 'technology',
    civs: ['en'],
    classes: ['age_up_upgrade'],  // 'age_up_upgrade' → ligne AGE ; [] pour une tech normale
    displayClasses: [],
    minAge: 3,
    icon: 'https://data.aoe4world.com/images/technologies/my-tech.png',
    description: 'Description in-game.',
    unique: false,
    effects: [
      {
        property: 'hitpoints',
        select: { id: ['longbowman'] },
        effect: 'multiply',
        value: 1.1,
        type: 'passive'
      }
    ] as TechnologyEffect[],  // cast obligatoire sur tableau typé
    // ⚠️ Rôle des variations pour une tech synthétique :
    // - civs : OBLIGATOIRE — getTechnologiesForUnit filtre sur variation.civs
    //          Sans cela la tech n'apparaît pour aucune unité.
    // - pbgid / attribName : champs requis par TechnologyVariation, mettre 0 / ''
    // - effects : [] car les effets sont au top-level. Ne pas dupliquer ici.
    // - costs.vizier : champ requis, mettre 0
    variations: [
      {
        id: 'my-tech-id-3',
        baseId: 'my-tech-id',
        pbgid: 0,
        attribName: '',
        civs: ['en'],
        costs: { food: 0, wood: 0, stone: 0, gold: 0, vizier: 0, oliveoil: 0, total: 0, popcap: 0, time: 0 },
        effects: [] as TechnologyEffect[],
      }
    ],
    shared: {}
  } as Technology;
}
```

Étape 3 — Injecter dans `applyTechnologyPatches` (juste avant le `.map()`) :
```ts
export function applyTechnologyPatches(allTechs: Technology[]): Technology[] {
  const allWithSynthetic = [
    ...allTechs,
    createMyTech(),
    // ajouter d'autres ici
  ];

  return allWithSynthetic.map((tech) => {
    // ... reste du code inchangé
  });
}
```

---

## 4. Créer une ability synthétique

Les abilities synthétiques n'existent pas dans `all-optimized_abi.json`. Elles sont créées **de toutes pièces** dans `abilityPatches` avec la fonction helper `createSyntheticAbility`.

### Structure d'une ability synthétique

```ts
// Dans patches/abilities.ts, ajouter dans abilityPatches :

// EXEMPLE : ability-dynasty-song — buff mouvement pour toutes les unités terrestres (Chine, Age 2+)
{
  id: 'ability-dynasty-song',
  reason: 'Synthetic. Song Dynasty: +15% move speed for non-siege land military. Not in raw data.',
  update: {
    active: 'manual',                // 'manual' = cliquable | 'always' = auto
    minAge: 2,
    civs: ['ch'],
    icon: '/abilities/AoE4_SongDynasty.png',
    name: 'Song Dynasty',
    effects: [
      {
        property: 'moveSpeed',
        select: { class: [['find_non_siege_land_military']] },
        effect: 'multiply',
        value: 1.15,
        type: 'ability'
      }
    ]
  }
},
```

> **Note :** Pour les abilities entièrement synthétiques (ID non présent dans le JSON), utiliser la fonction `createSyntheticAbility(id, civs, minAge, name, icon, effects)` si elle existe, ou ajouter directement dans `abilityPatches` avec `update` complet.

### Rendre des abilities mutuellement exclusives (tiers)

Dans `useUnitSlot.ts`, ajouter dans `ABILITY_UPGRADE_GROUPS` :

```ts
// EXEMPLE : dynasties chinoises — sélectionner une désactive les autres
['ability-dynasty-song', 'ability-dynasty-yuan', 'ability-dynasty-ming']
// Index 0 = tier 1 (age le plus bas), index N = tier N+1
```

### Regrouper des abilities dans une ligne dédiée

Dans `patches/abilities.ts`, ajouter dans `ABILITY_ROW_GROUPS` :

```ts
// EXEMPLE : Khan War Cry — ligne séparée avec label 'WC'
{ label: 'WC', ids: ['ability-khan-warcry-2', 'ability-khan-warcry-3', 'ability-khan-warcry-4'] }
```

### Dépendance ability → tech (ability verrouillée sans une tech)

Dans `useUnitSlot.ts`, ajouter dans `ABILITY_TECH_DEPENDENCIES` :

```ts
// EXEMPLE : ability-gallop visible mais verrouillée sans mounted-training
'ability-gallop': 'mounted-training'
```

### Dépendance tech → ability (tech verrouillée sans une ability)

Dans `useUnitSlot.ts`, ajouter dans `TECH_ABILITY_DEPENDENCIES` :

```ts
// EXEMPLE : enlistment-incentives verrouillée sans ability-keep-influence
'enlistment-incentives': 'ability-keep-influence'
```

---

## 5. Ajouter une arme secondaire

**Fichier :** `src/data/patches/units.ts`

Une arme secondaire est tirée **simultanément** avec l'arme principale. Son DPS est additionné.

### Cas 1 — Arme secondaire permanente (toujours active)

Ajouter `secondaryWeapons` dans les variations via `after`.

```ts
// EXEMPLE : tower-elephant — 2 archers sur la tour tirent simultanément
{
  id: 'tower-elephant',
  reason: 'Two archers atop the tower fire simultaneously. Represented as one ranged secondary with burst:2.',
  after: (unit: unknown) => {
    const u = unit as Record<string, unknown>;
    return {
      ...u,
      variations: (u.variations as Record<string, unknown>[]).map(v => {
        const vr = v as Record<string, unknown>;
        const weapons = vr.weapons as Record<string, unknown>[] | undefined;
        const bowWeapon = weapons?.find((w: any) => w.name === 'Bow');
        if (!bowWeapon) return vr;
        return {
          ...vr,
          secondaryWeapons: [{ ...bowWeapon, burst: { count: 2 } }],
        };
      }),
    };
  },
},
```

```ts
// EXEMPLE : war-elephant — spearman monte l'éléphant, attaque en mêlée en même temps
{
  id: 'war-elephant',
  reason: 'Mounted Spearman fires simultaneously. Melee secondary preserving vs cavalry/elephant modifiers.',
  after: (unit: unknown) => {
    const u = unit as Record<string, unknown>;
    return {
      ...u,
      variations: (u.variations as Record<string, unknown>[]).map(v => {
        const vr = v as Record<string, unknown>;
        const weapons = vr.weapons as Record<string, unknown>[] | undefined;
        const spearWeapon = weapons?.find((w: any) => w.name === 'Spear');
        if (!spearWeapon) return vr;
        return {
          ...vr,
          secondaryWeapons: [spearWeapon],   // modifiers vs cavalry gardés automatiquement
        };
      }),
    };
  },
},
```

### Cas 2 — Arme secondaire débloquée par une technologie (`injectWeapon`)

L'arme est injectée depuis une autre unité via le patch de la technologie.
**Important :** mettre l'effet raw à `value: 0` pour éviter le double-comptage.

```ts
// Dans technologies.ts — EXEMPLE : thunderclap-bombs → injecte l'arme du nest-of-bees
{
  id: 'thunderclap-bombs',
  reason: 'Injects Nest of Bees rocket weapon as secondary on activation.',
  injectWeapon: {
    unitId: 'nest-of-bees',   // unité source dont on copie l'arme
    weaponIndex: 0,            // index de l'arme dans cette unité
  },
  update: {
    effects: [
      // Zeroed pour éviter double-comptage (isCombatTechnology a besoin d'un effet non-nul pour afficher la tech)
      { property: 'siegeAttack', select: { id: ['nest-of-bees'] }, effect: 'change', value: 0, type: 'passive' }
    ]
  }
},
```

```ts
// EXEMPLE avec damageMultiplier : triple-shot (30% du rangedAttack de base)
{
  id: 'triple-shot',
  reason: 'Kipchak fires 2 extra arrows at 30% base damage each.',
  injectWeapon: {
    unitId: 'kipchak-archer',
    weaponIndex: 0,
    damageMultiplier: 0.3,   // 30% de modifiedStats.rangedAttack
    burstCount: 2,
    maxDamage: 10,           // cap post-multiplicateurs
  },
  update: {
    effects: [
      { property: 'rangedAttack', select: { id: ['kipchak-archer'] }, effect: 'change', value: 0, type: 'passive' }
    ]
  }
},
```

### Règles de scaling des armes secondaires (Sandbox.tsx)

| Type d'arme secondaire | Formule damage |
|------------------------|---------------|
| Ranged/Siege (sans `damageMultiplier`) | `modifiedStats.rangedAttack` (attaque ranged complète) |
| Ranged avec `damageMultiplier` | `(base × multiplier + flatDelta) × rangedAttackMultiplier` |
| Melee | `weapon.damage + (modifiedStats.meleeAttack − primaryMeleeDamage)` |

Les bonus `vs class` de l'arme primaire (tagués `fromWeapon: true`) **ne se propagent pas** sur l'arme secondaire. Seuls les bonus ajoutés par des techs (sans `fromWeapon`) se propagent.

---

## Pièges fréquents

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Tech toujours visible après patch hide | `variation.effects` non vidés | `after` pour vider les deux niveaux |
| Patch non appliqué | Deux entrées avec le même `id` — `.find()` prend la première | Supprimer le doublon |
| Effet ignoré silencieusement | Propriété spéciale non listée dans le `if` de Phase 3 (`applyTechnologyEffects`) | Ajouter la propriété au guard `if` |
| Tech absent du sélecteur | `effects` vides → `isCombatTechnology` renvoie false | Garder un effet `value: 0` si nécessaire |
| Bonus affiché ×2 sur arme secondaire | `fromWeapon` manquant sur les modifiers de l'arme primaire | Tagger les modifiers à l'init (`bonusDamage`) |
| `update.effects` sur variation n'a pas d'effet | `applyTechnologyEffects` ignore `variation.effects` si `tech.effects` non vide | Utiliser `after` pour modifier les variations |
| Ability appliquée deux fois | Effets présents aux deux niveaux (ability + variation) | Un seul niveau — généralement le top-level |
| `moveSpeed` dépasse 2.0 | Application de plusieurs buffs | Normal — clampé automatiquement à 2.0 |
