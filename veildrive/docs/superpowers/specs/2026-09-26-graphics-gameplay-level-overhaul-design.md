# VEIL//DRIVE — Graphics, Gameplay, Weapon & Level Design Overhaul

**Date:** 2026-09-26  
**Status:** Approved Design Document  
**Branch:** `feat/graphics-gameplay-overhaul`

Comprehensive design specification for upgrading VEIL//DRIVE's visual fidelity, character models, gun & blade mechanics, boss encounters, procedural level art, and scenario flow under the **Hyper-Stylized Neon Action** aesthetic.

---

## 1. Vision & Architecture Principles

- **Zero External Assets:** All visuals, animations, decals, and audio continue to be synthesized procedurally in runtime Canvas-2D / Three.js shaders and Web Audio API without external image or audio files.
- **Pacing & Invariants:** Maintain the 960×540 virtual resolution, 60 Hz fixed timestep simulation, seed determinism, and existing campaign progression structure (15 missions across 3 phases).
- **Tactical Depth & Mechanical Realism:** Elevate combat from simple point-and-click to authentic weapon handling (cycling slides, shell ejection, pump racking, bolt hold-open, blade parry frames) coupled with dynamic environmental interactions.

---

## 2. Character & Boss Visual Overhaul (`src/render/character.js`, `src/entities/`)

### 2.1 MOTH-0 (Player Character)
- **Bomber Jacket Dynamics:** Velocity-reactive cloth simulation on the jacket collar and hem, displaying dynamic flutter during sprinting and dashes. Faded teal outer shell with vibrant magenta interior lining and high-contrast asymmetric seam stitching.
- **Moth Mask Detailing:** Dual offset eye slits with subtle pulse luminescence tied to health/stamina; faint forward ambient illumination cone in dark sectors.
- **Dash & Motion Polish:** Tri-color chromatic aberration ghosting (cyan, magenta, white) with faint directional spark discharge and dust settling.
- **Weapon Handling Posture:** Two-handed braced handgun stances, realistic weapon grip points, visible slide blowback during fire cycles, and physical kick recovery.

### 2.2 Enemy Archetypes
- **Guard (Standard Security):**
  - Crisp security beret/cap with metal insignia; flashing shoulder radio transceiver (blinks yellow on investigate, solid red on combat alert); crisp one-handed Weaver shooting stance.
- **Brawler (Close Quarters Combatant):**
  - Heavily muscled build; taped forearm and knuckle wraps; aggressive forward-hunched stance; distinct pre-swing windup telegraph arc.
- **Shotgunner (Breacher):**
  - Segmented ballistic tactical vest in high-visibility safety yellow/green; diagonal shotgun shell bandolier across torso; two-handed pump grip with visible slide cycling between shots.
- **Hunter / Flanker (Recon Specialist):**
  - Lightweight hood and tactical cowl; illuminated cybernetic optical monocle; draws a faint telegraphed red laser aiming trace 0.15s prior to firing; swift low-center-of-gravity strafing run.
- **Elite (Enforcer):**
  - Full carbon-composite exo-plate armor with glowing ultraviolet visor; reactive armor spall (metallic spark bursts and cracked plate decals) upon taking damage; dual-hand braced magnum grip.

### 2.3 The Boss: The Porter (P1, P2, P3 Evolution)
- **Phase 1 (The Porter):**
  - Massive silhouette with heavy rubber apron stained with procedural blood spatters; cast-iron keyhole mask; deliberate heavy gait; two-handed magnum fire and thrown scrap debris.
