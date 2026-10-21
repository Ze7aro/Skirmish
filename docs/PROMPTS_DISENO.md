# KOTA — Prompts de diseño (unidades, edificaciones, héroes y vistas)

Archivo de prompts para generar el arte que falta del juego y rediseñar sus pantallas. Los prompts van **en inglés** (los generadores de imagen responden mejor) y los títulos y notas en español.

## 0. De dónde sale y qué NO contiene

- **Estructura inspirada en el análisis de Warcraft Rumble con REA** (ver `BRECHA_RUMBLE.md`). REA no pudo desensamblar el juego en este equipo, pero sí leyó los nombres de tipos del cliente. De ahí sale **solo la organización**: qué pantallas tiene un juego de este género (ejército/colección, mapa del mundo, tienda, eventos, misiones, gremio, recompensas por páginas, selector de emotes, carga y aviso), qué tipos de edificio y de punto de interés hay (bases, torres, torres neutrales, campamentos, minas, puntos de captura) y qué categorías de unidad existen.
- **No se ha copiado** ningún nombre, personaje, texto, logotipo, arte ni dato. Los prompts describen contenido **original de KOTA** con la dirección de `assets/ART_DIRECTION.md`.
- **Regla al generar:** no escribas nombres de otros juegos, de personajes ni de marcas en los prompts, y no subas capturas de otros juegos como imagen de referencia. Revisa cada resultado: si se parece demasiado a un diseño conocido, descártalo.

## 1. Bloques reutilizables (pégalos en todos los prompts)

**ESTILO (STYLE):**
> Hero Stylized Fantasy, highly readable mobile game art, 2.5D, high-quality concept art. Large head, large hands, oversized weapon, rounded shapes, clean silhouette recognisable even when filled with solid black, bright saturated colors, soft shadows, simple armor, very expressive face, minimal small details, readable at 40 px. Cartoon-heroic fantasy RTS, consistent visual language across all factions. No realistic rendering, no gritty textures, no dark horror style.

**FACCIONES (FACTION):**
- Humans: royal blue `#2F5FD0`, gold `#E0B040`, white `#F4F1E8`. Noble, clean plate and cloth, heraldic banners.
- Ordu: dark red `#8A2A2A`, black `#1A1414`, orc-green skin `#7A8A2A`, brown leather and bone trim. Brutish, spiked, tribal banners.
- Undead: dark purple `#5A2E8A`, spectral green `#7CFFB0`, bone `#E8DCB8`, ice blue accents. Skeletal, glowing eyes, tattered cloth.
- Dwarves: copper `#B8862A`, orange beard, soot grey, lantern yellow. Stout, mining tools, sturdy.

**FORMATO DE HOJA (SHEET):**
> Orthographic character sheet on a transparent background: front, 3/4, side and back views, plus movement animation strip (idle 4 frames, walk 6 frames, attack 4 frames, death 4 frames). Even spacing, same scale in every frame, feet on the same baseline, no cropping, no text, no watermark.

**NEGATIVO (NEGATIVE):**
> photorealistic, gritty, dark horror, text, logo, watermark, signature, trademark characters, copyrighted designs, extra limbs, cropped, blurry, low contrast, cluttered details, thin outlines that vanish at small size.

**Entrega:** PNG con fondo transparente; sprites con los pies sobre la misma línea base; luego `tools/build_art.py` los empaqueta (atlas `webp`). Tamaño de trabajo recomendado: 512 px de alto por pose (se reduce al empaquetar).

---

## 2. Unidades (minis)

### 2.1 Plantilla para cualquier unidad nueva
```
[STYLE]. [SHEET]. Unit: <name>, a <role> of the <faction> faction. <one big signature feature, e.g. "enormous shield taller than the body">.
Palette: <FACTION>. Pose: <idle stance>. Expression: <emotion>. Weapon: <oversized weapon>.
Must read as a unique silhouette at 40 px. Team-colour accent on banner or cloth. Negative: [NEGATIVE].
```

### 2.2 Las 4 minis que faltan (hoy desactivadas)

