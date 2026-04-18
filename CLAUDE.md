# CLAUDE.md — AOE4 Matchup Game

<!-- MAINTENANCE: Update this file after every meaningful change to combat.ts, abilities.ts,
     technologies.ts, units.ts, Sandbox.tsx, UnitCard.tsx, or useUnitSlot.ts.
     Keep sections tight — no prose, just facts. -->

## PROJECT SUMMARY
Age of Empires IV educational tool focused on the **Sandbox** mode: interactive unit comparison with combat simulation, tech/ability toggles, kiting, equal-cost modes. Sandbox is the default (root `/`) page.

Stack: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + Framer Motion
Dev: `npm run dev` → port 8080
Path alias: `@/` → `src/`
Types are loose (`noImplicitAny: false`, `strictNullChecks: false`)

---

## FILE MAP

```
src/
├── App.tsx                        # Router + providers
├── pages/
│   ├── Sandbox.tsx                # ~49KB - main page (default route `/`)
│   └── NotFound.tsx
├── components/
│   ├── UnitCard.tsx               # ~45KB - unit stat display + vs comparisons
│   ├── AbilitySelector.tsx        # Active ability picker UI
│   ├── TechnologySelector.tsx     # Active tech picker UI
│   ├── AgeSelector.tsx            # Age dropdown (II–IV)
│   ├── VersusPanel.tsx            # Combat result display
│   └── ui/                        # ~50 shadcn/radix components (don't modify)
├── lib/
│   ├── combat.ts                  # ~31KB - all combat simulation logic
│   └── utils.ts                   # cn(), formatClassName()
├── hooks/
│   ├── useUnitSlot.ts             # Core hook: unit selection + applied techs/abilities
│   ├── use-toast.ts
│   └── use-mobile.tsx
└── data/
    ├── unified-units.ts           # Unit loading, interfaces, utility fns
    ├── unified-abilities.ts       # Ability loading + combat-relevant filtering
    ├── unified-technologies.ts    # Tech loading + effect application
    ├── civilizations.ts           # Civ metadata
    ├── all-unified.json           # 3.6MB — raw unit data (aoe4world API)
    ├── all-optimized_abi.json     # 352KB — abilities data
    ├── all-optimized_tec.json     # 1.2MB — technologies data
    └── patches/
        ├── types.ts               # Patch schema (DeepPartial merge system)
        ├── units.ts               # Unit data corrections
        ├── abilities.ts           # Synthetic ability rules (most frequently edited)
        └── technologies.ts        # Tech corrections
```

---

## CORE DATA STRUCTURES

### UnifiedUnit / UnifiedVariation (unified-units.ts)
```
UnifiedUnit
  id, name, icon, type, civs[], classes[], displayClasses[], minAge
  variations: UnifiedVariation[]
    id, baseId, age, civs[]
    hitpoints
    costs: { food, wood, stone, gold, oliveoil, popcap, time }
    armor[]: { type: 'melee'|'ranged', value }
    resistance[]: { class, percentage }
    weapons: UnifiedWeapon[]
      name, type: 'melee'|'ranged'|'siege'
      damage, speed, range
      modifiers[]: { class, value }      ← bonus vs unit class
      burst: { count }                   ← multi-projectile
      durations: { aim, windup, attack, winddown, reload, setup, teardown }
    movement.speed, sight
```

### CombatEntity (combat.ts — internal)
Derived from UnifiedVariation at compute time:
```
CombatEntity
  hitpoints, costs, classes[], weapons[], activeAbilities[]
  armor: { melee, ranged }
  moveSpeed          ← movement.speed (tiles/s); used for kiting
  continuousMovement ← bool (default false); if true + ranged speed > melee speed → melee TTK = null in kiting
  selfDestructs      ← bool (default false); if true + hitsToKill > 1 → TTK/DPS = null (can never kill)
  secondaryWeapons   ← UnifiedWeapon[] (default []); fired simultaneously, DPS summed with primary weapon. Ranged secondaries are scaled by modifiedStats.rangedAttack in Sandbox.tsx (same as primary ranged weapons).
```

### Key exported utilities (unified-units.ts)
- `aoe4Units` — full unit array
- `getUnitVariation(unit, age, civ)` — get specific variant
- `getMaxAge(unit)` — highest available age
- `getPrimaryWeapon(variation)` — first weapon
- `getArmorValue(variation, 'melee'|'ranged')` — armor number
- `getResistanceValue(variation, class)` — resistance %

---

## COMBAT SYSTEM (combat.ts)

### Main entry points
- `computeVersus(unitA, unitB, abilitiesA, abilitiesB, chargeA, chargeB, allowKiting, startDistance)`
- `computeVersusAtEqualCost(...)` — same signature, normalizes costs first
- `applyKitingToMetrics(metricsA, metricsB, entityA, entityB, d0)` — called internally when `allowKiting=true`