- **Phase 2 (Porter // Rebuilt - NG+ Phase 2):**
  - Hydraulic piston arm bolted to left shoulder; sparks flying from mechanical joint stress; hydraulic steam hiss release on recovery; enhanced ground charge.
- **Phase 3 (Porter Protocol - NG+ Phase 3):**
  - Overclocked cybernetic core with exposed crimson glowing power conduits; cracked keyhole mask exposing internal targeting lattice; ground-sparking dash trail during charges; desperate multi-round radial spread bursts.
- **Boss Telegraphs & Feedback:**
  - Wall-impact ground fractures with shockwave distortion rings, flying rubble particles, and clear vulnerability stun animations where coolant/steam vents from his armor.

---

## 3. Weapon Systems & Realistic Gunplay (`src/combat/weapons.js`, `src/render/weapons-art.js`)

### 3.1 Overhaul of Existing Roster
- **9mm Pistol:** Slide serrations, ejection port chamfer, three-dot sight notch, flared magwell baseplate, and visible slide blowback on fire. Locks slide back when empty.
- **Suppressed Pistol:** Extended hexagonal modular suppressor with heat-dissipation grooves, raised suppressor-height sights, and subtle slide cycling.
- **Pump Shotgun:** Ribbed polymer heat shield, wood-grain walnut fore-end pump, exposed magazine tube nut, and animated fore-end pump cycling between shots with red 12-gauge hull ejection.
- **Compact SMG:** Wire-frame folding stock, curved stick magazine with witness holes, side charging handle, and rapid cyclic recoil vibration.
- **Heavy Revolver:** Fluted six-round cylinder with notch detents, external cocked hammer, vented barrel rib, and wood grip checkering.
- **Melee (Baton, Cleaver, Bottle):** Added edge glint reflections, grip tape wrapping, and glass fragmentation when thrown bottles hit walls.

### 3.2 Two New Signature Weapons
1. **Mono-Katana (`katana`):**
   - **Visuals:** Single-edged curved high-carbon blade with visible *sori* (curvature), frosted *hamon* temper line, brass *habaki* collar, and diamond-braided *tsuka-ito* hilt wrap.
   - **Stats:** `damage: 3`, `rate: 0.30`, `range: 48`, `arc: 1.35`, `knock: 160`, `color: '#e4e8ec'`.
   - **Signature Mechanic (Bullet Deflection):** Striking within 0.12s of bullet contact sparks against the hardened steel edge, deflecting the projectile back along the blade angle. Thrown katana pierces and neutralizes grunts instantly.
2. **Tactical Burst Rifle (`rifle`):**
   - **Visuals:** Modern bullpup assault carbine with integrated top optic hood, angled foregrip, and rear receiver magazine.
   - **Stats:** `damage: 1`, `rate: 0.38` (burst delay), `burstCount: 3`, `burstRate: 0.07`, `mag: 24`, `reload: 1.8`, `range: 960`, `spread: 0.02`, `pen: 1`, `color: '#4a5568'`.
   - **Signature Mechanic (Controlled Hallway Suppression):** Tight 3-round grouping with penetrating bullets capable of punching through doors and multiple targets.

### 3.3 Caliber-Specific Casings & Muzzle FX
- **Casings:** Golden brass for handguns/rifles, red ribbed plastic hulls with brass head for shotguns.
- **Muzzle Lighting:** Discharging firearms generates an instantaneous dynamic light pulse in the lighting buffer that briefly illuminates nearby walls and character models.
- **Muzzle Smoke:** Persistent wisps of lingering barrel smoke that drift and dissipate after sustained gunfire.

---

## 4. Gameplay & Combat Mechanics (`src/systems/Combat.js`, `src/entities/Enemy.js`, `src/entities/Boss.js`)

- **Tactical Enemy AI Coordination:**
  - Guards and Elites use suppressive fire down choke points to pin the player while Hunters take flanking routes.
  - Hunters project a visible red laser targeting line when aiming.
  - Realistic synthesized radio chatter barks when spotting bodies or initiating combat.
- **Door Breaching & Stun Interactions:**
  - Breaching doors violently knocks down and stuns enemies directly behind the door, disarming them for immediate execution.
- **Kinetic Hit-Stop & Camera Feedback:**
  - Micro hit-stop (2-3 simulation frames) on lethal melee cuts and heavy magnum impacts.
  - Contextual blood decals and dismemberment aligned with bullet caliber and cutting angles.

---

## 5. Level Design & Mission Graphics Overhaul (`src/world/Level.js`, `src/data/missions.js`, `src/render/`)

### 5.1 Procedural Floor & Environmental Graphics
- **Zone-Specific Procedural Flooring:**
  - *Motel / Club:* Alternating checkerboard tiles in bathrooms, herringbone parquet wood in club VIP lounges, and worn floral carpeting in motel suites.
  - *Storage / Foundry / Vault:* Industrial diamond-plate steel grating, oil stains, and safety hazard striping along machinery lanes.
  - *Exterior / Alleys:* Textured weathered asphalt with curb trim, drainage grates, and yellow parking boundary lines.
- **Wall Base Ambient Occlusion:**
  - Soft contact ambient-occlusion shadows drawn along wall bases and heavy solid furniture, grounding architectural elements.
- **Animated Fixtures:**
  - Flickering fluorescent tube lighting fixtures, pulsing arcade cabinet screens with scrolling neon scanlines (in The Arcade), and server racks with blinking LED arrays (in The Vault).

### 5.2 Interactive Tactical Props
- **Electrical Breaker Boxes:**
  - Wall-mounted electrical breakers. Destroying or shooting a breaker causes an electrical arc explosion that plunges local lights into an emergency strobe and disorients nearby hostiles for 1.2s.
- **Steam Vent Pipes & Explosive Gas Canisters:**
  - Rupturing steam pipes releases line-of-sight obscuring tactical smoke cover.
  - Explosive fuel barrels strategically placed near hostile clusters for tactical environmental chain reactions.

### 5.3 Mission Scenario Polish
- Seamless integration of new weapon pickups (Katana, Tactical Burst Rifle) across the 15 campaign missions.
- Refined cover layouts, hallway sightlines, and dual-entry breach paths across Motel Static, The Neon Room, Cold Storage, Last Train, and The Porter.

---

## 6. Verification & Testing Strategy

- **Unit Tests (`scripts/unit-test.mjs`):**
  - Validate new weapon data structures (`katana`, `rifle`), ammo capacities, recoil/bloom bounds, and clone safety.
  - Test katana bullet parry logic and burst rifle 3-round firing cycle invariants.
  - Verify mission invariants (doors, reachability, pickup validity, no overlaps) across all 15 missions.
- **Scenario Tests (`scripts/scenario-test.mjs`):**
  - Test katana equip, swing, and throw behaviors in headless Chromium.
  - Test tactical burst rifle 3-round burst firing and ammo consumption.
  - Verify boss phase transitions and enhanced telegraph mechanics.
  - Ensure zero console errors, smooth 60 FPS pacing, and flawless rendering on both WebGL and Canvas-2D fallback paths.