**Paladín** — `human_paladin` · Humanos · coste 5 · luchador/apoyo
```
[STYLE]. [SHEET]. Unit: a heavy Paladin, human holy knight. Enormous round golden shield with a sun emblem taller than half his body, oversized warhammer glowing softly, big shoulder pauldrons, white cape with blue trim, short beard, determined confident face. Palette: Humans (royal blue, gold, white). Slow, solid stance, shield forward. Reads as a wall of gold-and-blue at 40 px.
```
**Chamán** — `ordu_shaman` · Ordu · coste 3 · apoyo a distancia (da furia)
```
[STYLE]. [SHEET]. Unit: an orc Shaman, tribal support caster. Oversized gnarled staff topped with a glowing red totem skull and feathers, huge bone-and-feather shoulder mantle, green skin, tusks, wild grin, floating small drum or rune stones around him, red war-paint. Palette: Ordu (dark red, black, orc green). Casting pose with one big hand raised to cast a red haste aura. Reads by the huge totem staff.
```
**Abominación** — `undead_abomination` · No muertos · coste 5 · tanque de área
```
[STYLE]. [SHEET]. Unit: an Abomination, a huge stitched-together undead brute. Massive bloated body with stitches and iron hooks, one gigantic cleaver arm and one tiny arm, small head with a goofy fierce face, glowing green gut, dripping toxic ooze, chains. Palette: Undead (purple, spectral green, bone). Heavy lumbering walk, ground-slam attack with green shockwave. Reads as a big round purple-green mass with one giant cleaver.
```
**Gárgola** — `undead_gargoyle` · No muertos · coste 2 · volador rápido
```
[STYLE]. [SHEET]. Unit: a stone Gargoyle, fast flying undead skirmisher. Grey-violet stone body, enormous bat-like wings wider than the body, big pointed ears, glowing green eyes, small claws, cheeky grin, cracks with green glow. Palette: Undead. Flying pose with wings spread, diving attack frames. Must read as a wide winged silhouette. Include a ground shadow reference below.
```

### 2.3 Enano minero (`dwarf_miner`) — hoy se dibuja por código
```
[STYLE]. [SHEET]. Unit: a Dwarf Miner, tiny worker. Big orange beard, round yellow helmet with a lantern, oversized pickaxe, leather apron, sooty face, big smile. Palette: Dwarves. Actions: walk, mine (swing pickaxe, sparks), carry a gold nugget, panic run. Reads as the cheapest, friendliest unit on the board.
```

### 2.4 Ideas de minis nuevas (para crecer de 19 a ~30)
Cada una con su hueco de juego; usa la plantilla 2.1. Todas son originales.

| Facción | Mini | Hueco de juego | Rasgo de silueta |
|---|---|---|---|
| Humanos | Ballestero de asedio | Daño a distancia lento, rompe torres | Ballesta gigante sobre un trípode |
| Humanos | Escudero | Barato, provoca (taunt) | Escudo torre con cara pintada |
| Humanos | Grifo heraldo | Volador de apoyo (inmunidad corta) | Estandarte atado a las alas |
| Ordu | Lanzador de hachas | Distancia media, área pequeña | Hachas giratorias enormes |
| Ordu | Jinete de jabalí | Carga rápida | Jabalí con colmillos de hierro |
| Ordu | Brujo de la niebla | Ralentiza zona | Caldero humeante a la espalda |
| No muertos | Sepulturero | Resucita esqueletos | Pala gigante y farol |
| No muertos | Espectro de escarcha | Ralentiza, vuela | Capa de hielo fragmentada |
| No muertos | Cuervo de huesos | Barato, vuela, vigía | Cuervo esquelético con ojos verdes |
| Enanos | Artillero | Distancia, daño de área | Cañón de barril más grande que él |
| Enanos | Berserker de runas | Furia al estar herido | Barba en llamas, martillos duales |

---

## 3. Edificaciones y puntos de interés

Todas con vista 2.5D desde arriba-frontal (cámara fija vertical), base ovalada, sombra suave, bandera de la facción. Tamaño de trabajo 512 px de ancho.

