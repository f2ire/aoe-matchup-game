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
  moveSpeed   ← movement.speed (tiles/s); NEW — used for kiting
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

### Internal helpers
- `getChargeWeapon(entity)` — finds secondary melee weapon with higher damage than primary (knight/ghulam only)
- `isRangedUnit(entity)`, `getMaxRange(entity)`, `getRetreatTime(entity)` — kiting helpers

### Output metrics
`DPS, DPS_per_cost, hits_to_kill, time_to_kill, winner, formulaString`

`VersusResult.winner` is `"draw" | "attacker" | "defender"` — **never a unit ID**. Sandbox.tsx compares against `'attacker'`/`'defender'` strings, not `versusData.attacker.id`, so mirrored units (same ID on both sides) produce correct left/right winner display.

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

Charge weapon detection: secondary melee weapon with strictly higher damage than primary → used as `chargeWeapon` on hit 1.

### Weapon-swap unit system (useUnitSlot.ts)
Generalised for desert-raider and manjaniq via `WEAPON_SWAP_GROUPS` and `WEAPON_SWAP_DEFAULTS`:
- `toggleAbility` finds the group containing the toggled ability and enforces mutual exclusivity (clicking active = no-op, clicking inactive = switch).
- Auto-activate effect detects `unit.id in WEAPON_SWAP_DEFAULTS` → sets default weapon + all `active:'always'` abilities on first load.
- `effectiveVariation` handles each unit's weapon reorder logic with a per-unit `if` block.

### Desert Raider dual-weapon system
Raw weapons: `[0]` Sword (melee, +bonus vs cavalry), `[1]` Torch, `[2]` Bow (ranged, no bonus).
- `ability-desert-raider-blade` / `ability-desert-raider-bow` are **mutually exclusive** — toggling the active one is a no-op; toggling the inactive one switches modes.
- Default on unit select: **bow mode** (`ability-desert-raider-bow` auto-activated). From cavalry list: **blade mode** (virtual id `'desert-raider_cavalry'` triggers `setUnit(..., 'ability-desert-raider-blade')`).
- `effectiveVariation` memo reorders weapons: active main weapon → index 0, inactive main weapon removed, Torch kept.
- `effectiveClasses` memo: blade mode → strips ranged classes (`ranged`, `archer`, `cavalry_archer`, `ranged_hybrid`) + adds `'melee'` → melee techs appear; ranged attack techs hidden. Bow mode → original classes unchanged.
- `techs` memo additionally filters out techs whose **only** relevant effect is `rangedAttack` (e.g. Steeled Arrow, Incendiary Arrows target `desert-raider` by ID, bypassing the class strip — these are caught by a post-filter that removes purely ranged-attack techs in blade mode).
- `ability-camel-unease` is `active: 'always'` → auto-activated alongside the weapon default on unit load.
- Both weapon abilities have `property:'unknown'` (no-op in `applyTechnologyEffects`); weapon switching is driven purely by `effectiveVariation`.
- The cavalry bonus on the Sword comes from the raw weapon modifiers, not from a patch.
- `charge-attack` is explicitly excluded from desert-raider `abilities` (neither mode grants charge).

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

### rangedResistance in UnitStats / applyTechnologyEffects
`UnitStats.rangedResistance?: number` (percentage 0–100) is initialized from the unit's existing ranged resistance via `getResistanceValue(data, 'ranged')` in `useUnitSlot.ts`. Abilities/techs may add to it via `effect: 'change', value: 30` (+30 pp) or `effect: 'multiply'`.
`applyTechnologyEffects` handles it as a special property (Phase 3, like attackSpeed). All 4 modified entity objects in `Sandbox.tsx` (`modifiedVariationAlly/Enemy`, `modifiedUnit1/2`) override their `resistance` array with the computed value, so `combat.ts`'s `getResistanceValue` picks it up correctly.

### Camel Lancer charge mechanics
- Has `knight` class → `charge-attack` auto-activates and applies knight-tier bonus damage (+10/12/14 age 2/3/4).
- `ability-tactical-charge` patched with `active: 'always'` at top level → also auto-activates on select.
- **TODO** in `Sandbox.tsx:getChargeBonus`: camel-lancer charge damage uses knight values as placeholder — to verify/adjust against in-game stats.
- `setUnit(unit, preferredAbility?)` — optional second arg stores a `pendingAbilityRef` consumed by the auto-activate effect.

---

## PATCH SYSTEM (data/patches/)

Deep-partial merges on top of raw JSON data.
```ts
{ id: string, reason: string, update: DeepPartial<T>, uiTooltip?: string }
```
`after` function available on both unit and variation level — used for injecting missing age variations (e.g. bedouin-swordsman, bedouin-skirmisher).

**abilities.ts** = most frequently modified file. Add new unit special-cases here, not in combat.ts.

### Modifier target class encoding
Raw JSON encodes composite class targets as nested arrays: `[['light', 'melee', 'infantry']]`.
`combat.ts` builds `expandedTokens` from the defender's classes **and** all individual parts of compound classes (split on `_`). So `light_melee_infantry` adds `light`, `melee`, `infantry` as separate tokens. This means raw multi-token groups like `["light","melee","infantry"]` correctly match units that have the compound class `light_melee_infantry`.
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
- `categorizeUnit(unit, selectedCiv?)`: `worker` class → `'other'`; `mercenary_byz` → `'mercenary'` **only if `selectedCiv === 'by'`** — prevents units like ghulam (which have `mercenary_byz` but are also Abbasid) from disappearing into the mercenary category for other civs
- `setUnit` always clears `activeTechnologies` and `activeAbilities` on every unit switch (including non-null) — prevents stale techs from a previous unit/civ leaking onto the new selection
- `modifiedStats` clamps `moveSpeed` to a maximum of 2.0 (game cap) after all tech/ability effects are applied
- **Mercenary category**: `DEFAULT_OPEN_CATEGORIES.mercenary = false` (collapsed by default). In Sandbox.tsx, `getMercenarySubCategory` sub-groups them as Melee Infantry / Ranged Infantry / Melee Cavalry / Ranged Cavalry / Siege using `MERCENARY_SUB_ORDER`. Rendered with italic sub-labels inside the single collapsible SelectGroup. No `(mercenary)` badge — category is self-explanatory.
- Unit data is immutable; apply techs/abilities at display/computation time via hooks
- `cn()` from `src/lib/utils.ts` for conditional classNames
- Charge bonus per-age overrides are handled in `Sandbox.tsx`, not in ability data