### Damage pipeline (per hit)
1. Select weapon: charge weapon on hit 1 if `charge-attack` active + unit is knight/merc_ghulam, else primary weapon
2. Base weapon damage × burst count
3. + Modifier bonuses (vs unit classes, AND logic per group)
4. + Charge bonus on hit 1 (only if no charge weapon — ghulam fallback path)
5. - Armor (melee or ranged; siege/gunpowder ignore ranged armor)
6. × (1 - resistance%)
7. × versusDebuff multiplier (e.g. camel unease: ×0.8 vs cavalry)

### Kiting system (applyKitingToMetrics)
`START_DISTANCE = 5` tiles (default configurable from Sandbox)

| Matchup | Behaviour |
|---|---|
| Ranged vs Ranged | Both TTKs += shared approach time |
| Melee vs Melee | Unchanged |
| Ranged vs Melee | Ranged fires → retreats during winddown+reload. If ranged permanently outruns melee → melee TTK = null |

Charge speed boost: melee unit with `charge-attack` active gets ×1.2 move speed until first hit (affects kiting calculation).

`continuousMovement` flag: if `ranged.continuousMovement === true` and `speedRanged > speedMelee`, melee TTK = null immediately (before the normal delta check). Must be set on each **variation** (not unit top-level) — `toCombatEntity` receives a `UnifiedVariation`, not the `AoE4Unit`. Use `after` at the unit level to spread it onto all variations: `u.variations = u.variations.map(v => ({ ...v, continuousMovement: true }))`. Example: Mangudai.

`selfDestructs` flag: must be set on **each variation** (same as `continuousMovement`) — `toCombatEntity` receives a `UnifiedVariation`. Use `after` to spread onto both unit top-level and all variations. If `hitsToKill > 1` → TTK/DPS nulled out (unit cannot kill). Applied to: `explosive-dhow`, `demolition-ship`, `explosive-junk`, `lodya-demolition-ship`.

### Internal helpers
- `getChargeWeapon(entity)` — finds secondary melee weapon with higher damage than primary (knight/ghulam only)
- `isRangedUnit(entity)`, `getMaxRange(entity)`, `getRetreatTime(entity)` — kiting helpers

### Healing mechanic
`CombatEntity.healingRate` (HP/hit) — defender heals this amount for each hit it lands. In `computeMetrics`, after base TTK is computed:
- `healPerS = healingRate / defenderAttackSpeed`
- `netDPS = attackerDPS − healPerS`
- if `netDPS ≤ 0` → defender is immortal (`hitsToKill = null`, `timeToKill = null`)
- otherwise → `timeToKill = defenderHP / netDPS`

Pipeline: `UnitStats.healingRate` (initialized to 0) → `applyTechnologyEffects` Phase 3 (`property: 'healingRate'`) → `modifiedStats` → injected into modified variation in Sandbox.tsx → `toCombatEntity` → `computeMetrics`.

### Output metrics
`DPS, DPS_per_cost, hits_to_kill, time_to_kill, winner, formulaString`

`VersusResult.winner` is `"draw" | "attacker" | "defender"` — **never a unit ID**. Sandbox.tsx compares against `'attacker'`/`'defender'` strings, not `versusData.attacker.id`, so mirrored units (same ID on both sides) produce correct left/right winner display.

**Equal Cost winner logic:** `combatDuration = min(TTK_A, TTK_B)` — the fight ends when the first side dies. `damageTaken = groupDPS × combatDuration` for each side. Winner = side with more whole units remaining (`Math.floor(hpRemaining / unitHP)`); tiebreaker = raw `hpRemaining` when both floor to 0.

---

## ABILITIES (data/patches/abilities.ts)

All synthetic abilities not present in raw aoe4world data. The 5 key ones:

