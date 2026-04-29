# AOE4 Matchup — Programmer Guide

> Guide de référence pour les tâches courantes. Chaque section est autonome.
> **DIY** = faisable sans Claude. **→ Claude** = prompt fourni.

---

## 0. Décision rapide

```
Je veux...
│
├── Corriger une valeur existante (tech ou ability raw incorrecte)
│   ├── Effets au top-level de la tech/ability  →  Section 1/2 Cas 1 — update.effects   [DIY]
│   └── Effets dans les variations              →  Section 1/2 Cas 2 — after              [DIY]
│
├── Ajouter un effet sur une tech/ability existante (sans perdre les autres)
│   →  Section 1 Cas 2 / Section 2 Cas 2 — after concat                                  [DIY]
│
├── Créer un buff de civ (ability synthétique)
│   →  Section 3 — ability synthétique                                                    [DIY]
│
├── Créer une technologie synthétique (absente du JSON)
│   →  Section 4 — factory function                                                       [→ Claude]
│
├── Ajouter une arme secondaire (toujours active)
│   →  Section 5 Cas 1 — secondaryWeapons via after                                       [→ Claude]
│
├── Arme secondaire débloquée par une tech
│   →  Section 5 Cas 2 — injectWeapon                                                     [→ Claude]
│
├── Supprimer ou fixer la charge d'une unité
│   →  Section 6 — override getChargeBonus                                                [DIY]
│
└── Nouveau système (nouveau stat, counter ability, dual-weapon, pipeline combat)
    →  Trop de fichiers touchés simultanément                                              [→ Claude]
```

---

## Référence rapide : propriétés d'effet

| `property`           | Unité             | `effect` supportés   | Notes |
|----------------------|-------------------|----------------------|-------|
| `hitpoints`          | HP                | `change`, `multiply` | `multiply` = **additif** entre patches : `HP × (1 + Σ(v−1))` |
| `meleeAttack`        | dégâts mêlée      | `change`, `multiply` | `type:'bonus'` + `target.class` pour bonus vs classe |
| `rangedAttack`       | dégâts ranged     | `change`, `multiply` | |
| `siegeAttack`        | dégâts siège      | `change`, `multiply` | Ignore l'armure ranged |
| `meleeArmor`         | armure mêlée      | `change`             | |
| `rangedArmor`        | armure ranged     | `change`             | |
| `attackSpeed`        | cycle d'attaque   | `change`, `multiply` | Plus petit = plus rapide |
| `moveSpeed`          | vitesse           | `change`, `multiply` | Cap à 2.0 après application |
| `maxRange`           | portée max        | `change`             | |
| `burst`              | projectiles/tir   | `change`             | |
| `costReduction`      | coût (tous)       | `multiply`           | `0.8` = −20% |
| `stoneCostReduction` | coût pierre seul  | `multiply`           | `0.8` = −20% pierre uniquement |
| `rangedResistance`   | résistance ranged | `change`             | % de réduction (0–100) |
| `meleeResistance`    | résistance mêlée  | `change`             | Positif = réduction, négatif = vulnérabilité |
| `healingRate`        | soin/frappe       | `change`             | HP par frappe reçue |
| `chargeMultiplier`   | bonus charge      | `change`             | bonus 1er hit = `primaryDmg × value`. Requiert `charge-attack` actif |
| `armorPenetration`   | pénétration       | `change`             | Réduit armure ennemie de N par frappe |
| `bonusDamageMultiplier` | bonus dmg (×) | `multiply`           | Multiplie tous les bonus dmg existants de l'unité par N (ex. `3` = ×3). Phase 3 de `applyTechnologyEffects`. |

**`select`** — filtre les unités ciblées :
```ts
select: { id: ['spearman', 'horseman'] }                             // IDs explicites
select: { class: [['infantry_melee']] }                              // classe (underscore form)
select: { class: [['land_military']], excludeId: ['atabeg'] }        // exclusion
// Pas de select = toutes les unités
```

---

## 1. Patcher une technologie `technologies.ts`

