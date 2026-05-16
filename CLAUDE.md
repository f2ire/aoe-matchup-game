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
  secondaryWeapons[], chargeArmorType, armorPenetration, healingRate, healingRatePerSecond, opponentAttackSpeedDebuff, opponentHealingRateDebuff
  healingRate → HP healed per hit (Keshik, Chivalry tech, Ikko-ikki Monk). healingRatePerSecond → HP healed per second (Triumph); negative = self-damage (Militia: −1 HP/s).
  healingRate and healingRatePerSecond both read from unit data in useUnitSlot baseStats — inherent unit properties, not ability/tech only.
  opponentHealingRateDebuff  ← adds to attacker's effective `dps` (shown in UI) and shortens TTK. Applied before the defender-healing block, so it stacks correctly against defender's own healingRatePerSecond. Two sources: (1) tech/ability patch via `effect:'change'`, `property:'opponentHealingRateDebuff'`; (2) unit data (read directly in `baseStats` like `healingRatePerSecond`) — set on variations in `patches/units.ts`.
  versusOpponentDamageDebuff  ← multiplier on damage dealt BY attackers when this unit is the defender (default 1; e.g. 0.8 = −20%). Set via tech effects (e.g. ruinous-blinding). Stacks multiplicatively.
  **Two application paths — never mix both on the same effect or it double-applies:**
  - `select.id` only → `applyTechnologyEffects` sets the stat on the defender; applies to ALL attackers.
  - `select.class` (with or without `select.id`) → `applyTechnologyEffects` skips it; `getVersusDebuffMultiplier` in combat.ts applies it only when the ATTACKER matches the class. Keep `select.id` for ability-selector visibility but the stat itself is NOT set via modifiedStats.
  maxHpBonusFraction  ← flat bonus damage per hit = fraction × defender.hitpoints, bypasses armor/resistance. Set via patches/units.ts on variations (e.g. kanabo-samurai: 0.06). Read in baseStats like healingRatePerSecond — NOT a tech/ability effect property.
  firstHitBlocked   ← injected in Sandbox.tsx when ability-deflective-armor active
  postChargeMeleeBonus  ← subtracted from hit 1 baseDamage when chargeBonus > 0 (royal-knight/jeanne-darc-knight post-charge buff)
  chargeModifiers   ← class-specific bonus damage added to the dagger/javelin hit (before ranged armor). Set in Sandbox.tsx 4 blocks. e.g. donso javelin: +X vs cavalry (age-scaled).
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
- `VersusResult.winnerHpRemaining` = discrete model: `clamp(winner.hp − computeDamageInTime(loser, winner, chargeBonusLoser, winner.TTK) + healingDuringFight, 0, winner.hp)`. Healing = `hitsToKill × healingRate + TTK × max(0, healingRatePerSecond)`. Clamped to [0, maxHp] — healing can never push HP above max. Counts actual hits (first hit with charge, floor((TTK − firstHitSpeed) / attackSpeed) normal hits). NOT `dps × TTK`.

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
- **Exception — Mongol improved pairs**: when both a base tech and its `-improved` counterpart are active **and `selectedCiv === 'mo'`**, their `multiply` effects on any stat (including `attackSpeed`, `healingRate`) stack **additively**: `stat × (1 + Σ(value−1))`. Implemented in `applyTechnologyEffects` via `activePairBases` + `getPairBaseId`. `selectedCiv` is the 5th parameter of `applyTechnologyEffects` — must be passed at all call sites.
- Effect with no `select` = matches **all** units
- `select.excludeId: ['unit-id']` → excludes specific unit IDs even if class matches
- `"siegeAttack"` / `"gunpowderAttack"` → stored in separate `siegeAttack` stat (NOT `rangedAttack`). Sandbox.tsx uses `siegeAttack` for `weapon.type === 'siege'` weapons, `rangedAttack` for all other non-melee. Prevents stacking when an ability targets the same class with both properties.

