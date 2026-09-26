# Tely's Memosprites

Standalone Foundry VTT v14 module for D&D 5e 5.x. Requires **Tely's Star Rail Ultimates** v3.13.6 or later. Install both modules and enable them in the same world.

On a character sheet, open **Memosprite**. A GM can enable the sprite, drop an Actor or Item onto its source slot, choose artwork, configure up to five abilities and one of three resource displays, and place its frame over that character's combat HUD. Changes save automatically. Owners can summon or unsummon and use abilities; the GM can do both. The summon state and resource values are stored on the summoner Actor so every client sees the same state. The HUD appears while the parent module's party combat HUD is visible.

Dropping a source links its UUID and copies its name and portrait. It does not create a combatant or token. Ability buttons spend the configured resource and post the ability's description to chat; the GM can restore charges, adjust resource values and heal the sprite in the tab. The sprite's HP is its own tracked value, separate from the source Actor's HP. Edit the source Actor directly if it is meant to take ordinary Foundry damage.

The module adds a tab beside the existing HSR sheet tabs without modifying the required module's files. The frame placement controls are in the Memosprite tab's **Combat HUD frame designer** and preview the same HUD card used in combat.