### Prompt Claude →
```
Patch tech `[id]` dans technologies.ts.
Cas : [effets raw faux | effets à ajouter | cacher | exclure unité].
Effet : `[property]` `[effect: change|multiply]` `[value]` sur `[select.id ou select.class]`.
[Pattern similaire : voir Cas X ci-dessous.]
```

---

### Cas 1 — Corriger les effets (override complet) `DIY`

`update.effects` **remplace** le tableau entier. Utiliser quand les effets raw sont faux ou absents.

```ts
{
  id: 'adjustable-crossbars',
  reason: 'Raw data missing burst +1 on Mangonel.',
  update: {
    effects: [
      { property: 'burst', select: { id: ['mangonel'] }, effect: 'change', value: 1, type: 'passive' }
    ]
  }
},
```

### Cas 2 — Ajouter un effet sans perdre les raw `DIY`

```ts
{
  id: 'geometry',
  reason: 'Raw data missing trebuchet targets.',
  after: (tech) => ({
    ...tech,
    effects: [
      ...(tech.effects || []),
      { property: 'rangedAttack', select: { id: ['counterweight-trebuchet'] }, effect: 'multiply', value: 1.2, type: 'passive' }
    ]
  })
},
```

### Cas 3 — Cacher une tech complètement `DIY`

Doit vider **les deux niveaux** (`tech.effects` + `variation.effects`) :

```ts
{
  id: 'inspired-warriors',
  reason: 'Covered by ability.',
  after: (tech) => ({
    ...tech,
    effects: [],
    variations: tech.variations.map((v: any) => ({ ...v, effects: [] })),
  })
},
```

### Cas 4 — Exclure une tech pour certaines unités `DIY`

```ts
{
  id: 'steeled-arrow',
  reason: 'sultans-elite fires gunpowder, not arrows.',
  excludedUnits: ['sultans-elite-tower-elephant'],
},
```

### Cas 5 — Foreign Engineering (Byzantins)

```ts
{
  id: 'gambesons',
  reason: 'FEC: available to Byzantine via foreign engineering.',
  foreignEngineering: true,
  foreignEngineeringUnits: ['arbaletrier'],
  uiTooltip: 'Byzantine FEC: +20% AS on Arbalétrier.',
  uiTooltipNative: '+20% attack speed on Arbalétrier.',
},
```

### Cas 6 — Tooltip par unité

```ts
{
  id: 'incendiary-arrows',
  unitTooltips: { 'kipchak-archer': Bleed'+7.2  damage.' },
},
```

### Cas 7 — Réduction coût pierre uniquement

```ts
{
  id: 'stone-armies',
  update: {
    effects: [
      { property: 'stoneCostReduction', select: { id: ['torguud'] }, effect: 'multiply', value: 0.8, type: 'passive' }
    ]
  }
},
```

---

## 2. Patcher une ability `abilities.ts`

> **Règle critique :** Effets à **un seul niveau** (ability top-level OU variation, jamais les deux).
> `getAbilityVariation` concatène les deux → double application.

### Prompt Claude →
```
Patch ability `[id]` dans abilities.ts.
Cas : [corriger effets top-level | corriger effets variation | forcer active:'always'].
Effet : `[property]` `[effect]` `[value]` sur `[select.id]`.
```

---

### Cas 1 — Corriger les effets top-level `DIY`

```ts
{
  id: 'ability-quick-strike',
  reason: 'Effective cycle = (base + 0.5) × 0.5.',
  update: {
    effects: [
      { property: 'attackSpeed', select: { id: ['ghulam'] }, effect: 'change', value: 0.5, type: 'ability' },
      { property: 'attackSpeed', select: { id: ['ghulam'] }, effect: 'multiply', value: 0.5, type: 'ability' }
    ]
  }
},
```

### Cas 2 — Corriger les effets de variation (via `after`) `DIY`

Quand les effets sont dans les **variations** (pas au top-level), `update.effects` n'a aucun effet.

