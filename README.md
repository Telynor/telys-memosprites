# Tely’s Memosprites

Foundry VTT v14 addon for D&D 5e 5.x, requiring Tely’s Star Rail Ultimates **3.14.0-preview.19 or later**. Update both modules and reload the world.

Enable **Has a memosprite?** on a character’s Memosprite tab. Every Path can use the configuration, floating Summon button and hotbar macro. Drop a world Actor as the source, choose a circular portrait, configure up to five abilities and resources, and position the companion frame on the HSR combat party HUD. Changes save automatically. Owners can summon, dismiss and use abilities; the GM configures the kit.

## Safe placement

With Ultimates preview.22 or later, the Summon button opens D&D5e’s native token placement, the same preview used by summon spells. Move the full-sized token beside the summoner and left-click to place it. Right-click or Escape cancels, and invalid positions reopen the preview with a warning. Token width and height come from the source Actor. With lighting boundaries present, the entire footprint must fit inside the map without overlapping tokens, bisecting a lighting-blocking wall, or landing behind a lighting barrier relative to the summoner. Light-only walls block placement even when movement is allowed. Open doors and scene levels use the parent module’s placement rules. Without lighting walls or surfaces, only the selected square must be on the map; the full creature still needs unoccupied space.

The GM rechecks the footprint after token data is prepared and immediately before creation. Size changes, newly occupied squares and new walls cannot bypass that check. No legal position reports **Cannot Fit** and creates no token. The connected GM creates an unlinked token and its initiative entry, so separate copies retain independent HP. Summon operations on the same scene are serialized. A native spell Summon activity also receives the full-footprint lighting-wall check through Ultimates.

## Live summon portrait and HP

The newest creature summoned by a character temporarily supplies its companion HUD portrait and **that exact token’s current/max HP**. This recognizes the memosprite button, Ultimates Skill/Ultimate Actor lists and native D&D5e Summon activities, including ordinary spell casting outside the Skill button. A Skill can also cast a known spell or a compendium spell through **Casts spell? → Spell known / Other**.

External summons use their own colored Actor artwork with a neutral portrait crop. A native memosprite summon keeps the configured portrait/crop. The HP semicircle follows the summoned token’s synthetic Actor; changing a template or another creature copy’s HP does not change that token’s display. Temporary artwork and HP are display mappings and do not replace the saved memosprite design.

At **0 HP**, token deletion or scene removal, the active mapping ends. The HP arc and number hide, and an enabled memosprite returns to its saved grayscale portrait, crop, layout and defaults. A character without an enabled memosprite can show the temporary companion overlay while its summon is alive; that temporary overlay disappears afterward. Healing a creature after its mapping ended does not silently reactivate the binding. A new summon creates a new mapping.

There is one active companion HP slot: the newest summon wins. When it ends, the HUD returns to defaults rather than switching to an older creature or combining their HP. An older creature’s death/deletion cannot clear a newer binding. Summoner and token references include their scenes, and the active reference persists across reloads. A stale reference is cleared when the GM reconnects.

## Configuration and abilities

The source UUID, name, default artwork and portrait are distinct from the summoner’s identity. Dropping a source never renames the summoner. An idle Actor source supplies the preview HP; while a live summon is displayed, edit HP on that token’s sheet. Manual HP defaults remain available for non-Actor sources. Disabled live-HP fields are excluded from configuration saves.

The frame designer uses the parent HUD’s layout. Drag and scale the portrait/semicircle, HP text, resource display and ability row independently. Choose an X/Y counter, up to three dots or a fang percentage display. Visibility switches control the frame’s parts. The portrait editor supports image selection, drag positioning and wheel zoom. Save Portrait applies its pending crop; Cancel retains the stored one. The name and Talent hiding options affect HUD display without changing the summoner Actor.

An active summoned token’s D&D5e and MidiQOL damage can be attributed to its own summoner’s HSR Element and Break settings. Separate unlinked copies remain distinct. If a linked Actor belongs to more than one live summoner, ambiguous Actor-only attribution is not guessed. Ability resource costs are separate from shared Skill Points; configured ability damage uses the normal chat damage workflow.

## Help and integration

Detailed instructions, images, searchable guides and field tooltips are bundled with Ultimates under **Help Documentation → Memosprites / Skill spell casting**. Search for `casts spell`, `spell known`, `compendium spell`, `memosprite HP`, `Cannot Fit` or `lighting wall`.

Native D&D5e summon hooks and HSR summons provide reliable caster metadata. Custom summoning macros must supply an explicit `flags.telys-star-rail-ultimates.summonOwner` reference with `casterUuid`, `casterId`, `casterTokenId` and `createdAt`; the token must pass the same placement guard. The active GM can then call `game.modules.get("telys-memosprites").api.bindSummon(actor, token)`. The addon does not infer a caster from shared ownership or a matching creature name. `getSummonView(actor)` exposes the current display mapping; `config(actor)` reports live summoned state without replacing stored portrait/HP defaults.