### Adding a civ to an existing tech
`getTechnologiesForUnit` checks **both** `tech.civs` and `variation.civs` independently — updating only one is a silent no-op:
```ts
after: (tech) => ({ ...tech, civs: [...tech.civs, 'mac'], variations: tech.variations.map(v => ({ ...v, civs: [...v.civs, 'mac'] })) })
```
Same rule applies to abilities (`ability.civs` + `variation.civs`).

### Adding bonus damage vs a target class
Use `type: 'bonus'` (NOT `'passive'`) + `target: { class: [...] }`. The `applyTechnologyEffects` bonus-damage block only fires on `effect.type === 'bonus'` — using `'passive'` is a silent no-op:
```ts
{ property: 'meleeAttack', select: { id: ['unit-id'] }, effect: 'change', value: 3, type: 'bonus', target: { class: [['infantry']] } }
```
`property: 'meleeAttack'` limits the bonus to melee weapons (excluded from ranged via `filterBonusForWeapon`). Use `'rangedAttack'` for ranged-only bonuses.

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
`maxRange`, `attackSpeed`, `rangedResistance`, `meleeResistance`, `healingRate`, `healingRatePerSecond`, `burst`, `burstDecay`,
`costReduction`, `stoneCostReduction`, `foodCostReduction`, `goldCostReduction`, `chargeMultiplier`, `chargeChange`, `bonusDamageMultiplier`, `armorPenetration`,
`rangedResistance`, `meleeResistance`, `siegeResistance`, `opponentAttackSpeedDebuff`, `versusOpponentDamageDebuff`, `opponentHealingRateDebuff`

`burstDecay` — secondary bolt damage fraction (no bonus damage). `effect:'change', value:0.4` sets it. In combat.ts: bolt 1 = full damage; bolt 2+ = `effectiveBaseDamage × decay − armor`, same debuff/resistance, clamped to 1. Stored as `weapon.burst.decay` (set via Sandbox.tsx burst assembly) and `modifiedStats.burstDecay` (UnitStats).

**CRITICAL — two lists must stay in sync when adding a new special property:**
1. `combatProperties` array (line ~95) — gates which effect properties are processed at all
2. The long `if (property === ...)` condition (line ~490) — routes the effect into `specialEffects` for Phase 3. Missing from this list = silently dropped (no error, no effect).

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

Two `useUnitSlot` hooks (`civ1` + `civ2`). State: `isVersus`, `atEqualCost`, `allowKiting`, `startDistance`. Sandbox is symmetric — naming uses `1`/`2` suffixes (e.g. `selectedCiv1`, `activeAbilities2`), not ally/enemy. `attacker`/`defender` in `combat.ts` are computation roles, not slot identities.

**4 modifiedVariation blocks — must update ALL when injecting a new stat:**
`modifiedVariation1`, `modifiedVariation2` (versus) + `modifiedUnit1`, `modifiedUnit2` (equal-cost)

**4 noTimer variation blocks (parallel, built whenever a timed ability is active on that side):**
`modifiedVariation1NoTimer`, `modifiedVariation2NoTimer`, `modifiedUnit1NoTimer`, `modifiedUnit2NoTimer`
→ Same structure as originals but with effects that have a `duration` field stripped out (effect-level filtering, not ability-level). Duration system is always active — no toggle.

`getChargeBonus(unitData, abilities, age, techs, chargeMultiplier?, abilityCounters?, modifiedRangedAttack?, chargeChange?)`
→ age-specific per-unit charge overrides live here, **not** in ability data.

---

## KEY CONSTANTS (useUnitSlot.ts)