```ts
{
  id: 'ability-fortitude',
  reason: 'Raw variation has change +0.67 (wrong). Must be multiply ×0.67.',
  after: (ability) => ({
    ...ability,
    variations: ability.variations.map((v: any) => ({
      ...v,
      effects: [
        { property: 'attackSpeed', select: { id: ['sipahi'] }, effect: 'multiply', value: 0.67, type: 'ability' }
      ]
    }))
  })
},
```

### Cas 3 — Forcer `active:'always'` `DIY`

```ts
{
  id: 'ability-camel-unease',
  update: {
    active: 'always',
    effects: [
      { property: 'versusOpponentDamageDebuff', select: { id: ['camel-rider', 'camel-lancer'] }, effect: 'multiply', value: 0.8, type: 'ability' }
    ]
  }
},
```

---

## 3. Créer une ability synthétique `abilities.ts` `DIY`

**Cas le plus fréquent** — buff de civ (move speed, attack, HP pour une classe d'unité).

### Recette pas-à-pas

**Étape 1** — Ajouter dans `abilityPatches` (fichier `patches/abilities.ts`) :

```ts
// Ability synthétique — buff de civ
{
  id: 'ability-[id]',
  reason: 'Synthetic. [Description courte]. Not in raw data.',
  update: {
    active: 'manual',          // 'manual' = cliquable | 'always' = auto-activation
    minAge: 2,                 // age minimum d'apparition
    civs: ['[code-civ]'],
    icon: '/abilities/[fichier].png',   // ou URL aoe4world
    name: '[Nom affiché]',
    effects: [
      {
        property: '[property]',
        select: { class: [['[classe]']] },   // ou select: { id: ['unit-id'] }
        effect: 'multiply',                   // ou 'change'
        value: 1.15,
        type: 'ability'
      }
    ]
  }
},
```

**Étape 2** — Si mutuellement exclusives avec d'autres abilities, ajouter dans `ABILITY_UPGRADE_GROUPS` (`useUnitSlot.ts`) :

```ts
['ability-tier-1', 'ability-tier-2', 'ability-tier-3']
// Index 0 = tier le plus bas. Sélectionner un tier désactive les autres.
```

**Étape 3** — Si regroupement visuel souhaité, ajouter dans `ABILITY_ROW_GROUPS` (`patches/abilities.ts`) :

```ts
{ label: 'DYN', ids: ['ability-dynasty-song', 'ability-dynasty-yuan', 'ability-dynasty-ming'] }
```

### Prompt Claude →
```
Crée ability synthétique `[id]` dans abilities.ts.
Civ: [code] | Unités: [select.id ou select.class] | Age min: [X]
Effet : `[property]` `[multiply|change]` `[valeur]`.
Active: [manual|always] | Icon: [chemin ou URL]
[Mutuellement exclusif avec : [autre-ability-id]] (si applicable)
Pattern similaire : ability-dynasty-song
```

### Dépendances (optionnel) `DIY`

```ts
// Ability verrouillée sans une tech (useUnitSlot.ts → ABILITY_TECH_DEPENDENCIES)
'ability-gallop': 'mounted-training'

// Tech verrouillée sans une ability (useUnitSlot.ts → TECH_ABILITY_DEPENDENCIES)
'enlistment-incentives': 'ability-keep-influence'

// Ability verrouillée sans une autre ability (useUnitSlot.ts → ABILITY_DEPENDENCIES)
'ability-royal-knight-charge-damage': 'charge-attack'
```

---

## 4. Créer une technologie synthétique `technologies.ts`

> Si la "technologie" est un bouton cliquable → **préférer une ability synthétique** (Section 3).
> Section 4 uniquement si la tech doit vraiment apparaître dans la ligne TECH: ou AGE:.

### Prompt Claude →
```
Crée tech synthétique `[id]` dans technologies.ts.
Civ: [code] | Unités: [select] | Age: [X] | Ligne: [TECH|AGE]
Effets : [liste].
```

### Structure (tech absente du JSON — factory function)

```ts
function createMyTech(): Technology {
  return {
    id: 'my-tech-id',
    name: 'My Tech',
    type: 'technology',
    civs: ['en'],
    classes: ['age_up_upgrade'],   // 'age_up_upgrade' → ligne AGE ; [] → ligne TECH
    displayClasses: [],
    minAge: 3,
    icon: 'https://data.aoe4world.com/images/technologies/my-tech.png',
    description: '',
    unique: false,
    effects: [
      { property: 'hitpoints', select: { id: ['longbowman'] }, effect: 'multiply', value: 1.1, type: 'passive' }
    ] as TechnologyEffect[],
    variations: [
      {
        id: 'my-tech-id-3',
        baseId: 'my-tech-id',
        pbgid: 0,
        attribName: '',
        civs: ['en'],              // OBLIGATOIRE — getTechnologiesForUnit filtre sur variation.civs
        costs: { food: 0, wood: 0, stone: 0, gold: 0, vizier: 0, oliveoil: 0, total: 0, popcap: 0, time: 0 },
        effects: [] as TechnologyEffect[],
      }
    ],
    shared: {}
  } as Technology;
}
```

Injecter dans `applyTechnologyPatches` :

```ts
const allWithSynthetic = [...allTechs, createMyTech()];
```

---

## 5. Ajouter une arme secondaire `units.ts`

### Prompt Claude →
```
Arme secondaire sur `[unit-id]`.
Type : [permanente | débloquée par tech `[tech-id]`].
Arme source : `[weapon-name]` de `[unit-id]` (weaponIndex [N]).
[damageMultiplier: 0.3 | burstCount: 2 | maxDamage: 10] (si applicable).
```

### Cas 1 — Permanente (toujours active) `→ Claude`

```ts
{
  id: 'tower-elephant',
  reason: 'Two archers atop the tower fire simultaneously.',
  after: (unit: unknown) => {
    const u = unit as Record<string, unknown>;
    return {
      ...u,
      variations: (u.variations as Record<string, unknown>[]).map(v => {
        const vr = v as Record<string, unknown>;
        const weapons = vr.weapons as Record<string, unknown>[] | undefined;
        const bowWeapon = weapons?.find((w: any) => w.name === 'Bow');
        if (!bowWeapon) return vr;
        return { ...vr, secondaryWeapons: [{ ...bowWeapon, burst: { count: 2 } }] };
      }),
    };
  },
},
```

### Cas 2 — Débloquée par une tech (`injectWeapon`) `→ Claude`

```ts
// Dans technologies.ts
{
  id: 'thunderclap-bombs',
  reason: 'Injects Nest of Bees rocket weapon as secondary.',
  injectWeapon: { unitId: 'nest-of-bees', weaponIndex: 0 },
  update: {
    effects: [
      // value: 0 évite double-comptage, garde tech visible dans sélecteur
      { property: 'siegeAttack', select: { id: ['nest-of-bees'] }, effect: 'change', value: 0, type: 'passive' }
    ]
  }
},
```

Avec scaling personnalisé :

```ts
injectWeapon: {
  unitId: 'kipchak-archer',
  weaponIndex: 0,
  damageMultiplier: 0.3,   // 30% de modifiedStats.rangedAttack
  burstCount: 2,
  maxDamage: 10,           // cap post-multiplicateurs
},
```

### Règles de scaling (Sandbox.tsx)

| Type | Formule damage |
|------|---------------|
| Ranged (sans `damageMultiplier`) | `modifiedStats.rangedAttack` |
| Ranged (avec `damageMultiplier`) | `(base × multiplier + flatDelta) × rangedAttackMultiplier` |
| Melee | `weapon.damage + (modifiedStats.meleeAttack − primaryMeleeDamage)` |

Les bonus `vs class` de l'arme primaire (`fromWeapon: true`) **ne se propagent pas** sur l'arme secondaire.

---

## 6. Surcharger ou supprimer la charge d'une unité `Sandbox.tsx` `DIY`

La charge est calculée dans `getChargeBonus()` (Sandbox.tsx ~ligne 56).
Elle retourne **0** si `charge-attack` n'est pas actif — donc sans cette ability, aucun bonus n'est appliqué ni affiché.

### Ordre de résolution dans `getChargeBonus`

```
1. Abilities spéciales          ex: ability-trample → cataphract = 12
2. charge-attack absent         → return 0 (early exit)
3. Overrides par baseId         → early-return avant les branches génériques
4. isKnight (classe knight)     → 10 / 12 / 14 selon l'âge
5. isGhulam                     → valeurs par âge
6. chargeMultiplier > 0         → primaryWeapon.damage × chargeMultiplier
```

### Cas 1 — Supprimer les degats de charge pour une unité spécifique `DIY`

Ajouter un early-return **après** le check `charge-attack`, **avant** `isKnight`/`isGhulam` :

```ts
// Sandbox.tsx — dans getChargeBonus, après if (!activeAbilities.has('charge-attack')) return 0
if (baseId === 'my-unit') return 0;
```
### Cas 2 — Supprimer la charge pour une unité spécifique `DIY`

Rajouter au filtered l'exception de l'unité voulu

```ts
// useUnitSlot.ts
const abilities = useMemo<Ability[]>(() => {
  let filtered = "..."
})
```

### Cas 3 — Fixer une valeur de charge (indépendante de l'âge) `DIY`

```ts
// Sandbox.tsx 
if (baseId === 'jeanne-darc-knight') return 8;
```

### Cas 4 — Fixer une valeur de charge par âge `DIY`

```ts
// Sandbox.tsx 
if (baseId === 'demilancer') {
  switch (age) {
    case 2: return 8;
    case 3: return 10;
    default: return 12;
  }
}
```

> **Règle :** Toujours placer l'override avant le bloc `isKnight` (ligne ~105). Un override après serait ignoré pour les unités qui matchent `isKnight`.

---

## 7. Gérer un bug `DIY`

### Triage rapide

```
Le problème est...
│
├── Tech ou ability invisible dans le sélecteur          → Cat A
├── Effet présent mais valeur incorrecte / non appliqué  → Cat B
├── Résultat de combat faux (TTK, DPS, HTK)              → Cat C
└── Affichage UI incorrect (UnitCard, stat affichée)     → Cat D
```

---

### Cat A — Tech/Ability invisible dans le sélecteur

**Pour une tech :**
1. `isCombatTechnology(tech)` retourne false si `tech.effects` est vide → garder un effet `value: 0` dummy
2. `getTechnologiesForUnit` filtre sur `variation.civs` → vérifier que la variation a bien la civ
3. `excludedUnits` contient l'unité → vérifier `techUnitExclusions`
4. Tech en double dans `technologyPatches` → `.find()` prend la première entrée, la seconde est ignorée

**Pour une ability :**
1. `isCombatAbility(ability)` retourne false → aucun effet combat-relevant → ajouter effet `value: 0` dummy
2. `getAbilitiesForUnit` filtre sur `civs` → vérifier que l'ability a bien la civ de l'unité
3. `unlockedBy` pointe vers une tech présente → l'ability est supprimée sauf si `active: 'manual'`
4. `activeForIds` ne contient pas l'unité → auto-activation bloquée (mais l'ability reste visible)

