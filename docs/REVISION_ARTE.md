# Revisión de la carpeta `art/` — 20-oct-2026

Qué llegó, qué ya está aplicado, qué se puede aplicar, qué falta y qué hay que cambiar. Se revisó con las hojas de contacto de `art/design_complete/review_pages`, el `audit.json`, el `catalog.json` y mediciones con Pillow (tamaños, transparencia y posición de los carriles). **No** se revisó cada fotograma uno por uno.

> **Actualización (Fase M):** 23 VFX, cosméticos y kit de interfaz empaquetados y parcialmente aplicados (biblia §23).
> **Actualización (Fase L):** 5 jefes de expansión y 6 héroes de cuerpo entero empaquetados (biblia §22).
> **Actualización (Fase K):** estructuras con estados y fondos con carriles aplicados (biblia §21); props omitidos.
> **Actualización (Fase J):** las 19 minis ya usan `design_complete` con **animaciones reales** (`tools/pack_sheets.py`, ver biblia §20). Lo que sigue pendiente de esta revisión: héroes, jefes, estructuras, props, fondos, cosméticos, VFX y kit de interfaz.

## 1. Qué hay nuevo

`art/design_complete/` es una entrega completa de **110 PNG fuente (191 MB)**, generados con Codex a partir de los prompts de `docs/PROMPTS_DISENO.md` (catálogo: 110 de 110 presentes). El propio `ENTREGA_FALTANTES_2026-10-20.md` aclara que son **fuentes visuales y maquetas, no recursos integrados**.

| Carpeta | Cant. | Qué es | Estado en el juego |
|---|---:|---|---|
| `units_current` | 19 | Hojas de las 19 minis con **5 filas**: 4 vistas (frontal, 3/4, lateral, trasera) · idle ×4 · caminar ×6 · ataque ×4 · muerte ×4 | ✗ no integradas (el juego usa otras hojas de `source_regenerated`) |
| `units_expansion` | 11 | Las 11 minis nuevas de la tabla de ideas (ballestero de asedio, escudero, grifo heraldo, lanzador de hachas, jinete de jabalí, brujo de la niebla, sepulturero, espectro de escarcha, cuervo de huesos, artillero, berserker de runas) | ✗ sin ficha de juego |
| `bosses_expansion` | 5 | Rey cangrejo, hidra de pantano, gólem de la forja, reina araña, coloso de hielo | ✗ sin jefe de juego |
| `heroes_fullbody` | 6 | Los 6 héroes de cuerpo entero con las mismas 5 filas | ✗ |
| `hero_abilities` + `vfx/*_power` | 6 + 6 | Icono y efecto de la habilidad de cada héroe | ✗ |
| `vfx` | 23 | 16 efectos genéricos (golpe, onda, curación, furia, escudo, silencio, desgarro, rayo, parpadeo, meteoro, ventisca, captura, cofre, subida de nivel, humo de muerte, moneda) + 6 poderes de héroe + brillo del cofre | ✗ |
| `structures` | 11 | Bases (humanos, ordu, no muertos), torres (humanos, ordu, no muertos, enanos), mina, punto de captura, cofre y 4 campamentos; cada uno con **4 estados** | ◐ ver §2 |
| `terrain_props` | 5 | 12 adornos por terreno (bosque, desierto, ruinas, nieve, volcán) | ✗ |
| `maps` | 5 | Fondos de batalla completos (971×1619) de los 5 terrenos | ✗ |
| `cosmetics` | 4 | Insignias de las 5 ligas, 8 emotes de héroe, 5 miniaturas de arena y 7 marcos de avatar | ✗ (hoy son CSS/emoji) |
| `ui/ui_kit` | 1 | Kit de interfaz: paneles, botones, gema, moneda, estrellas, marcos de carta por rareza, barras de color, pestañas con icono, interruptores | ✗ |
| `screens` | 15 | Maquetas a pantalla completa (inicio, campaña, briefing, HUD, mazos, talentos, modos, duelo, tienda, pase, logros, cosméticos, resultado, cofre, carga) | solo referencia |
| `corrections` | 1 | Nuevo ataque de la sanadora | pendiente de revisar |

