# CLAUDE.md — AOE4 Matchup Game

## PROJECT SUMMARY
Age of Empires IV educational tool. Main page: **Sandbox** mode (root `/`) — unit comparison with combat simulation, tech/ability toggles, kiting, equal-cost modes.

Stack: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + Framer Motion
Dev: `npm run dev` → port 8080 | Path alias: `@/` → `src/` | Types: loose (`noImplicitAny: false`)

---

## FILE MAP

```
src/
├── pages/Sandbox.tsx              # ~49KB — main page (default `/`)
├── components/
│   ├── UnitCard.tsx               # ~45KB — unit stat display + vs comparisons
│   ├── AbilitySelector.tsx        # Ability picker UI
│   ├── TechnologySelector.tsx     # Tech picker UI
│   ├── JeanneFormSelector.tsx     # Jeanne d'Arc form tree
│   ├── VersusPanel.tsx            # Combat result display
│   └── ui/                        # shadcn/radix — never modify
├── lib/
│   ├── combat.ts                  # ~31KB — all combat simulation logic
│   └── utils.ts
├── hooks/useUnitSlot.ts           # Core hook: unit selection + applied techs/abilities
└── data/
    ├── unified-units.ts           # Unit loading, interfaces, utility fns
    ├── unified-abilities.ts       # Ability loading + combat filtering
    ├── unified-technologies.ts    # Tech loading + effect application
    ├── all-unified.json           # 3.6MB — raw unit data
    ├── all-optimized_abi.json     # 352KB — abilities
    ├── all-optimized_tec.json     # 1.2MB — technologies
    └── patches/
        ├── types.ts               # Patch schema (DeepPartial merge)
        ├── units.ts               # Unit data corrections
        ├── abilities.ts           # Synthetic ability rules ← most edited
        └── technologies.ts        # Tech corrections
```

**Read large files selectively:**
- `Sandbox.tsx`: imports (top), state/handlers (~line 75), render (~line 450)
- `UnitCard.tsx`: stat display, comparison logic, tooltip formulas
- `combat.ts`: damage calc (~line 100), kiting (~line 232), equal-cost

---

## CORE DATA STRUCTURES

```
UnifiedUnit → variations: UnifiedVariation[]
  UnifiedVariation: id, baseId, age, civs[], hitpoints, costs, armor[], resistance[],
    weapons[], movement.speed, secondaryWeapons?[], continuousMovement?, selfDestructs?

CombatEntity (derived at compute time in combat.ts):
  hitpoints, costs, classes[], weapons[], activeAbilities[]
  armor:{melee,ranged}, moveSpeed, continuousMovement, selfDestructs
  secondaryWeapons[], chargeArmorType, armorPenetration, healingRate, opponentAttackSpeedDebuff
  firstHitBlocked   ← injected in Sandbox.tsx when ability-deflective-armor active
  postChargeMeleeBonus  ← subtracted from hit 1 baseDamage when chargeBonus > 0 (royal-knight/jeanne-darc-knight post-charge buff)
```

Key utilities (unified-units.ts): `getUnitVariation`, `getMaxAge`, `getPrimaryWeapon`, `getArmorValue`, `getResistanceValue`

---

## COMBAT SYSTEM

### Damage pipeline (per hit)
1. Select weapon (charge weapon on hit 1 if charge-attack + knight/ghulam)
2. Base damage − postChargeMeleeBonus (hit 1 only, when chargeBonus > 0 — post-charge buff excluded from charge hit)
3. × burst count
4. + Modifier bonuses (vs unit classes)
5. + Charge bonus (hit 1 only, if no charge weapon)
6. − Armor (melee/ranged; siege/gunpowder ignore ranged armor)
7. × (1 − resistance%) — lookup by `weapon.type`; if attacker has class `gunpowder`, also applies `{ type: 'gunpowder' }` resistance (multiplicative)
8. × versusDebuff multiplier

### Entry points
- `computeVersus(unitA, unitB, abilitiesA, abilitiesB, chargeA, chargeB, allowKiting, startDistance)`
- `computeVersusAtEqualCost(...)` — normalizes costs first
- `VersusResult.winner` = `"draw" | "attacker" | "defender"` — **never a unit ID**

### New stat full pipeline
`patches/` → `applyTechnologyEffects` → `modifiedStats` → **ALL 4 modifiedVariation blocks in Sandbox.tsx** → `toCombatEntity` → `computeMetrics`

---