**Ability visible pour TOUTES les civs au lieu de la bonne :**
- `civs: []` sur l'ability = aucun filtre = affichée partout
- Patch sans `civs` dans `update` → la valeur raw reste (souvent `[]`)
- Fix : ajouter `civs: ['[code-civ]']` dans le `update` du patch
```ts
update: { civs: ['ch'], ... }   // restreint à la Chine
```

**Ability avec effets per-unit (`select.id`) visible pour toutes les unités de ces listes :**
- `abilityAffectsUnit` retourne `true` dès qu'un `select.id` matche l'unité courante — même si le `select.id` de cet effet cible d'autres unités. Une unité A présente dans `select.id` de n'importe quel effet = l'ability s'affiche pour A.
- Symptôme : ability avec effets multi-unités (`select.id: ['unit-a', 'unit-b', ...]`) visible pour toutes les unités citées dans n'importe quel effet.
- Variante : `matchesByIdAsClass` — si `select.id: ['archer']` et que l'unité a `archer` dans ses CLASSES, elle matche aussi (ex: `jeanne-darc-hunter` a la classe `archer`). Fix identique : `excludeId` sur l'effet per-unit.
- Fix général : retirer les unités indésirables des `select.id` de chaque effet ET les ajouter au `excludeId` du catch-all.
```ts
// ❌ jeanne-darc-woman-at-arms voit l'ability parce qu'elle est dans ce select.id
{ select: { id: ['man-at-arms', 'jeannes-champion', 'jeanne-darc-woman-at-arms'] }, ... }

// ✓ Retirer les IDs indésirables des effets per-unit
{ select: { id: ['man-at-arms', 'jeannes-champion'] }, ... }
// + ajouter 'jeanne-darc-woman-at-arms' au excludeId du catch-all
```

