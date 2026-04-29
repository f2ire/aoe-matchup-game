# REFERENCE.md — AOE4 Matchup Detailed Reference

Read this file selectively when working on a specific system. Do not load entirely.

---

## ABILITIES TABLE (patches/abilities.ts)

| ID | Unit | Effect summary |
|---|---|---|
| `charge-attack` | All melee | +20% move speed until first hit. Knights +10/12/14 dmg (age 2/3/4). Ghulam +5/6 (age 3/4). Demilancer +4/5/14 (override via `baseId === 'demilancer'` before `isKnight` check). |
| `ability-camel-unease` | Camel units | Passive: nearby horse cavalry deal ×0.8 damage |
| `ability-quick-strike` | Ghulam | Two rapid attacks: effective cycle = (base + 0.5) × 0.5 |
| `ability-golden-age-tier-4` | Ayyubid siege | Siege cost ×0.8. Maps `unknown` → `costReduction` |
| `ability-golden-age-tier-5` | Ayyubid camel | Camel-lancer & desert-raider cycle ×(1/1.2). Maps `unknown` → `attackSpeed` |
| `ability-atabeg-supervision` | Ayyubid `land_military` | +20% HP. Patched to `hitpoints ×1.2` targeting `land_military` |
| `ability-tactical-charge` | Camel Lancer | `active:'always'`. No-op stats; charge via `charge-attack` + knight class |
| `ability-shield-wall` | Limitanei (Byzantine) | `moveSpeed ×0.75`, `attackSpeed ×0.75`, `rangedResistance +30` on variation effects via `after` |
| `ability-trample` | Cataphract (Byzantine) | +12 first-hit bonus via `getChargeBonus`. `meleeAttack +12` zeroed, `moveSpeed ×1.25` on variation |
| `ability-fortitude` | Sipahi (Ottoman/Byz) | `multiply ×0.67` on variations (−33% cycle = +50% AS). `meleeResistance −50` (vulnerability). |
| `ability-arrow-volley` | Longbowman + Wynguard Ranger | `attackSpeed` hard-overridden to 0.6s in `useUnitSlot.ts` post-calc. `foreignEngineering:true` for longbowman only. |
| `ability-council-hall` | Longbowman (English) | `costReduction ×0.95`. Age 2+. |
| `ability-network-of-castles` | English land units | Per-unit `attackSpeed multiply` from measurements (2026/04/18). Announced +20%, avg +18.3%. `active:'manual'`. Mutually exclusive with Citadels. |
| `ability-network-of-citadels` | English land units age 3+ | Same approach. Announced +30%, avg +23.8%. `active:'manual'`. |
| `ability-valorous-inspiration` | Jeanne d'Arc (`je`) | Per-unit `attackSpeed multiply` from measurements (2026/04/25). 13 unit corrections + `land_military` catch-all (×1/1.35). JD forms (`jeanne-darc-*`) exclus des effets per-unit ET du catch-all. `jeannes-champion` + `jeannes-rider` conservés. |
| `ability-dynasty-song` | Chinese age 2+ | `moveSpeed ×1.15` targeting `find_non_siege_land_military` |
| `ability-dynasty-yuan` | Chinese age 3+ | `moveSpeed ×1.15` targeting `find_non_siege_land_military` OR `naval_unit` |
| `ability-dynasty-ming` | Chinese age 4 | `hitpoints ×1.15` targeting `military` class. Additive HP stacking. |
| `ability-spirit-way` | Chinese dynasty units | Per-unit hard-fixed `attackSpeed multiply`: Fire Lancer ×(1.31/1.625), Zhuge Nu ×(1.58/1.75), Grenadier ×(1.38/1.625). |
| `ability-kabura-ya` | Onna-Musha (Japanese age 3+) | `moveSpeed ×1.1`. `active:'manual'` on ability + variation (bypasses `unlockedBy` suppression). |
| `ability-katana-bannerman-aura` | Japanese | `meleeAttack ×1.15` on melee infantry. `active:'always'` restricted via `activeForIds` |
| `ability-yumi-bannerman-aura` | Japanese | `rangedAttack ×1.15` on ranged infantry. `active:'always'` restricted via `activeForIds` |
| `ability-uma-bannerman-aura` | Japanese | `meleeAttack ×1.10` + `rangedAttack ×1.10` on cavalry. `active:'always'` restricted via `activeForIds` |
| `buddhist-conversion` | Japanese age 3+ | `meleeAttack`, `rangedAttack`, `siegeAttack` ×1.2 on `land_military`. `active:'manual'`. |
| `ability-nehan` | Japanese age 4 | `moveSpeed ×1.25` on `land_military`. `active:'manual'`. |
| `ability-five-mountain-ministries` | Japanese age 3+ | `versusOpponentDamageDebuff ×0.5` targeting `annihilation_condition`. All enemies −50% damage. |
| `ability-galvanize-the-righteous` | Jeanne d'Arc (`je`) | `meleeArmor/rangedArmor +1`, `meleeAttack/rangedAttack ×1.1` sur `jeannes-champion` + `jeannes-rider`. `active:'manual'`. Raw ciblait les formes JD (incorrect). |
| `ability-consecrate` | Jeanne d'Arc | `foodCostReduction ×0.75` sur `select.id: ['jeannes-champion','jeannes-rider']`. `civs:['je']`. Note: ancienne approche `class:annihilation_condition + excludeId` supprimée — `excludeId` fragile pour la visibilité si `unitId` undefined. |
| `ability-holy-wrath` | JD melee forms | Counter: `counterMax:4, counterDirection:'additive', counterStep:30, unitCounterStep:{woman-at-arms:20,knight:30,blast-cannon:50}`. Flat armor-ignoring damage via `getChargeBonus`. `chargeArmorType:'none'`. |
| `ability-astronomical-clocktower` | Chinese age 3+ | `hitpoints ×1.5` on `siege`. Replaces 5 clocktower variants. `BASE_MODIFYING_ABILITY_IDS`. |
| `ability-khan-warcry-2/3/4` | Mongols + Golden Horde | Three tiers: `meleeAttack`+`rangedAttack` ×1.1/×1.2/×1.3 on `annihilation_condition`. Mutually exclusive. |
| `ability-defensive-aura-edict` | Golden Horde | `hitpoints ×1.1` (no select = all units). `active:'always'`. |
| `ability-kharash-aura` | Golden Horde | `meleeArmor +1`, `rangedArmor +1` on `find_non_siege_land_military`. `excludeId:['kharash']`. |
| `ability-glorious-charge` | Golden Horde | `moveSpeed ×1.5`, `rangedResistance +15`, `meleeResistance +15` on `military`. `minAge:3`. |
| `ability-khan-debuff-arrow` | Golden Horde | Enemies take +10% damage: `meleeAttack`+`rangedAttack`+`siegeAttack` ×1.1 on `annihilation_condition`, `excludeId:['battering-ram']`. |
| `ability-relic-garrisoned-dock` | HRE/OD | Counter: `counterMax:5, counterStep:0.05, direction:decrease`. Galley override: `0.03`. |
| `ability-lord-of-lancaster-inspiration` | English | Counter: `counterMax:4, counterStep:0.05, direction:increase, label:'HP'`. |
| Kipchak Archer bleed | Kipchak Archer | Hardcoded in `getChargeBonus`: base +12. +7.2 added when `incendiary-arrows` active. Label "Bleed". |
| `ability-house-unified` | Earl's Guard + Demilancer | Counter: `counterMax:6, counterStep:1, counterDirection:'additive'`. +1 melee attack + +1 dagger throw per Keep. |
| `ability-dagger-throw` | Earl's Guard | Age 3 → +16, age 4 → +22 base. Ranged damage (not melee). `chargeArmorType:'ranged'`. Scales with `throwing-dagger-drills` (+2/dagger), castle stacks (+1/stack), ranged attack techs (+1 each). |
| `ability-house-unified` | Earl's Guard | `chargeBonusBurst` field: `getChargeBonusBurst()` returns burst count. UnitCard shows `+24×2 Dagger`. |
| `stone-armies` tech | Rus Tribute (`gol`) | Age-4 variation removed via patch. Tech grants: `hitpoints +30`, `meleeAttack +4`, bonus +5 vs cavalry, `meleeArmor +1`, `rangedArmor +1`, stone cost ×0.8. |
| `upgrade-shinobi-3/4` | Shinobi (`ja`) | Baked into age-3/4 variations. Excluded via `techUnitExclusions`. |