### 3.1 Bases (una por facción)
```
[STYLE]. Game asset, transparent background, 2.5D top-front view. A <faction> main base fortress: <Humans: stone castle with royal-blue roofs, gold trim, big gate, banners | Ordu: wooden-and-iron spiked fortress with red banners and skull totems | Undead: crooked crypt-castle in purple stone with green flames and bone arches | Dwarves: stone keep with copper chimneys and mine entrance>. Chunky rounded shapes, huge readable gate, oversized banner, soft shadow on an oval footprint. States: intact, damaged (cracks, fire), destroyed (rubble). Palette: <FACTION>.
```
### 3.2 Torres de carril (una por facción + 3 estados)
```
[STYLE]. Game asset, transparent background. A <faction> defence tower, squat and chunky, oversized weapon ports, top platform with a big banner in faction colours, visible health-friendly silhouette at 30 px. States: intact, damaged, destroyed. Also a "captured" version recoloured to the player's blue.
```
### 3.3 Torre neutral (capturable)
```
[STYLE]. Game asset. A grey neutral watchtower covered in moss and vines, no faction colours, empty flagpole on top, glowing white-gold ring on the ground showing it can be claimed. Variants: dormant (grey), being captured (gold sparks), captured (player blue banner).
```
### 3.4 Mina de oro
```
[STYLE]. Game asset. A cave-mine entrance in a rock mound with wooden supports, a cart on rails, piles of glowing gold nuggets and a lantern. Variants: free (warm yellow glow), locked (iron grate and padlock icon), occupied (dwarf silhouette inside, floating "+1" coin particles), depleted (dark).
```
### 3.5 Punto de captura
```
[STYLE]. Game asset. A round stone plinth with a big flagpole. Variants: neutral (white flag), enemy (red/purple flag), player (blue flag), contested (flag flickering). Include a circular progress-ring VFX overlay in gold with 8-segment ticks.
```
### 3.6 Cofre del mapa
```
[STYLE]. Game asset. A chunky wooden treasure chest with gold bands and a big lock. Variants: closed, locked (chains + padlock, grey), opening (lid up, golden light beam, coins), opened (empty, dim). Add a gold sparkle idle animation.
```
### 3.7 Carreta de escolta
```
[STYLE]. Game asset. A sturdy two-wheel supply cart pulled by a small ox, canvas cover with a blue banner, crates and barrels, damage states (intact, dented, smoking, wheel broken). Readable at 40 px. Team colour: player blue.
```
### 3.8 Campamentos neutrales y puestos de despliegue
```
[STYLE]. Game asset set. Neutral camps: a ring of tents with a small fire and a totem, grey-brown palette with a coloured trim by creature type (green slime, bone, gnoll fur). Plus "outpost" zone marker: a glowing blue rune circle on the ground used to extend the deployment area.
```
### 3.9 Props de terreno (5 terrenos)
```
[STYLE]. Environment prop sheet, transparent background, <terrain>: forest (round trees, bushes, logs, mossy rocks) | desert (cacti, sandstone rocks, bones, dead trees) | ruins (broken pillars, statues, rubble, torches) | snow (pine trees with snow, ice rocks, frozen pond) | volcanic (obsidian rocks, lava cracks, charred trees, geysers). 12 pieces, chunky and readable, soft shadows.
```
```
[STYLE]. Seamless top-down painted battlefield background, 480x800 portrait, <terrain>. Two clear straight dirt lanes with grassy dividers, a central pond/feature between them, a wide deployment zone at the bottom and a castle area at the top. High contrast between lanes and decoration.
```

---

## 4. Héroes (líderes)

### 4.1 Los 2 héroes sin retrato
**Líder Ordu #2 — `ordu_leader2`** (hoy "Por definir"; sugerido: Chamán de guerra)
```
[STYLE]. Hero portrait, bust 3/4 view on a transparent background, 2:3 ratio, plus a full-body sheet [SHEET]. An Ordu Warlord of the storm: huge orc with a lightning-etched warhammer, braided black hair, red war-paint, fur shoulder mantle with spikes, fierce proud grin. Palette: Ordu. Ability visual: a ring of red lightning bolts striking around him.
```
**Líder No Muertos #2 — `undead_leader2`** (hoy "Por definir"; sugerido: Reina espectral)
```
[STYLE]. Hero portrait, bust 3/4 view, transparent background, 2:3 ratio, plus full-body sheet [SHEET]. An Undead Banshee Queen: floating spectral queen in torn purple robes, tall bone crown, long ghostly hair, glowing green eyes, elegant sad smile, chains of spirits orbiting her. Palette: Undead. Ability visual: green wailing ripple that expands outward.
```
### 4.2 Plantilla de héroe nuevo
```
[STYLE]. Hero portrait, bust 3/4 view, expressive face, signature object visible (<banner | sword | staff | tome>), faction colours, heroic confident lighting. Also: full-body sheet [SHEET], an ability icon 128x128 (round, glowing, one big shape) and the ability VFX described in section 6.
```
### 4.3 Jefes nuevos (ideas)
Gran jefe a escala 2× una mini, con 2 habilidades legibles: **Rey Cangrejo** (carapaza de piedra, pinzas que aplastan, onda de choque), **Hidra de pantano** (3 cabezas, una por carril, veneno ralentizador), **Gólem de la forja** (enano corrompido con yunque, lanza chispas), **Reina araña** (invoca crías, telaraña que inmoviliza), **Coloso de hielo** (congela una zona, empuja unidades).
```
[STYLE]. Boss sheet [SHEET]. A <boss> twice the size of a regular unit, big readable weak-spot or glowing core, two clearly different attack poses (telegraphed wind-up frames), death animation. Palette: pick one faction palette plus one unique accent colour.
```