## PATCH SYSTEM — CRITICAL RULES

### #1 rule: update.effects vs after
- `update.effects` → top-level ability only — **never affects variation effects**
- Variation effects come from raw JSON → to fix them, **always use `after`** to rewrite `v.effects`
- Using `update.effects` to fix a variation stat = **silent no-op**

### Effect keyword semantics
- `"change"` → additive: `stat += value`
- `"multiply"` on `hitpoints` → **additive stacking**: `HP × (1 + Σ(value−1))`
- `"multiply"` on other stats → multiplicative chaining: `stat *= value`
- Effect with no `select` = matches **all** units
- `select.excludeId: ['unit-id']` → excludes specific unit IDs even if class matches
- `"siegeAttack"` / `"gunpowderAttack"` → stored in separate `siegeAttack` stat (NOT `rangedAttack`). Sandbox.tsx uses `siegeAttack` for `weapon.type === 'siege'` weapons, `rangedAttack` for all other non-melee. Prevents stacking when an ability targets the same class with both properties.

### Adding tech effects — canonical patterns
- Raw effects empty → `update: { effects: [newEffect] }`
- Raw effects to preserve → `after: (tech) => ({ ...tech, effects: [...tech.effects, newEffect] })`
- **Never** modify `variations[].effects` for stat effects (ignored when top-level is non-empty)

### Hiding a tech completely
`update: { effects: [] }` only clears top-level. Use `after` to clear both levels:
```ts
after: (tech) => ({ ...tech, effects: [], variations: tech.variations.map(v => ({ ...v, effects: [] })) })
```

### Ability-level vs variation-level — double-application pitfall
`getAbilityVariation` concatenates both: put effects at **one level only**.

### Special properties (Phase 3 in applyTechnologyEffects)
`maxRange`, `attackSpeed`, `rangedResistance`, `meleeResistance`, `healingRate`, `burst`,
`costReduction`, `stoneCostReduction`, `foodCostReduction`, `goldCostReduction`, `chargeMultiplier`, `chargeChange`, `bonusDamageMultiplier`, `armorPenetration`,
`rangedResistance`, `meleeResistance`, `siegeResistance`, `opponentAttackSpeedDebuff`

### Modifier target class encoding
Nested arrays `[['light','melee','infantry']]` match via `expandedTokens`. Tokens after `"non"` in compound class negated. Logic duplicated in **4 places — keep in sync**:
`combat.ts`, `applyTechnologyEffects`, `technologyAffectsUnit`, `getTechnologiesForUnit` + `UnitCard.tsx`

### Key patch flags
- `foreignEngineering: true` → orange border in TechSelector for Byzantine only
- `foreignEngineeringUnits: ['id']` → restricts to specific units for Byzantine
- `excludedUnits: ['id']` → hides tech globally for those units
- `injectWeapon: {...}` → secondary weapon injected from tech (appended in useUnitSlot)
- `uiTooltip` / `uiTooltipNative` / `unitTooltips` → display text overrides

---

## SANDBOX — KEY POINTS

Two `useUnitSlot` hooks (`civ1` + `civ2`). State: `isVersus`, `atEqualCost`, `allowKiting`, `startDistance`, `showDurationEffect`. Sandbox is symmetric — naming uses `1`/`2` suffixes (e.g. `selectedCiv1`, `activeAbilities2`), not ally/enemy. `attacker`/`defender` in `combat.ts` are computation roles, not slot identities.

**4 modifiedVariation blocks — must update ALL when injecting a new stat:**
`modifiedVariation1`, `modifiedVariation2` (versus) + `modifiedUnit1`, `modifiedUnit2` (equal-cost)

**4 noTimer variation blocks (parallel, built only when `showDurationEffect` is ON and a timed ability is active):**
`modifiedVariation1NoTimer`, `modifiedVariation2NoTimer`, `modifiedUnit1NoTimer`, `modifiedUnit2NoTimer`
→ Same structure as originals but with effects that have a `duration` field stripped out (effect-level filtering, not ability-level).

`getChargeBonus(unitData, abilities, age, techs, chargeMultiplier?, abilityCounters?, modifiedRangedAttack?, chargeChange?)`
→ age-specific per-unit charge overrides live here, **not** in ability data.

---

## KEY CONSTANTS (useUnitSlot.ts)