**Ability visible pour les mauvaises unités malgré `excludeId` :**
- `effect.select.excludeId` filtre la visibilité via `getAbilitiesForUnit`, MAIS seulement si `unitId` est non-null à l'appel. Si `unitId` est `undefined`, le check est bypassé silencieusement → l'ability s'affiche quand même.
- Symptôme typique : ability avec `select.class` + `excludeId` qui s'affiche pour les unités exclues.
- Fix robuste : **ne pas utiliser `excludeId` pour la visibilité**. Utiliser `select.id` explicite pour cibler uniquement les unités autorisées.
```ts
// ❌ Fragile — dépend de unitId non-null
select: { class: [['land_military']], excludeId: ['unit-a', 'unit-b'] }

// ✓ Robuste — matchesById ne dépend pas de unitId
select: { id: ['unit-c', 'unit-d'] }
```

**Prompt Claude →**
```
Ability/tech `[id]` n'apparaît pas dans le sélecteur pour `[unit-id]` civ `[civ]`.
Elle est définie dans patches/[abilities|technologies].ts.
Vérifie : isCombatAbility, civs, unlockedBy, excludedUnits.
```

---

### Cat B — Effet non appliqué (stat incorrecte)

Checklist dans l'ordre :

1. **Bon niveau ?** — L'effet est dans `update.effects` (top-level) ou dans `variation.effects` (via `after`) ?
   - `applyTechnologyEffects` lit `tech.effects` (top-level). Si non vide, `variation.effects` ignorés.
   - `getAbilityVariation` concatène les deux → double si les deux sont remplis.