### versusOpponentDamageDebuff visibility rule
`abilityAffectsUnit` and `getAbilitiesForUnit`: `select.id` = units that own the ability; `select.class` = classes that can own it. Both checked. In combat, `select.class` identifies which attackers are debuffed.

### Zeal tech (Ottoman)
Raw value 0.7 → corrected base to ×1/1.5. Per-unit correction factors applied via `after`. Average effective buff: −28.3% cycle (+39.4% AS). Corrections: man-at-arms ×(1.5/1.375), archer ×(1.875/1.625), crossbowman ×(2.295/2.125), handcannoneer ×(2.37/2.125), tower-elephant/sultans-elite/war-elephant ×(3.0/2.875), lancer ×1.08, ghazi-raider ×0.96. Spearman matches theory exactly.

---

## COMBAT SYSTEM — DETAILED

### Kiting system (applyKitingToMetrics)
`START_DISTANCE = 5` tiles default.

| Matchup | Behaviour |
|---|---|
| Ranged vs Ranged | Both TTKs += shared approach time |
| Melee vs Melee | Unchanged |
| Ranged vs Melee | Ranged fires → retreats during winddown+reload |

`continuousMovement` flag: if true + `speedRanged > speedMelee` → melee TTK = null immediately. Must be set on each **variation** via `after`. Example: Mangudai.