| Constant | Purpose |
|---|---|
| `ABILITY_UPGRADE_GROUPS` | Mutually exclusive ability tiers |
| `ABILITY_DEPENDENCIES` | Ability requires another ability |
| `ABILITY_SUPPRESSIONS` | When suppressor is active, suppressed ability's effects are excluded from `applyTechnologyEffects` (effects still computed, just filtered out) |
| `abilityAbilityInteractions` | (`patches/abilities.ts`) — like `techAbilityInteractions` but ability+ability: fires when both `requiredAbility1` and `requiredAbility2` are active. `apply` sets stats absolutely (e.g. override `attackSpeed`). Applied at both modifiedStats and modifiedStatsNoTimer call sites. |
| `TECH_TECH_DEPENDENCIES` | Tech visibility gated on another tech being active, for specific unit IDs. Deactivates dependent techs in cascade when required tech is turned off. Full upgrade also applies it: if required tech is selected, best available tier of dependent techs is added. Module-level array in `useUnitSlot.ts`. |
| `TECH_ABILITY_DEPENDENCIES` | Tech requires an ability |
| `ABILITY_TECH_DEPENDENCIES` | Ability requires a tech |
| `TECH_ABILITY_LEVEL_DEPENDENCIES` | Tech locked until ability counter reaches `minLevel` (e.g. Hojo Estate level gates) |
| `ABILITY_LEVEL_DEPENDENCIES` | Ability locked until another ability counter reaches `minLevel`; supports `civs[]` filter (e.g. deflective-armor gated to sen lvl 3) |
| `CIV_TECH_EXCLUSIVE_GROUPS` | Civ-specific mutually exclusive techs |
| `DEFAULT_ACTIVE_TECHS` | Auto-activated techs on unit load (keyed by civ) |
| `LOCKED_UNIT_TECHS` | Auto-activated + locked (non-clickable) techs per unit ID |
| `WEAPON_SWAP_GROUPS` / `WEAPON_SWAP_DEFAULTS` | Dual-weapon units |
| `EXCLUDED_UNIT_IDS` | Globally hidden units |
| `BASE_MODIFYING_ABILITY_IDS` | Applied in 3rd pass (multiplicative HP) |
| `ABILITY_ROW_GROUPS` (abilities.ts) | Reserved visual rows in AbilitySelector |

`useUnitSlot` also returns `modifiedStatsNoTimer` (stats with duration-tagged effects stripped) and `activeTimedDuration` (minimum `duration` across all effects of active abilities, or undefined). Duration is read directly from effect objects in `patches/abilities.ts` — no hardcoded map.

Counter ability effects support `counterStepScale?: number` (on `TechnologyEffect`): final value = `count × step × counterStepScale`. Defaults to 1. Use when two effects in the same counter ability need different per-stack increments (e.g. +5 HP and +1 ATK per kill).

`counterSteps?: number[]` (on `Technology`/`Ability`): per-stack increment array. Overrides `counterStep` when present. Formula depends on `counterDirection`: `additive` → `effectiveValue = sum(counterSteps[0..count-1])` (use with `effect:'change'` and negative values); otherwise → `effectiveValue = 1 + sum(...)` (use with `effect:'multiply'`). Values beyond the array length contribute 0 (plateau).

`counterHideMax?: boolean` (on `Technology`/`Ability`): if true, hides the `/max` from the counter display — shows `count` only. Use for effectively-unbounded counters (e.g. kill-tracking abilities with a high sentinel max like 200 or 999).

---

## CONVENTIONS

- All styling: Tailwind only, no CSS modules
- Special-case unit behavior → `data/patches/` not `combat.ts`
- `setUnit` always clears active techs/abilities on every unit switch
- `modifiedStats` clamps `moveSpeed` to max 2.0; clamps `meleeArmor` and `rangedArmor` to min 0
- `categorizeUnit`: `jeanne_d_arc` → `'jeanne'`; `worker` → `'other'`; `mercenary_byz` → `'mercenary'` only if `selectedCiv === 'by'`; `khaganate` → `'khaganate'` only if `selectedCiv === 'mo'`
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


*For ability-specific values, full system descriptions, unit corrections → see `REFERENCE.md`*