2. **`select` correspond à l'unité ?** — Vérifier `id` ou `class` contre les classes réelles de l'unité.
   - Classes composites (`infantry_melee`) → split underscore → `expandedTokens`. Tester avec un `id` explicite pour isoler.

3. **Propriété spéciale ?** — `attackSpeed`, `rangedResistance`, `meleeResistance`, `healingRate`, `costReduction`, `armorPenetration`, etc. → Phase 3 de `applyTechnologyEffects`. Si la propriété n'est pas dans le guard `if`, elle est ignorée silencieusement.

4. **Injecté dans les 4 blocs Sandbox ?** — Tout nouveau stat doit être dans `modifiedVariationAlly`, `modifiedVariationEnemy`, `modifiedUnit1`, `modifiedUnit2`.

5. **`multiply` sur HP ?** — Stacking additif, pas multiplicatif. `×1.25 + ×1.10 = ×1.35` (pas ×1.375).

**Diagnostic rapide — ajouter temporairement :**
```ts
// Dans applyTechnologyEffects (unified-technologies.ts), après application :
console.log('[DEBUG] modifiedStats après', tech.id, JSON.stringify(stats))

// Dans useUnitSlot.ts, après calcul de modifiedStats :
console.log('[DEBUG] modifiedStats final', modifiedStats)
```

**Prompt Claude →**
```
Effet de `[tech-id|ability-id]` non appliqué sur `[unit-id]`.
Property: `[property]`, effect: `[change|multiply]`, value: `[valeur]`.
Select: `[select utilisé]`.
Le stat concerné est `[UnitStats.xxx]` / apparaît dans modifiedVariation ? [oui|non]
```