`selfDestructs` flag: if `hitsToKill > 1` → TTK/DPS null. Must be set on each **variation** via `after`. Applied to: `explosive-dhow`, `demolition-ship`, `explosive-junk`, `lodya-demolition-ship`.

Charge speed boost: melee with `charge-attack` → ×1.2 move speed until first hit (affects kiting calc).

### Secondary weapons in computeMetrics
**Discrete model** (`discreteTTK = true` — used by `computeVersus`):
- `effectiveFirstCycle = firstAttackData.value × attackerMultiplier + totalSecDPS × firstHitSpeed`
- `effectiveNormalCycle = normalAttackData.value × attackerMultiplier + totalSecDPS × attackSpeed`
- `HTK = 1 + Math.ceil((HP − effectiveFirstCycle) / effectiveNormalCycle)`
- `TTK = firstHitSpeed + (HTK − 1) × attackSpeed`

**Continuous model** (`discreteTTK = false` — used by `computeVersusAtEqualCost`): `dps += totalSecDPS`, `TTK = HP / combinedDPS`.

### Secondary weapon scaling (Sandbox.tsx — all 4 blocks)
- Ranged/siege (no `damageMultiplier`): `modifiedStats.rangedAttack × debuffMultiplier`
- Ranged/siege (with `damageMultiplier`): `(rangedBase × damageMultiplier + flatDelta) × rangedAttackMultiplier × debuffMultiplier`
- Melee: `(w.damage + meleeAttackDelta) × debuffMultiplier` — propagates flat melee tech bonuses
- Ranged `modifiers`: filtered via `filterBonusForWeapon(bonusDamage, w.type)`, excludes `chargeBonusLabel` entries
- Melee `modifiers`: `[...w.modifiers, ...filterBonusForWeapon(bonusDamage, 'melee').filter(b => !b.fromWeapon)]`

### Healing mechanic
`CombatEntity.healingRate` (HP/hit). In `computeMetrics`:
- `healPerS = healingRate / defenderAttackSpeed`
- `netDPS = attackerDPS − healPerS`
- if `netDPS ≤ 0` → immortal (`hitsToKill = null`, `timeToKill = null`)

Pipeline: `UnitStats.healingRate` (init 0) → `applyTechnologyEffects` Phase 3 (`property:'healingRate'`) → `modifiedStats` → injected in Sandbox.tsx → `toCombatEntity`.

### firstHitBlocked flag
Injected in Sandbox.tsx when `ability-deflective-armor` active on defender. First hit = 0 damage (charge nullified), attacker spends `firstHitSpeed`, then normal hits. `HTK = 1 + ceil(HP / effectiveNormalCycle)`, `TTK = firstHitSpeed + normalHTK × attackSpeed`. Formula prefixed `Deflect`.