## 2. Ya aplicado

- **Las 19 minis, los 5 jefes anteriores y los 6 héroes** salen de `source_regenerated` (empaquetados en `art/units` y `art/leaders`).
- **Estructuras especiales** (`art/structures`, con otro proceso en `render.js` y `tools/build_art.py`): torre neutral (4 estados), carreta de escolta (4 estados) y base de enanos (4 estados). El resto de `design_complete/structures` **no** se ha empaquetado.
- Fondos, props y VFX **antiguos** siguen en uso (`art/map`, `props.webp`, `vfx.webp`).

## 3. Qué se puede aplicar (por valor y esfuerzo)

| # | Qué | Por qué encaja | Esfuerzo |
|---|---|---|---|
| 1 | **Estructuras con 4 estados** | Cubren justo lo que el motor ya distingue: base y torre (entera, dañada, destruida, capturada por ti); **mina** (libre, bloqueada, trabajando, **agotada** = nuestra mina con reserva); **punto de captura** (neutral, enemigo, tuyo, disputado); **cofre** (cerrado, bloqueado, abriendo, abierto); campamentos (limo, huesos, gnolls y piedra rúnica = puesto de despliegue) | S-M |
| 2 | **Insignias de liga (5)** | Tenemos exactamente 5 ligas (Bronce a Diamante) | S |
| 3 | **Miniaturas de arena (5)** | Tenemos 5 arenas cosméticas hoy solo con emoji | S |
| 4 | **Marcos de avatar (7)** y **emotes (8)** | Hoy son CSS y 4 globos de texto; los 8 emotes sustituyen y amplían las señales | S-M |
| 5 | **Habilidades de héroe (6 + 6)** | Iconos y efectos listos para el botón del héroe y el lanzamiento | S |
| 6 | **VFX genéricos (16)** | Casan con eventos que ya existen: silencio, desgarro, rayo, meteoro, ventisca, escudo, furia, curación, captura, subida de nivel, monedas | M |
| 7 | **Props de terreno (5×12)** | Sustituyen los adornos actuales por un estilo más coherente | S |
| 8 | **Fondos de batalla (5)** | Mismo formato (≈0,6 de relación) que el lienzo 480×800; ver el ajuste de carriles en §5 | M |
| 9 | **Kit de interfaz** | Marcos por rareza (4 colores), barras, estrellas, gema (= cores) y moneda, pestañas con icono (casa, gente = Guild, torre, pergamino, espadas, bolsa) y notificación | M |
| 10 | **Héroes de cuerpo entero (6)** | Para la tarjeta grande del héroe en Ejército y el duelo (hoy solo hay retratos) | S |
| 11 | **11 minis nuevas** | Hay ideas de juego y arte: faltan fichas (coste, vida, daño, habilidad, tipo de daño) y tests | M por tanda de 3-4 |
| 12 | **5 jefes nuevos** | Falta definir 2 habilidades por jefe y su fase 3 | M |
| 13 ✅ | **Animaciones reales de las minis** | Las hojas traen idle ×4, caminar ×6, ataque ×4 y muerte ×4; hoy el juego usa una sola pose por estado | L (ver §5.3) |

## 4. Qué falta

Recursos que el juego ya necesita por las últimas fases y **no** están en la entrega:

- **Nido enemigo, fuente de curación, interruptores (4 tipos), matorral** (hoy son dibujos por código con emoji).
- **Iconos de energía, cores y oro** como arte propio (hoy 🔋, 💠 y una moneda CSS). El kit trae una gema azul y una moneda, que podrían servir.
- **Marcos de rango** (4 niveles: Recluta, Veterano, Élite, Leyenda) y su estrella.
- **Insignias del Camino de calaveras** (10 niveles) y del nivel de colección.
- **Iconos de las 14 habilidades de minis** y de los 5 tipos de objetivo.
- **Pose de "golpeado"**: las hojas no traen una fila de "hit" (hoy se resuelve con un destello).
- **Icono de Guild bloqueado y de PvP** (el kit trae "gente", falta el candado).
- Para la lista de `PROMPTS_DISENO.md` no falta nada más: unidades, estructuras, héroes, jefes, VFX, cosméticos, kit y las 15 pantallas están presentes.