| ID | Unit | Effect |
|---|---|---|
| `charge-attack` | All melee | +20% move speed until first hit. Knights also get +10/12/14 bonus dmg (age 2/3/4). Ghulam +5/6 (age 3/4). Uses per-age logic in Sandbox.tsx |
| `ability-camel-unease` | Camel units | Passive debuff: nearby horse cavalry deal ×0.8 damage |
| `ability-quick-strike` | Ghulam | Two rapid attacks: effective cycle = (base + 0.5) × 0.5. Applied as `attackSpeed` effects |
| `ability-golden-age-tier-4` | Ayyubid (siege) | Siege units cost ×0.8 (−20%). Maps `property: "unknown"` → `costReduction` via patch |
| `ability-golden-age-tier-5` | Ayyubid (camel) | Camel-lancer & desert-raider attack cycle ×(1/1.2) (20% faster). Maps `property: "unknown"` → `attackSpeed` via patch |
| `ability-atabeg-supervision` | Ayyubid `land_military` | Atabeg grants +20% HP to supervised units. Patched to `hitpoints ×1.2` targeting `land_military` class (raw data had `unknown` targeting only atabeg itself). |
| `ability-tactical-charge` | Camel Lancer (Ayyubid) | Always active (patched `active:'always'` at top level). Currently no-op stats (`unknown` property); charge damage applied via `charge-attack` + knight class. |
| `ability-shield-wall` | Limitanei (Byzantine) | Patched variation effects: `moveSpeed ×0.75` (−25%), `attackSpeed ×0.75` (25% faster attacks), `rangedResistance +30` (30% ranged damage reduction). Raw data had all three wrong (additive speed values, rangedArmor instead of resistance). |
| `ability-trample` | Cataphract (Byzantine) | +12 first-hit bonus handled by `getChargeBonus` in Sandbox.tsx. Raw `meleeAttack +12` zeroed, `moveSpeed ×1.25` on variation effects (not `update.effects` — see PATCH SYSTEM note). |
| `ability-fortitude` | Sipahi (Ottoman/Byzantine) | Raw variation had `change +0.67` (adds to cycle = slower). Corrected to `multiply ×0.67` on variations (= −33% cycle = +50% attacks/s). Duration 10s noted in uiTooltip but not modelled. |
| `ability-arrow-volley` | Longbowman + Wynguard Ranger (English/Byzantine via FEC) | Attack speed hard-overridden to 0.6s in `useUnitSlot.ts` post-calc (after all techs/abilities) — `if (activeAbilities.has('ability-arrow-volley')) result.attackSpeed = 0.6`. `foreignEngineering: true`, FEC restriction applies to `longbowman` only; `wynguard-ranger` added via variation effect `select.id` patch (no FEC required). Duration not modelled. |
| `ability-council-hall` | Longbowman (English) | Synthetic. `costReduction ×0.95` (−5% cost). Age 2+. Icon: `/abilities/council-hall.png`. |
| `ability-network-of-castles` | English (all land units) | Per-unit `attackSpeed multiply` from in-game measurements (2026/04/18). No uniform model — 15 unit corrections like Zeal. Announced +20%, effective avg +18.3%. `active:'manual'`. |
| `ability-network-of-citadels` | English (all land units, age 3+) | Same approach as Castles. Announced +30%, effective avg +23.8%. `active:'manual'`. Mutually exclusive with Castles via `ABILITY_UPGRADE_GROUPS`. |
| `ability-dynasty-song` | Chinese (all, age 2+) | Synthetic. `moveSpeed ×1.15` targeting `find_non_siege_land_military` class (infantry + cavalry, excludes siege). |
| `ability-dynasty-yuan` | Chinese (all, age 3+) | Synthetic. `moveSpeed ×1.15` targeting `find_non_siege_land_military` OR `naval_unit` (all non-siege units including ships). Icon: `/abilities/AoE4_YuanDynasty.png`. |
| `ability-dynasty-ming` | Chinese (all, age 4) | Synthetic. `hitpoints ×1.15` targeting `military` class. Additive HP stacking. Icon: `/abilities/AoE4_MingDynasty.webp`. |
| `ability-spirit-way` | Chinese dynasty units | Raw data has no effects. Patched via `after` with per-unit hard-fixed `attackSpeed multiply` values derived from in-game observations: Fire Lancer ×(1.31/1.625), Zhuge Nu ×(1.58/1.75), Grenadier ×(1.38/1.625). No uniform formula found — each unit type (melee/ranged/siege) shows different effective reduction. `uiTooltip`: "Only the attackSpeed increase is implemented". |

**`zeal` tech (Ottoman):** Raw value 0.7 → corrected base to ×1/1.5. Per-unit correction factors applied on top via `after` (chained multiply). No uniform model found — average effective buff is −28.3% cycle (+39.4% AS, not +50%). Corrections: man-at-arms ×(1.5/1.375), archer ×(1.875/1.625), crossbowman ×(2.295/2.125), handcannoneer ×(2.37/2.125), tower-elephant/sultans-elite/war-elephant ×(3.0/2.875), lancer ×1.08, ghazi-raider ×0.96 (outlier: faster than theory). Spearman matches theory exactly (no correction).
| `ability-astronomical-clocktower` | Chinese (age 3+) | Synthetic. `hitpoints ×1.5` targeting `siege` class. Replaces the 5 separate `clocktower-*` unit variants (excluded via `EXCLUDED_UNIT_IDS` in `useUnitSlot.ts`). Applied as a **base-modifier** (see `BASE_MODIFYING_ABILITY_IDS`): its ×HP is multiplicative with Ming Dynasty/techs, not additive. Icon: `/abilities/ability_astronomicalclocktower.png`. |