### chargeArmorType
- `'ranged'`: first-hit chargeBonus uses ranged armor + ranged resistance (Earl's Guard dagger throw)
- `'none'`: chargeBonus bypasses all armor/resistance — added flat (Jeanne holy wrath)
- Must be set on each variation via Sandbox.tsx injection

### Equal Cost winner logic
`combatDuration = min(TTK_A, TTK_B)`. `damageTaken = groupDPS × combatDuration`. Winner = side with more `Math.floor(hpRemaining / unitHP)` units. Tiebreaker: raw `hpRemaining`.

### getChargeWeapon
Secondary melee weapon with strictly higher damage than primary → used as `chargeWeapon` on hit 1 (knight/ghulam).

---

## UNIT SYSTEMS (useUnitSlot.ts)

### Ability dependency system (ABILITY_DEPENDENCIES)
Maps `dependentAbility → requiredAbility`. Toggling OFF required → removes all dependents. Toggling ON dependent when requirement absent = no-op. Current: `'ability-royal-knight-charge-damage'` requires `'charge-attack'`.

### Tech-gated abilities (TECH_ABILITY_DEPENDENCIES)
Maps `tech → requiredAbility`. Tech activation = no-op if ability absent. Deactivating ability removes dependent techs. Current: `'enlistment-incentives'` requires `'ability-keep-influence'`.

### Ability-gated techs (ABILITY_TECH_DEPENDENCIES)
Maps `ability → requiredTech`. Ability activation = no-op if tech absent. Deselecting tech removes dependent abilities. Current: `'ability-gallop'` requires `'mounted-training'`.

### CIV_TECH_EXCLUSIVE_GROUPS
Maps civ → mutually exclusive tech groups. Uses `selectedCivRef` to avoid closure issues. Current: `'by': [['biology', 'royal-bloodlines']]`.

### DEFAULT_ACTIVE_TECHS
Maps civ → auto-activated tech IDs on unit load. `lockedTechnologies` set: rendered at 30% opacity, not clickable. Current: `'by': ['howdahs']`.

### Counter ability system
Fields: `counterMax`, `counterStep`, `counterDirection` (`'decrease'`/`'increase'`/`'additive'`), `counterTooltipLabel`, `unitCounterStep`.
State: `abilityCounters: Map<string, number>` + `incrementAbility(id)` / `decrementAbility(id)`.
UI: amber border + count badge when active; `[−] N/max [+]` row below.
At count 0 = inactive (absent from `activeAbilities`).

To add: patch with `counterMax`, `counterStep`, etc. No changes needed in useUnitSlot or AbilitySelector.

### Ability upgrade tiers (ABILITY_UPGRADE_GROUPS)
Ordered arrays of mutually exclusive ability IDs. Clicking inactive = switch, clicking active = deactivate.
Current: Chinese dynasties, Network of Castles/Citadels, Khan War Cry tiers.

### Per-unit auto-activation (activeForIds)
`Ability.activeForIds?: string[]` — restricts `active:'always'` auto-activation to specific unit IDs.
Current use: bannerman auras.

### Weapon swap system (WEAPON_SWAP_GROUPS / WEAPON_SWAP_DEFAULTS)
Mutually exclusive weapon abilities. Clicking active = no-op; clicking inactive = switch.
`effectiveVariation` handles weapon reorder per-unit. `effectiveClasses` adjusts class list.
Units: desert-raider, manjaniq.

### Desert Raider dual-weapon
Raw weapons: `[0]` Sword (melee, +bonus vs cavalry), `[1]` Torch, `[2]` Bow (ranged).
- `ability-desert-raider-blade` / `ability-desert-raider-bow` — mutually exclusive, default bow.
- From cavalry list: blade mode (`desert-raider_cavalry` virtual duplicate).
- Byzantine: `desert-raider_cavalry` in mercenary → Melee Cavalry subcategory.
- Blade mode: strips ranged classes + adds `'melee'`. Post-filter removes `RANGED_ONLY_PROPS` techs.
- `charge-attack` explicitly excluded for desert-raider.

### Manjaniq dual-weapon
Raw weapons: `[0]` Mangonel (siege), `[1]` Incendiary (fire), `[2]` Adjustable Crossbars.
- `ability-swap-weapon-kinetic` / `ability-swap-weapon-incendiary` — mutually exclusive, default kinetic.
- Incendiary mode: retyped `fire → 'siege'` in `effectiveVariation`.

### Tech × Ability interactions (techAbilityInteractions in patches/abilities.ts)
Declarative list: `{ requiredTech, requiredAbility, unitId?, apply: (stats) => UnitStats }`.
Evaluated in useUnitSlot after two `applyTechnologyEffects` calls.
To add: append to `techAbilityInteractions`. No changes needed elsewhere.

### ABILITY_ROW_GROUPS (patches/abilities.ts)
Reserved visual rows in AbilitySelector. Format: `{ label: string; ids: readonly string[] }`.
Current: `{ label:'WC', ids:['ability-khan-warcry-2','ability-khan-warcry-3','ability-khan-warcry-4'] }`, `{ label:'CTR', ids:['ability-house-unified','ability-lord-of-lancaster-inspiration'] }`.

---

## PATCH SYSTEM — DETAILED

### injectWeapon flag
`{ unitId, weaponIndex?, damageMultiplier?, burstCount?, maxDamage? }` → added to `weaponInjectionMap`.
`useUnitSlot.ts` computes `secondaryWeapons` from active techs → injected into `modifiedVariation` in Sandbox.tsx.
Raw tech effect should be zeroed (`value: 0`) to avoid double-counting.
Examples: `thunderclap-bombs` → nest-of-bees weapon. `triple-shot` → kipchak-archer weapon 0, `damageMultiplier:0.3, burstCount:2, maxDamage:10`.

### Always-active secondary weapons (no tech)
Set `secondaryWeapons: [weapon]` on variations via `patches/units.ts` `after`. Read first in `useUnitSlot.ts`.
Examples: tower-elephant Bow (dmg 15, speed 1.375, burst 2), sultans-elite Handcannon (dmg 38, burst 2), war-elephant Spear (dmg 25, melee, +40 vs cavalry).

### Foreign engineering flags
- `foreignEngineering: true` → orange border in TechSelector/AbilitySelector for `selectedCiv === 'by'` only
- `foreignEngineeringUnits: ['id']` → `foreignEngineeringUnitRestrictions` Map → useUnitSlot filters tech for Byz unless unit matches
- `uiTooltipNative` → shown for native civ when `foreignEngineering: true`
- Same flags work on ability patches (`foreignEngineeringAbilityIds`, `foreignEngineeringAbilityUnitRestrictions`)

### Effect keyword edge cases
- `moveSpeed "change"` → additive. Old special % case is commented out. Raw techs using `change:10` for % must be patched to `multiply:1.1`.
- `bonusDamageMultiplier` → multiplies all existing `bonusDamage` entries. Local variable (never stored in UnitStats, no double-apply).
- `armorPenetration` → reduces enemy armor by N. Applied after armor type resolved, inside non-siege block.
- `stoneCostReduction` → stone-only cost multiplier, applied on top of `costMultiplier` for stone resource only.
- `chargeMultiplier` → first-hit charge bonus = `primaryWeapon.damage × chargeMultiplier`. Only applies when `charge-attack` active, and only for units not covered by knight/ghulam/firelancer/cataphract/kipchak early returns.

### Jeanne d'Arc category / forms
7 forms: `jeanne-darc-peasant`, `jeanne-darc-woman-at-arms`, `jeanne-darc-hunter`, `jeanne-darc-knight`, `jeanne-darc-mounted-archer`, `jeanne-darc-blast-cannon`, `jeanne-darc-markswoman`. All class `jeanne_d_arc`. `categorizeUnit` → `'jeanne'`. Entry point: `jeanne-darc-peasant`. Form selector: `<JeanneFormSelector>` popover grid (2-col, level-grouped). `isJeanneUnit` + `JEANNE_FORM_TREE` from `JeanneFormSelector.tsx`.

### Camel Lancer charge mechanics
Knight class → `charge-attack` auto-activates, uses knight-tier bonus. `ability-tactical-charge` patched `active:'always'`. **TODO in Sandbox.tsx:getChargeBonus** — camel-lancer charge damage uses knight values as placeholder; verify/adjust against in-game stats.

### select.excludeId
`TechnologyEffect.select.excludeId?: string[]` — excludes unit baseIds from effect even when class/id matches. Checked in `applyTechnologyEffects`, `abilityAffectsUnit`, `getAbilitiesForUnit`. Current use: `ability-kharash-aura` excludes `'kharash'`.

### rangedResistance / meleeResistance
`UnitStats.rangedResistance` (% 0–100): initialized from `getResistanceValue(data, 'ranged')`. Ability/tech can add via `change: N`. All 4 modified entity objects in Sandbox.tsx override `resistance` array.
`UnitStats.meleeResistance` (signed): positive = reduction, negative = vulnerability (amplifies damage). Display: positive → neutral underline; negative → orange + "Melee Vuln." label in UnitCard.

### Mercenary subcategories
`getMercenarySubCategory` groups as Melee Infantry / Ranged Infantry / Melee Cavalry / Ranged Cavalry / Siege via `MERCENARY_SUB_ORDER`. Italic sub-labels, no badge.