---

## 5. Vistas principales (interfaz)

**Formato común:** pantalla vertical **375×812** (móvil), margen lateral de 16 px, botones ≥ 48 px, tipografía gruesa y legible. Paneles de piedra/metal oscuro cálido, biselados, con filete dorado y esquinas redondeadas. Acento dorado `#E0B040`, fondo `#12151C`. Todo original (no copiar kits de terceros).

**KIT DE INTERFAZ (UI KIT):**
```
Mobile game UI kit, Hero Stylized Fantasy, chunky beveled dark-stone panels with gold trim and rounded corners, large tactile buttons (primary gold, secondary stone, danger red), round energy gem, coin icon, star icons (filled/empty), rarity card frames (common grey, uncommon green, rare blue, epic purple), progress bars, tab buttons, toggle switches, notification dot, toast bubble. Transparent background, flat sheet layout, consistent lighting from top-left, no text.
```

### 5.1 Hub principal
```
Mobile game home screen mockup, 375x812 portrait. Top bar: round avatar with decorative frame, level and XP bar, coin counter, settings gear. Center: the equipped hero standing large on a glowing faction-colour stage with a name plate and title below. Under it a row of 7 small card icons (the deck). A huge gold PLAY button with a mission subtitle. Row of three tiles (Campaign, Modes, Missions). Bottom navigation with 6 icons: Home, Campaign, Modes, Decks, Missions, Shop. Warm dark stone UI, gold accents. [UI KIT style]
```
### 5.2 Mapa de campaña
```
Mobile campaign map mockup, 375x812. A vertical scroll of 10 zone panels, each with its own terrain banner (forest, desert, ruins, snow, volcanic) and two mission nodes with goal icons (castle, shield, flag, target, cart) and 3 stars; locked missions greyed with a padlock; boss missions have a skull tag. Winding path linking nodes. [UI KIT]
```
### 5.3 Briefing de misión (ventana)
```
Mobile modal mockup, 375x812. Title with mission number, goal icon + short rule text, 3 objective rows with empty/filled stars, a wrap of 5 mutator chips (icon + name + bonus %), the player's deck row, and two buttons: "A luchar" (gold) and "Cerrar". [UI KIT]
```
### 5.4 Batalla (HUD)
```
Mobile battle HUD mockup over a vertical lane battlefield, 375x812. Top: pause, big timer, miner counter with pickaxe, speed x1/x2, close. Center: battlefield with two lanes, towers, bases with health bars, deployment zone highlighted in the lower third. Floating pill showing the objective progress. Bottom tray: energy bar with lightning icon and number 0-10, a "next card" preview, a hero ability button, and four large card buttons showing portrait, cost gem and name; the miner card has a gold border. [UI KIT]
```
### 5.5 Mazos y héroes
```
Mobile deck builder mockup, 375x812. Top: 3 saved-deck slots, hero selector grid with portraits. Middle: counter "Deck 6/6 + miner". Below: scrollable collection grid of cards with rarity frames, level pips, an upgrade button with coin price and a talents button with a notification dot. Dwarf miner card pinned and marked "universal". [UI KIT]
```
### 5.6 Ficha de carta / talentos
```
Mobile modal mockup, 375x812. Large unit portrait on a faction-colour background, stats row (cost, health, damage, speed), ability line with icon and cooldown, 3 talent slots unlocked by level (each with two choice buttons, one selected glowing gold), level bar and upgrade button. [UI KIT]
```
### 5.7 Modos de juego
```
Mobile modes screen mockup, 375x812. Stack of 5 cards: Duel (league badge, trophies bar, 3 rival buttons), Weekly Event (countdown, 3 difficulty buttons), Daily Challenge (mutator pills, streak), Survival (best wave), Dungeon run (8 stage dots, hearts, relics). Each card has its own terrain-themed top border. [UI KIT]
```
### 5.8 Duelo / pantalla de rival
```
Mobile duel lobby mockup, 375x812. League emblem (bronze, silver, gold, platinum, diamond) with trophy count and progress to the next league. Three opponent cards with rival name, deck archetype icon, level and trophy reward / risk. A "real player" ghost button. Match intro: split screen with player hero vs rival hero portraits and a "VS" emblem. [UI KIT]
```
### 5.9 Tienda
```
Mobile shop mockup, 375x812. Tabs: Shop, Pass, Achievements, Style, Online. Daily offers list: chest, two discounted card upgrades, one unlockable unit, each row with icon, text and a coin price button; a refresh countdown at top. [UI KIT]
```
### 5.10 Pase de temporada
```
Mobile season pass mockup, 375x812. Header with season name and countdown, level progress bar 0-30, vertical list of 30 reward rows with a numbered medallion, coin/chest rewards, claim buttons, special rows at levels 10/20/30 highlighted with big cosmetic previews (frame, arena). Below: event calendar for the next 4 weeks. [UI KIT]
```
### 5.11 Logros y misiones diarias
```
Mobile achievements mockup, 375x812. Header "Achievements 12/42". List rows with a family icon, name with roman numeral tier (I, II, III), description, progress bar, reward chips and a claim button; claimable rows glow gold. Daily quests section with 3 rows and chests counter. [UI KIT]
```
### 5.12 Resultado de batalla / cofre
```
Mobile result modal mockup, 375x812. Big VICTORY banner with three stars awarded one by one, objective checklist, rewards row (coins, XP, chest), level-up burst, trophies delta and league promotion banner for duels, buttons Next / Retry / Home. Second frame: chest-opening scene with a shaking chest, light beam and coins flying. [UI KIT]
```
### 5.13 Estilo / cosméticos
```
Mobile cosmetics mockup, 375x812. Three sections: avatar frames, titles, duel arenas; each as a 3-column grid of tiles with a round preview, name and a small state line (equipped / owned / locked with unlock hint). [UI KIT]
```
### 5.14 Carga, aviso y pantalla de inicio
```
Mobile splash and loading screens, 375x812. KOTA logo with a crown and crossed swords on a dark gradient with floating embers, progress bar in gold, a tip line at the bottom. Notice modal for connection errors with an icon and a single button.
```