## 5. Qué hay que cambiar o corregir

1. **Estilo inconsistente entre lo integrado y lo nuevo.** Las minis que usa el juego (`source_regenerated`) tienen proporciones más realistas; las de `units_current`, las estructuras y los héroes nuevos siguen el estilo "juguete" de `ART_DIRECTION.md` (cabeza y manos grandes). Mezclarlos se verá raro (p. ej. el guerrero actual frente a las torres nuevas). Recomendación: **adoptar `design_complete` como línea única** y reemplazar las 19 minis.
2. **Siete hojas con corrección pendiente** (marcadas `needs_correction` en el audit): enano minero, guerrero, arquera, grifo, mago y paladín por alineación o separación de cuadros, y la **sanadora** porque su ataque 3 no tiene personaje y hay poses solapadas. Existe `corrections/human_medic_attack.png` como nuevo intento, aún sin revisar. Las otras 12 minis y todo lo demás están "pendientes de revisión visual".
3. **(Resuelto en la Fase J con `pack_sheets.py`.)** El empaquetador antiguo no servía para estas hojas. `pack_regenerated_unit` asume 5 bandas = idle/caminar/ataque/golpeado/muerte, pero la fila 1 de las hojas nuevas son **4 vistas**, no idle. Con ellas se mostraría una vista frontal como "idle", el idle como "caminar", etc. Hace falta un empaquetador nuevo (5 filas: vistas, idle, caminar, ataque, muerte) que segmente cada fila por huecos y alinee los pies. No debe asumirse una cuadrícula uniforme (lo advierte la propia entrega).
4. **Carriles de los mapas.** Medidos en los fondos: bosque 28 % y 73 %, desierto 27 % y 76 %, ruinas 27 % y 71 %, nieve 28 % y 72 % (el volcán no se detecta por el color oscuro del camino). El juego usa **25 % y 75 %**: las tropas quedan dentro del camino pero algo desplazadas. Hay que ajustar los carriles del motor (x ≈ 137 y 347 de 480) o recolocar los fondos, y revisar a ojo el volcán.
5. **Las maquetas de pantalla no son recursos.** Contienen textos de ejemplo y, sobre todo, elementos que **no son de KOTA**: en `deck_builder` y `battle_hud` hay una gota morada de "elixir", personajes con aspecto de otros juegos, pestañas "Clan", un héroe llamado "Arthur" y una arena con río y puentes de **tres** carriles. Úsalas solo como referencia de distribución y revisa que nada se parezca demasiado a otro juego. Además difieren de lo ya hecho: otro orden de navegación, la campaña muestra 5 zonas (tenemos 10) y faltan energía y cores.
6. **Tamaños irregulares:** `base_undead` y `tower_dwarf` son 1402×1122, `avatar_frames`, `coin_pickup`, `death_smoke` y `level_up` son 1774×887. Conviene normalizarlos al empaquetar.
7. **Peso.** 191 MB de PNG de 1254² no deben ir al juego ni a la caché del service worker: solo los WebP ya empaquetados. `server/server.js` servía toda la carpeta `art`, fuentes incluidas: **ya no sirve** `design_complete`, `source_generated` ni `source_regenerated` (con prueba).
8. **Los 5 jefes nuevos y las 11 minis** usan identificadores propios (`human_siege_crossbow`, `boss_crab_king`…) que no existen en el roster: hay que decidir nombres en español y fichas antes de empaquetar.

## 6. Orden recomendado

1. Decidir el estilo único (§5.1) y revisar las 7 hojas corregibles.
2. Empaquetador nuevo de hojas y **animaciones reales** de las 19 minis (§3.13, §5.3).
3. Estructuras con estados + props + fondos con carriles ajustados (§3.1, 3.7, 3.8, §5.4).
4. Cosméticos (ligas, arenas, marcos, emotes) y habilidades de héroe.
5. Kit de interfaz → piel de la UI (cabecera, navegación, marcos de rango).
6. Minis y jefes nuevos, por tandas con sus fichas y tests.
7. Encargo de los recursos que faltan (§4).