---

### Cat C — Résultat de combat incorrect (TTK, DPS, HTK)

1. **Entrée de `computeMetrics` correcte ?** — Vérifier `CombatEntity` via `toCombatEntity` :
   - `hitpoints`, `armor.melee`, `armor.ranged`, `classes[]` corrects ?
   - `weapons[0].damage` reflète bien les techs/abilities appliqués ?
   - `secondaryWeapons` présents si attendu ?

2. **Armor type correct ?** — Siege/gunpowder ignore `rangedArmor`. `chargeArmorType` affecte le 1er hit.

3. **`chargeArmorType` injecté ?** — Doit être injecté dans les 4 blocs `modifiedVariation` de Sandbox.tsx.

4. **Résistance correcte ?** — `getResistanceValue(defender, 'melee'|'ranged')` lit le tableau `resistance[]`. Vérifier que le tableau est bien overridé dans Sandbox.tsx après calcul de `rangedResistance`/`meleeResistance`.

5. **Secondary weapons DPS** — Vérifier `totalSecDPS` dans `computeMetrics`. `discreteTTK` = true dans `computeVersus`, false dans `computeVersusAtEqualCost`.

**Diagnostic rapide :**
```ts
// Dans Sandbox.tsx, juste avant computeVersus / computeVersusAtEqualCost :
console.log('[DEBUG] entityAlly', JSON.stringify(modifiedVariationAlly))
console.log('[DEBUG] entityEnemy', JSON.stringify(modifiedVariationEnemy))
```

**Prompt Claude →**
```
TTK/DPS incorrect pour `[unit-id]` vs `[unit-id]`.
Valeur obtenue : [X]. Valeur attendue : [Y].
Techs actives : [liste]. Abilities actives : [liste].
[Suspicion : armor type | chargeArmorType | secondary weapon | resistance]
```

---

### Cat D — Affichage UI incorrect (UnitCard)

1. **Stat affichée ≠ stat calculée** → `modifiedVariation` correct ? Le champ est bien overridé dans Sandbox.tsx ?
2. **Bonus vs classe non affiché** → `UnitCard.tsx` : `expandedOpp` build loop — même logique `"non"` que `combat.ts`. Les deux doivent rester en sync.
3. **Résistance non affichée** → `meleeResistance` / `rangedResistance` : UnitCard lit le tableau `resistance[]` de `modifiedVariation`. Vérifier que Sandbox.tsx l'override bien.
4. **Tooltip manquant** → `uiTooltip` / `unitTooltips` sur le patch. `TechnologySelector` reçoit `unitId = variationAlly?.baseId ?? unit1?.id`.

**Prompt Claude →**
```
Affichage incorrect dans UnitCard pour `[unit-id]`.
Stat concernée : `[stat]`. Valeur affichée : [X]. Valeur attendue : [Y].
modifiedVariation semble correct : [oui|non].
```

---

## Pièges fréquents

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Tech toujours visible après hide | `variation.effects` non vidés | `after` pour vider les deux niveaux |
| Patch non appliqué | Deux entrées avec le même `id` | Supprimer le doublon |
| Effet ignoré silencieusement | Propriété spéciale absente du `if` Phase 3 | Ajouter dans le guard `if` de `applyTechnologyEffects` |
| Tech absente du sélecteur | `effects` vides → `isCombatTechnology` = false | Garder un effet `value: 0` |
| Bonus affiché ×2 sur arme secondaire | `fromWeapon` manquant | Tagger les modifiers à l'init dans `bonusDamage` |
| `update.effects` sur variation sans effet | `applyTechnologyEffects` ignore `variation.effects` si `tech.effects` non vide | Utiliser `after` |
| Ability appliquée deux fois | Effets aux deux niveaux (ability + variation) | Un seul niveau — top-level en général |
| Ability invisible dans le sélecteur | Aucun effet combat-relevant | `isCombatAbility` → ajouter un effet `value: 0` dummy |