Charge weapon detection: secondary melee weapon with strictly higher damage than primary → used as `chargeWeapon` on hit 1.

### Civ-specific mutually exclusive technologies (useUnitSlot.ts)
`CIV_TECH_EXCLUSIVE_GROUPS: Record<string, string[][]>` — maps a civ abbreviation to groups of tech IDs that are mutually exclusive for that civ. Activating any tech in a group automatically deactivates the others in the same group.
- Uses `selectedCivRef` (a ref updated at render time) so `toggleTechnology`'s `useCallback` dependency array stays empty.
- Current entry: `'by': [['biology', 'royal-bloodlines']]` — Byzantine players can have biology (+25% HP) OR royal-bloodlines (+35% HP), never both.
- To add a new group: append to the relevant civ's array (or add a new civ key).

`DEFAULT_ACTIVE_TECHS: Record<string, string[]>` — maps a civ abbreviation to tech IDs that are auto-activated on unit load for that civ (if the tech is present in the unit's tech list).
- Runs in a `useEffect` on `[unit, selectedCiv, techs]`. User can manually uncheck after load.
- `lockedTechnologies: Set<string>` — derived memo returned from `useUnitSlot`; contains all IDs from `DEFAULT_ACTIVE_TECHS[selectedCiv]`. Passed to `TechnologySelector` → renders locked techs at 30% opacity with `cursor-not-allowed`; clicking is a no-op.
- Current entry: `'by': ['howdahs']`.
- To add: append to the relevant civ's array (or add a new civ key).

### Ability upgrade/tier system (useUnitSlot.ts)
`ABILITY_UPGRADE_GROUPS: readonly (readonly string[])[]` — exported module-level constant. Each entry is an ordered array of ability IDs forming a mutually exclusive tier chain (index 0 = tier 1, index 1 = tier 2, etc.).
- `toggleAbility`: clicking an inactive ability deactivates all others in the group and activates the clicked one. Clicking the currently active ability deactivates it (unlike `WEAPON_SWAP_GROUPS` where clicking active = no-op).
- No visual badge — mutual exclusion is enforced silently (selecting one deactivates the other).
- Current entries: `['ability-dynasty-song', 'ability-dynasty-yuan', 'ability-dynasty-ming']` — Chinese dynasties (tier 1/2/3); `['ability-network-of-castles', 'ability-network-of-citadels']` — Network of Castles (tier 1) upgrades to Network of Citadels (tier 2).
- To add a new upgrade chain: append an ordered array of ability IDs to `ABILITY_UPGRADE_GROUPS` in `useUnitSlot.ts`. No other changes needed.

### Weapon-swap unit system (useUnitSlot.ts)
Generalised for desert-raider and manjaniq via `WEAPON_SWAP_GROUPS` and `WEAPON_SWAP_DEFAULTS`:
- `toggleAbility` finds the group containing the toggled ability and enforces mutual exclusivity (clicking active = no-op, clicking inactive = switch).
- Auto-activate effect detects `unit.id in WEAPON_SWAP_DEFAULTS` → sets default weapon + all `active:'always'` abilities on first load.
- `effectiveVariation` handles each unit's weapon reorder logic with a per-unit `if` block.

### Ability dependency system (useUnitSlot.ts)
`ABILITY_DEPENDENCIES: Record<string, string>` — maps a dependent ability ID to its required ability ID. A dependent ability can only be active when its required ability is also active.
- `toggleAbility`: toggling OFF a required ability → also removes all dependents. Toggling ON a dependent when requirement is not met → silent no-op.
- Auto-activate effect: abilities listed in `ABILITY_DEPENDENCIES` are skipped during auto-activation on unit load (they activate when their requirement activates).
- When a required ability is toggled ON: all `active:'always'` dependents present in the current `abilities` list are automatically added.
- `lockedAbilities: Set<string>` — derived memo returned from `useUnitSlot`; contains IDs of abilities whose requirement is not currently active.
- `AbilitySelector` accepts `lockedAbilities` prop → renders locked abilities at 30% opacity with `cursor-not-allowed`; clicking is a no-op.
- Current entry: `'ability-royal-knight-charge-damage'` requires `'charge-attack'`.
- To add a new dependency: append `{ 'ability-id': 'required-ability-id' }` to `ABILITY_DEPENDENCIES` in `useUnitSlot.ts`. No other changes needed.

### Tech-gated abilities (ABILITY_TECH_DEPENDENCIES)
`ABILITY_TECH_DEPENDENCIES: Record<string, string>` — maps an ability ID to a required technology ID. The ability is visible but locked unless that tech is also active.
- `toggleAbility`: activation is a silent no-op if the required tech is not active (uses `activeTechnologiesRef` to avoid closure dep).
- `toggleTechnology`: deselecting a tech automatically removes all abilities that depend on it via `setActiveAbilities` inside the tech setter.
- `lockedAbilities` memo: includes abilities in `ABILITY_TECH_DEPENDENCIES` whose required tech is absent. `AbilitySelector` already renders locked abilities at 30% opacity with `cursor-not-allowed`.
- `getAbilitiesForUnit` (`unified-abilities.ts`): `unlockedBy` suppression skipped when `variation.active === 'manual'` — manual abilities stay visible even when their unlocking tech appears in the tech list.
- Current entry: `'ability-gallop'` requires `'mounted-training'`.
- To add a new entry: append `{ 'ability-id': 'required-tech-id' }` to `ABILITY_TECH_DEPENDENCIES` in `useUnitSlot.ts`. No other changes needed.

### Desert Raider dual-weapon system
Raw weapons: `[0]` Sword (melee, +bonus vs cavalry), `[1]` Torch, `[2]` Bow (ranged, no bonus).
- `ability-desert-raider-blade` / `ability-desert-raider-bow` are **mutually exclusive** — toggling the active one is a no-op; toggling the inactive one switches modes.
- Default on unit select: **bow mode** (`ability-desert-raider-bow` auto-activated). From cavalry list: **blade mode** (virtual id `'desert-raider_cavalry'` triggers `setUnit(..., 'ability-desert-raider-blade')`).
- The `desert-raider_cavalry` virtual duplicate is added in `categorizedUnits`: for non-mercenary civs → added to `cavalry`; for Byzantine (where desert-raider is `mercenary`) → added to `mercenary` category with blade-mode classes (ranged classes stripped, `'melee'` added) so `getMercenarySubCategory` places it in **Melee Cavalry**. Both trigger blade mode via `setUnit(..., 'ability-desert-raider-blade')`.
- `effectiveVariation` memo reorders weapons: active main weapon → index 0, inactive main weapon removed, Torch kept.
- `effectiveClasses` memo: blade mode → strips ranged classes (`ranged`, `archer`, `cavalry_archer`, `ranged_hybrid`) + adds `'melee'` → melee techs appear; ranged attack techs hidden. Bow mode → original classes unchanged.
- `techs` memo additionally filters out techs whose **only** relevant effect is `rangedAttack` or `maxRange` (e.g. Steeled Arrow, Incendiary Arrows, Silk Bowstrings target `desert-raider` by ID, bypassing the class strip — these are caught by a post-filter using `RANGED_ONLY_PROPS = Set(['rangedAttack', 'maxRange'])` in blade mode).
- `ability-camel-unease` is `active: 'always'` → auto-activated alongside the weapon default on unit load.
- Both weapon abilities have `property:'unknown'` (no-op in `applyTechnologyEffects`); weapon switching is driven purely by `effectiveVariation`.
- The cavalry bonus on the Sword comes from the raw weapon modifiers, not from a patch.
- `charge-attack` is explicitly excluded from desert-raider and cataphract `abilities` (neither unit can charge despite having `melee`/`knight` class).

### Manjaniq dual-weapon system
Raw weapons: `[0]` Mangonel (siege, dmg 10, burst 3, +30 vs building/naval_unit, +10 vs ranged), `[1]` Incendiary (fire, dmg 2, burst 12, +16 vs building/naval_unit — no ranged bonus), `[2]` Adjustable Crossbars (siege, alternate upgrade weapon).
- `ability-swap-weapon-kinetic` / `ability-swap-weapon-incendiary` — mutually exclusive, default kinetic on load.
- `effectiveVariation`: incendiary mode retyped `fire → 'siege'` so `modifiedStats` treats it as `siegeAttack` (ignores ranged armor, stats display correctly).
- Unit patch (`units.ts`): `transformMultiClassTargets` fixes `[["naval","unit"]]` → `"naval_unit"` on all modifiers (same approach as culverin).

### Tech × Ability interactions (patches/abilities.ts + useUnitSlot.ts)
`techAbilityInteractions: TechAbilityInteraction[]` — declarative list of conditional stat boosts that require **both** a tech and an ability to be active simultaneously. Evaluated in `useUnitSlot.ts` after the two `applyTechnologyEffects` calls.
```ts
{ requiredTech, requiredAbility, unitId?, apply: (stats) => UnitStats }
```
To add a new interaction: append an entry to `techAbilityInteractions` in `patches/abilities.ts`. No changes needed in `useUnitSlot.ts`.

### rangedResistance / meleeVulnerability in UnitStats / applyTechnologyEffects
`UnitStats.rangedResistance?: number` (percentage 0–100) is initialized from the unit's existing ranged resistance via `getResistanceValue(data, 'ranged')` in `useUnitSlot.ts`. Abilities/techs may add to it via `effect: 'change', value: 30` (+30 pp) or `effect: 'multiply'`.
`applyTechnologyEffects` handles it as a special property (Phase 3, like attackSpeed). All 4 modified entity objects in `Sandbox.tsx` (`modifiedVariationAlly/Enemy`, `modifiedUnit1/2`) override their `resistance` array with the computed value, so `combat.ts`'s `getResistanceValue` picks it up correctly.

`UnitStats.meleeVulnerability?: number` (percentage 0–100) — same pipeline as `rangedResistance` but for incoming melee damage amplification. Initialized to 0 in `baseStats`. Injected into resistance array as `{ type: 'melee_vulnerability', value }`. In `combat.ts`, read via `getResistanceValue(defender, 'melee_vulnerability')` when `weapon.type === 'melee'` → multiplies damage by `(1 + pct/100)`. Current use: `ability-fortitude` (Sipahi) applies `+50` while active.
Display in `UnitCard.tsx`: Melee Armor value turns orange with dotted underline + tooltip when `meleeVulnerability > 0`. A dedicated "Melee Vuln. +X%" line appears below Melee Armor in both the compact stat block and the detailed panel.

### Camel Lancer charge mechanics
- Has `knight` class → `charge-attack` auto-activates and applies knight-tier bonus damage (+10/12/14 age 2/3/4).
- `ability-tactical-charge` patched with `active: 'always'` at top level → also auto-activates on select.
- **TODO** in `Sandbox.tsx:getChargeBonus`: camel-lancer charge damage uses knight values as placeholder — to verify/adjust against in-game stats.
- `setUnit(unit, preferredAbility?)` — optional second arg stores a `pendingAbilityRef` consumed by the auto-activate effect.

---

## PATCH SYSTEM (data/patches/)

Deep-partial merges on top of raw JSON data.
```ts
{ id: string, reason: string, update: DeepPartial<T>, uiTooltip?: string, foreignEngineering?: boolean }

`foreignEngineering: true` on a tech patch → added to `foreignEngineeringTechIds` (exported Set from `patches/technologies.ts`) → `TechnologySelector` renders it with orange border/bg **only when `selectedCiv === 'by'`** (prop passed from Sandbox.tsx). Other civs that have the tech natively see no special styling.
`foreignEngineeringUnits: ['unit-id', ...]` on a patch → added to `foreignEngineeringUnitRestrictions` (exported `Map<string, string[]>`) → `useUnitSlot.ts` `techs` memo filters out the tech for Byzantine unless `unit.id` is in the list. Techs without `foreignEngineeringUnits` have no unit restriction.
`excludedUnits: ['unit-id', ...]` on a patch → added to `techUnitExclusions` (exported `Map<string, string[]>`) → `useUnitSlot.ts` `techs` memo filters out the tech globally for those unit IDs regardless of civ.
`injectWeapon: { unitId, weaponIndex? }` on a patch → added to `weaponInjectionMap` (exported `Map<string, { unitId, weaponIndex }>`) → `useUnitSlot.ts` computes `secondaryWeapons` from active techs → injected into `modifiedVariation` in Sandbox.tsx → `toCombatEntity` reads it → `computeMetrics` sums secondary DPS with primary DPS and recalculates TTK. The raw tech effect should be zeroed (`value: 0`) to avoid double-counting. Example: `thunderclap-bombs` → `nest-of-bees` weapon index 0 (Rocket Arrow, siege, 6 dmg × 7 burst).
**Always-active secondary weapons** (no tech required): set `secondaryWeapons: [weapon]` on the unit's variations via `patches/units.ts` `after` function. `useUnitSlot.ts` `secondaryWeapons` memo reads `variation.secondaryWeapons` first, then appends tech-injected ones. `UnifiedVariation` has `secondaryWeapons?: UnifiedWeapon[]`. Examples: `tower-elephant` — Bow (dmg 15, speed 1.375) with `burst: { count: 2 }` added by patch. `sultans-elite-tower-elephant` — Handcannon (dmg 38, speed 1.625, `burst: { count: 2 }` already in raw data) moved to `secondaryWeapons` by patch. `war-elephant` — Spear (dmg 25, speed 1.875, melee type) with modifiers +40 vs cavalry / +6 vs war_elephant / +34 vs worker_elephant preserved from raw data.
**Secondary weapon scaling in Sandbox.tsx** (applied in all 4 blocks — `modifiedVariationAlly/Enemy` and `modifiedUnit1/2`):
- **Ranged/siege secondary** `damage` = `modifiedStats.rangedAttack * debuffMultiplier`. `rangedAttack` is initialised in `useUnitSlot` from `secondaryWeapons[0].damage` when the primary weapon is melee (e.g. Tower Elephant Bow = 15), so ranged techs scale it correctly.
- **Melee secondary** `damage` = `(w.damage + meleeAttackDelta) * debuffMultiplier`, where `meleeAttackDelta = modifiedStats.meleeAttack − getPrimaryWeapon(source).damage`. This propagates flat melee attack tech bonuses (e.g. +5 on Tusks → +5 on Spear) and the debuff multiplier to the secondary melee weapon.
- **Ranged/siege secondary** `modifiers` = `filterBonusForWeapon(bonusDamage, w.type)` (tech-enhanced class bonuses, filtered by type).
- **Melee secondary** `modifiers` = `[...w.modifiers, ...filterBonusForWeapon(bonusDamage, 'melee')]` (weapon's own class bonuses merged with shared melee bonusDamage — e.g. Spear keeps +40 vs cavalry and also gains Tusks' +45 vs building + any tech bonuses).
Same `foreignEngineering`/`foreignEngineeringUnits`/`uiTooltip` flags work on ability patches (`abilityPatches` in `patches/abilities.ts`). Exports: `foreignEngineeringAbilityIds` (Set) and `foreignEngineeringAbilityUnitRestrictions` (Map). `AbilitySelector` applies orange styling + `*` tooltip badge when `selectedCiv === 'by'`. `useUnitSlot.ts` `abilities` memo filters by unit restriction for Byz.
```
`after` function available on both unit and variation level — used for injecting missing age variations (e.g. bedouin-swordsman, bedouin-skirmisher).

**`update.effects` vs variation effects — critical distinction:** `update.effects` (via `deepMerge`) sets effects on the **top-level** ability object only. `getActiveAbilityVariations` returns **variation** objects, whose `effects` come from the raw JSON — they are NOT inherited from the top-level patch. To fix or override variation effects, always use the `after` function to rewrite `v.effects` on each variation. Using `update.effects` alone to correct an effect value will have no impact on the computed stats.

**Ability-level vs variation-level effects — double-application pitfall:** `getAbilityVariation` (`unified-abilities.ts`) **concatenates** variation effects + ability-level effects: `mergedEffects = [...variationEffects, ...ability.effects]`. If the same effect list is set at both levels (e.g. synthetic abilities created with identical `effects` on the ability and its variation), it applies twice. Rule: put effects at **one level only**. For `charge-attack`, effects live at the ability level; the variation has `effects: []`.

**Zeroing a raw effect without hiding the tech:** `isCombatTechnology` (called at module load) filters out techs with no combat effects → they disappear from the selector. To nullify a raw effect while keeping the tech visible, use `update: { effects: [{ ...same shape, value: 0 }] }` — the effect still matches the unit (so the tech appears) but has zero stat impact. Do NOT use `effects: []` in `after` — that removes the tech from `combatTechnologies` entirely.

**`effect` keyword semantics in `applyTechnologyEffects` (`unified-technologies.ts`):**
- `"change"` → additive: `stat += value` for all properties including `moveSpeed`.
- `"siegeAttack"` / `"gunpowderAttack"` with `type: 'passive'` → mapped to `rangedAttack` slot (same stat, same weapon damage field). `type: 'bonus'` goes through the bonus damage path instead.
- `"multiply"` → depends on the property:
  - **`hitpoints`**: **additive stacking on pre-Phase-2 base HP**. Each multiplier contributes `(value - 1)` to a running delta, applied once: `HP_base × (1 + Σ(value - 1))`. e.g. ×1.25 + ×1.10 = HP × 1.35 (not ×1.375).
  - **All other stats**: multiplicative chaining (`stat *= value`).
- **Note:** `moveSpeed` previously had a special case where `"change"` was treated as a percentage (`stat *= 1 + value/100`). This is now commented out. Two raw techs (`do-maru-armor`, `kabura-ya-whistling-arrow`) use `change: 10` and are now broken (+10 t/s instead of +10%) — patch them to `multiply: 1.1` when needed.
- Special properties (`maxRange`, `attackSpeed`, `rangedResistance`, `meleeVulnerability`, `healingRate`, `burst`, `costReduction`) are handled in Phase 3 with their own additive/multiplicative logic.

**abilities.ts** = most frequently modified file. Add new unit special-cases here, not in combat.ts.

### Modifier target class encoding
Raw JSON encodes composite class targets as nested arrays: `[['light', 'melee', 'infantry']]`.
Four places build an `expandedTokens` set from the unit's classes **and** all underscore-split parts: `combat.ts`, `applyTechnologyEffects`, `technologyAffectsUnit`, and the `tech.effects` block inside `getTechnologiesForUnit` (all in `unified-technologies.ts`). So `archer_ship` adds `archer` and `ship` as individual tokens, meaning raw multi-token groups like `["archer","ship"]` correctly match units with the compound class `archer_ship`. **All four must stay in sync** — if you change the logic in one, update the others.
**Exception:** tokens immediately following `"non"` in a compound class are excluded from `expandedTokens` — e.g. `find_non_siege_land_military` splits to `["find","non","siege","land","military"]` but `"siege"` is negated (follows `"non"`) and not added. This prevents Horseman's `+13 vs siege` from falsely applying to Palace Guard. `"siege_range"` is unaffected since it contains no `"non"` prefix. **This same logic is duplicated in `UnitCard.tsx` (`expandedOpp` build loop) for the versus-mode bonus display — both must stay in sync.**
**Rule for patches:** still prefer the underscore form: `target: { class: ['infantry_light'] }` — it's unambiguous and avoids multi-token groups.

---

## SANDBOX PAGE (Sandbox.tsx)

Two `useUnitSlot` hooks (ally, enemy) drive everything.
`useUnitSlot` tracks: selected unit, age, civ, active techs[], active abilities[]

### State
```ts
isVersus: boolean
atEqualCost: boolean
allowKiting: boolean                         // NEW
startDistancePreset: 'melee'|'medium'|'long'|'custom'  // NEW
customDistance: number                        // NEW (clamped 0–30)
startDistance: 0 | 5 | 9 | customDistance    // derived
```

### Modes
- **Versus**: calls `computeVersus` → shows winner + metrics
- **Equal Cost**: calls `computeVersusAtEqualCost`
- **Kiting** (NEW): `allowKiting=true` + `startDistance` passed into both compute fns
- Distance preset UI only visible when kiting is enabled

UnitCard renders the modified variation after techs/abilities are applied.

---

## KNOWN LARGE FILES
Read only relevant sections — never load whole file:
- `Sandbox.tsx` ~49KB → sections: imports, state/handlers (~line 75), render (~line 450)
- `UnitCard.tsx` ~45KB → sections: stat display, comparison logic, tooltip formulas
- `combat.ts` ~31KB → sections: damage calc (~line 100), kiting (~line 232), equal-cost

---

## CONVENTIONS
- Tailwind for all styling; no CSS modules
- shadcn/ui in `src/components/ui/` — prefer extending over rewriting
- Special-case unit behaviors → `data/patches/` not `combat.ts`
- `EXCLUDED_UNIT_IDS` (`useUnitSlot.ts`): set of unit IDs filtered out of `filteredUnits` regardless of civ. Currently excludes the 5 `clocktower-*` Chinese siege variants (replaced by `ability-astronomical-clocktower`). To exclude a unit globally, add its ID here.
- `BASE_MODIFYING_ABILITY_IDS` (`useUnitSlot.ts`): set of ability IDs applied in a **separate 3rd pass** of `applyTechnologyEffects`, after techs and regular abilities. This makes their HP multiplier act as a final multiplier (multiplicative) rather than additive with the rest. Used for Clocktower: `HP_base × (1 + Σ_techs + Σ_abilities) × 1.5` instead of `HP_base × (1 + Σ_all)`. To add a new "base-modifying" ability, add its ID here.
- `categorizeUnit(unit, selectedCiv?)`: `worker` class → `'other'`; `mercenary_byz` → `'mercenary'` **only if `selectedCiv === 'by'`** — prevents units like ghulam (which have `mercenary_byz` but are also Abbasid) from disappearing into the mercenary category for other civs
- `setUnit` always clears `activeTechnologies` and `activeAbilities` on every unit switch (including non-null) — prevents stale techs from a previous unit/civ leaking onto the new selection
- `modifiedStats` clamps `moveSpeed` to a maximum of 2.0 (game cap) after all tech/ability effects are applied
- HRE infantry passive: `modifiedStats` applies `moveSpeed ×1.1` for `selectedCiv === 'hr'` + infantry class — formerly a technology, now a baked-in passive absent from raw data. Applied before the 2.0 cap. Exception: `landsknecht` also gets the bonus when `selectedCiv === 'by'` (mercenary use).
- **Mercenary category**: `DEFAULT_OPEN_CATEGORIES.mercenary = false` (collapsed by default). In Sandbox.tsx, `getMercenarySubCategory` sub-groups them as Melee Infantry / Ranged Infantry / Melee Cavalry / Ranged Cavalry / Siege using `MERCENARY_SUB_ORDER`. Rendered with italic sub-labels inside the single collapsible SelectGroup. No `(mercenary)` badge — category is self-explanatory.
- Unit data is immutable; apply techs/abilities at display/computation time via hooks
- `cn()` from `src/lib/utils.ts` for conditional classNames
- Charge bonus per-age overrides are handled in `Sandbox.tsx`, not in ability data