| Constant | Purpose |
|---|---|
| `ABILITY_UPGRADE_GROUPS` | Mutually exclusive ability tiers |
| `ABILITY_DEPENDENCIES` | Ability requires another ability |
| `TECH_ABILITY_DEPENDENCIES` | Tech requires an ability |
| `ABILITY_TECH_DEPENDENCIES` | Ability requires a tech |
| `CIV_TECH_EXCLUSIVE_GROUPS` | Civ-specific mutually exclusive techs |
| `DEFAULT_ACTIVE_TECHS` | Auto-activated techs on unit load (keyed by civ) |
| `LOCKED_UNIT_TECHS` | Auto-activated + locked (non-clickable) techs per unit ID |
| `WEAPON_SWAP_GROUPS` / `WEAPON_SWAP_DEFAULTS` | Dual-weapon units |
| `EXCLUDED_UNIT_IDS` | Globally hidden units |
| `BASE_MODIFYING_ABILITY_IDS` | Applied in 3rd pass (multiplicative HP) |
| `ABILITY_ROW_GROUPS` (abilities.ts) | Reserved visual rows in AbilitySelector |

`useUnitSlot` also returns `modifiedStatsNoTimer` (stats with duration-tagged effects stripped) and `activeTimedDuration` (minimum `duration` across all effects of active abilities, or undefined). Duration is read directly from effect objects in `patches/abilities.ts` — no hardcoded map.

Counter ability effects support `counterStepScale?: number` (on `TechnologyEffect`): final value = `count × step × counterStepScale`. Defaults to 1. Use when two effects in the same counter ability need different per-stack increments (e.g. +5 HP and +1 ATK per kill).

`counterHideMax?: boolean` (on `Technology`/`Ability`): if true, hides the `/max` from the counter display — shows `count` only. Use for effectively-unbounded counters (e.g. kill-tracking abilities with a high sentinel max like 200 or 999).

---

## CONVENTIONS

- All styling: Tailwind only, no CSS modules
- Special-case unit behavior → `data/patches/` not `combat.ts`
- `setUnit` always clears active techs/abilities on every unit switch
- `modifiedStats` clamps `moveSpeed` to max 2.0
- `categorizeUnit`: `jeanne_d_arc` → `'jeanne'`; `worker` → `'other'`; `mercenary_byz` → `'mercenary'` only if `selectedCiv === 'by'`
- HRE infantry passive: `moveSpeed ×1.1` in modifiedStats (×1.05 age I) — not a tech
- `EXCLUDED_UNIT_IDS`: add unit IDs here to hide them globally (e.g. clocktower variants)
- `BASE_MODIFYING_ABILITY_IDS`: abilities applied after all others (multiplicative HP, e.g. Clocktower)

---

## WORKFLOW

### Before coding any feature
1. **Identify all files to modify.** Typical path for new ability/tech:
   `patches/abilities.ts` or `patches/technologies.ts` → `useUnitSlot.ts` (if new constant) → `Sandbox.tsx` (if new stat injection) → `combat.ts` (if new combat mechanic)
2. **If unclear which file → ask before coding.**
3. **State assumptions explicitly** if 2+ valid approaches exist — don't pick silently.

### New stat checklist
- [ ] Added to `UnitStats` interface (useUnitSlot.ts)?
- [ ] Initialized in `modifiedStats` (useUnitSlot.ts)?
- [ ] Injected into **all 4** `modifiedVariation` blocks (Sandbox.tsx)?
- [ ] Added to `CombatEntity` (combat.ts)?
- [ ] Read in `toCombatEntity` or `computeMetrics`?

### Patch rules check (run before every patch)
- [ ] Fixing a variation effect? → `after`, never `update.effects`
- [ ] New ability visible in selector? → needs a combat-relevant effect (`isCombatAbility`)
- [ ] Effect targeting a unit class? → verify expandedTokens logic consistent across 4+ locations
- [ ] Upstream impact? → does this change affect something computed earlier in the pipeline?

### During implementation
- Touch **only** the files identified above
- No adjacent cleanup, no unrelated refactors — mention other issues, don't fix them
- Don't re-read files already read in this conversation
- Don't re-search information already found earlier in the conversation

### After every coding request (patch / synthetic / bug / feature)
Append a row to `token_data.csv`:
```
date,requete,tokens,type,clarifs,resultat,avis_pe
```
- `tokens` : precise integer 
- `clarifs` : nb of questions asked before coding
- `resultat` : ok | minor | major
- `avis_pe` : one short sentence on prompt quality

*For ability-specific values, full system descriptions, unit corrections → see `REFERENCE.md`*