---

## 6. Efectos visuales (VFX)

Spritesheet 8×1 o 4×2, fondo transparente, 256×256 por cuadro, colores brillantes y formas simples.
```
[STYLE]. VFX spritesheet, transparent background, <effect>: hit spark | ground slam shockwave | healing cross | haste red aura | shield dome (gold) | silence (purple rune ring) | armor-tear (cracked shield) | lightning chain | blink flash | meteor warning circle and impact | blizzard snow gust | capture-point gold ring fill | chest opening light beam | level-up burst | unit death smoke | coin pickup "+1".
Bold shapes, 6-8 frames, no text.
```

## 7. Cosméticos (arte opcional)

- **Marcos de avatar** (hoy CSS): círculo 96×96 con 7 variantes — Bosque (hojas), Calavera (huesos violetas), Oro viejo (medalla), Dorado (brillos), Escarcha (cristales), Fuego (llamas), Mítico (arcoíris con gemas).
```
[STYLE]. Circular avatar frame 96x96, transparent centre, <theme> decoration around the ring, chunky, readable at 48 px.
```
- **Arenas de duelo**: 5 miniaturas 160×100 de los terrenos (bosque, desierto, ruinas, nieve, volcán) vistas desde arriba con los carriles marcados.
- **Insignias de liga**: Bronce, Plata, Oro, Platino, Diamante, 128×128, escudo con alas y gema creciente.
- **Emotes** (futuro): 8 caritas de héroe (saludo, risa, enfado, llanto, GG, ¡cuidado!, gracias, wow) en burbuja 128×128.

## 8. Lista de comprobación antes de aceptar un arte

1. ¿Se reconoce la silueta en negro a 40 px?
2. ¿Usa la paleta de su facción y deja ver el color de equipo?
3. ¿Mismo tamaño y línea base en todos los fotogramas?
4. ¿Fondo transparente, sin texto ni marca de agua?
5. ¿No recuerda a un personaje o diseño de otro juego?
6. ¿Pasó por `tools/build_art.py` y se ve bien en el móvil (375×812)?
