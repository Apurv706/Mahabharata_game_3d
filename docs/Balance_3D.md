# Balance of the 3D fights

Every fight was played by the bot 28 times (four times on each of the seven paths, on both sides in the war), with
the line of soldiers in the war and raid battles. The bot reads blows late and misses some; it stands for a careful
player, not a perfect one. Each fight runs on its own seeds, so a change to one fight does not move another's numbers.

**Overall: the bot wins 92% of fights.** In the 23 fights for which the 2D game has a recorded real-time win rate, the 3D
mean is 95% against the 2D game's 94%.

## How it was tuned

- Where the 2D game has a recorded rate for a fight, the 3D rate was brought near it. Four had drifted: the Kaurava
  cattle raid was too hard and long in 3D (71% against 95%) and was eased; the duel between the lines (100% against 84%)
  the raid on the supply carts (93% against 67%) and the duel in the sleeping camp (100% against 82%) were too easy and were
  made harder.
- War fights with no 2D rate were held to the target of the development document: 80 to 100% for a careful player,
  60 to 85% in the hard ones. Eased: the chariot wheel, day sixteen, Iravan's stand, the stand against Drona, the
  two break-throughs. Made harder: the hunt.
- The line changes little on average (a war battle's rate moved by a few points either way), because the two lines are
  matched: a pair settles in about twelve seconds, either way, and both sides are fed from the ranks.
- Two fights are meant to be lost by nearly everyone, and are: **the dream** (the bot falls after about 28 s of the 56 it
  would need to stand) and **the ring round Abhimanyu** (he grows stronger every round; you may withdraw).
- Each fight's own multipliers are `R3.TUNE` in `js/ui/battle/sim.js`; the line's numbers are `R3.LINE`.

## Fights the bot wins less than four times in five

- `e_dream`: 0%
- `e_wheel`: 75%
- `e_last_stand`: 68%
- `e_ring`: 0%
- `e_road`: 75%
- `e_ep_carts`: 68%
- `oath_arjuna_16`: 79%
- `fs_sk_escort`: 75%
- `fs_d13_break`: 79%

## Every fight

| Fight | Bot wins in 3D | 2D game, recorded | Length |
|---|---|---|---|
| `e_dream` | 0% |  | 28 s |
| `e_ugra` | 100% | 100% | 30 s |
| `e_ugra_again` | 100% |  | 30 s |
| `e_spar` | 100% | 100% | 21 s |
| `e_panchala` | 100% | 100% | 37 s |
| `e_border` | 100% | 100% | 28 s |
| `e_kings` | 100% | 100% | 23 s |
| `e_jayadratha` | 100% | 99% | 45 s |
| `e_gandharva` | 100% | 100% | 27 s |
| `e_sudatta` | 100% |  | 28 s |
| `e_cattle` | 100% | 93% | 47 s |
| `e_cattle_k` | 100% | 95% | 65 s |
| `e_day1` | 100% |  | 48 s |
| `e_guard` | 100% | 95% | 47 s |
| `e_hunt` | 86% | 88% | 61 s |
| `e_wheel` | 75% |  | 62 s |
| `e_last_stand` | 68% |  | 57 s |
| `e_ring` | 0% |  | 61 s |
| `e_gate` | 100% | 100% | 39 s |
| `e_road` | 75% | 86% | 65 s |
| `e_jaya` | 100% | 94% | 53 s |
| `e_night` | 89% |  | 61 s |
| `e_dushasana` | 100% | 90% | 40 s |
| `e_day16` | 96% |  | 61 s |
| `e_day18` | 100% |  | 47 s |
| `e_raid` | 82% | 82% | 61 s |
| `e_ash` | 86% | 90% | 59 s |
| `hold_karna` | 100% |  | 48 s |
| `hold_duryodhana` | 89% |  | 63 s |
| `hold_arjuna` | 100% |  | 48 s |
| `hold_bhima` | 93% |  | 56 s |
| `e_bandits` | 100% | 100% | 25 s |
| `e_ep_bhishma` | 96% |  | 25 s |
| `e_ep_carts` | 68% | 67% | 50 s |
| `e_ep_ugra` | 100% |  | 46 s |
| `wc_e_child_line` | 96% |  | 38 s |
| `wc_e_ghost` | 93% |  | 40 s |
| `wc_e_reach` | 100% |  | 39 s |
| `e_kb_ride` | 100% |  | 40 s |
| `e_kb_hold` | 89% |  | 47 s |
| `e_kb_guard` | 100% |  | 40 s |
| `e_kf_reach` | 100% |  | 40 s |
| `e_iravan` | 93% |  | 46 s |
| `e_lake_hold` | 93% |  | 39 s |
| `e_lake_hold_deep` | 96% |  | 42 s |
| `e_lake_three` | 100% |  | 32 s |
| `e_lake_three_deep` | 100% |  | 32 s |
| `oath_arjuna_12` | 100% |  | 58 s |
| `oath_arjuna_16` | 79% |  | 63 s |
| `oath_king_hold` | 86% |  | 47 s |
| `bh_line9` | 96% |  | 40 s |
| `cross_e_escape` | 100% | 95% | 33 s |
| `cross_e_duel` | 93% | 84% | 54 s |
| `cross_e_called` | 100% | 99% | 39 s |
| `kd_e_son` | 100% |  | 48 s |
| `kd_e_wheel` | 100% |  | 48 s |
| `fs_sk_hold` | 96% |  | 32 s |
| `fs_sk_escort` | 75% |  | 30 s |
| `fs_sk_break` | 89% |  | 12 s |
| `fs_sk_range` | 96% |  | 31 s |
| `fs_sk_chariot` | 100% |  | 31 s |
| `fs_sk_mace` | 100% | 100% | 32 s |
| `fs_sk_carry` | 100% |  | 25 s |
| `fs_d3_storm` | 96% |  | 32 s |
| `fs_d12_elephant` | 100% |  | 32 s |
| `fs_d13_break` | 79% |  | 31 s |
| `fs_d13_hold` | 100% |  | 32 s |
| `fs_d14_chariot` | 100% |  | 31 s |
| `fs_d15_narayana` | 100% |  | 0 s |
| `fs_d16_range` | 100% |  | 32 s |
| `fs_d18_mace` | 96% |  | 32 s |
| `fs_carry` | 100% |  | 25 s |

The table is `tests/baselines/fights3d.json`; `node tests/fights.js 28 21 --check` holds the fights to it (each within 22
points or three standard errors, the mean within 6), and `--accept` records a new one after a deliberate change.

## Limits

These are a bot's numbers. No person has played these fights by hand to check that the rates feel right, and the bot
plays only the view from above (the close views change what you can see, not the rules).

## 11 November: after the 2D game's Build D

The 2D game's new rules (traits, tiers, boons, gifts, archers among the packs, a harder crossing, Bhadra's fights) are in
these fights too, and every fight was replayed 28 times and the baseline recorded again. Three fights carry their own 3D
numbers, because three men round you in a field are harder than three in a line:

| Fight | 2D numbers | 3D numbers | Bot wins (2D) |
|---|---|---|---|
| The crossing (`cross_e_escape`) | health ×0.6, blows ×1.62 | health ×0.6, blows ×1.38 | 64% (69%) |
| The border road (`e_bhadra_road`) | ×1.3, ×1.5 | ×1.25, ×1.3 | 86% (about 89%) |
| Bhadra's bout (`e_bhadra`) | ×1.5, ×2.4 | ×1.3, ×1.5 | 79% |
