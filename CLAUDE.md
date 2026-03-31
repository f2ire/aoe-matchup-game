# CLAUDE.md — AOE4 Matchup Game

<!-- MAINTENANCE: Update this file after every meaningful change to combat.ts, abilities.ts,
     technologies.ts, units.ts, Sandbox.tsx, UnitCard.tsx, or useUnitSlot.ts.
     Keep sections tight — no prose, just facts. -->

## PROJECT SUMMARY
Age of Empires IV educational tool. Two modes:
- **Quiz**: Random 1v1 matchups, user picks the winner
- **Sandbox**: Interactive unit comparison with combat simulation, tech/ability toggles, kiting, equal-cost modes

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
│   ├── Index.tsx                  # Home (mode selection)
│   ├── Quiz.tsx                   # Quiz mode
│   ├── Sandbox.tsx                # ~49KB - main comparison tool (most complex page)
│   ├── Results.tsx                # Quiz results
│   └── NotFound.tsx
├── components/
│   ├── UnitCard.tsx               # ~45KB - unit stat display + vs comparisons
│   ├── AbilitySelector.tsx        # Active ability picker UI
│   ├── TechnologySelector.tsx     # Active tech picker UI
│   ├── AgeSelector.tsx            # Age dropdown (II–IV)
│   ├── VersusPanel.tsx            # Combat result display
│   ├── NavLink.tsx
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

Charge weapon detection: secondary melee weapon with strictly higher damage than primary → used as `chargeWeapon` on hit 1.

---

## PATCH SYSTEM (data/patches/)

Deep-partial merges on top of raw JSON data.
```ts
{ id: string, reason: string, update: DeepPartial<T>, uiTooltip?: string }
```
**abilities.ts** = most frequently modified file. Add new unit special-cases here, not in combat.ts.

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
- Unit data is immutable; apply techs/abilities at display/computation time via hooks
- `cn()` from `src/lib/utils.ts` for conditional classNames
- Charge bonus per-age overrides are handled in `Sandbox.tsx`, not in ability data
