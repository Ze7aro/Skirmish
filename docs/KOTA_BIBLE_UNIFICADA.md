# KOTA — Biblia unificada (propuesta v1.1)

Estado: **propuesta para aprobar**. No reemplaza ningún archivo de `assets/`; reúne `KOTA_BIBLE.md`,
`ART_DIRECTION.md`, las fichas de unidades y lo que realmente existe en los assets.
Los datos de este documento viven en `data/kota_roster.json` (fuente única para el juego).

---

## 1. Decisiones para unificar

| Tema | Biblia vieja | Arte real / dirección artística | Decisión propuesta |
|---|---|---|---|
| Estilo | "Pixel Art 3/4" | HD estilizado, contornos limpios. `ART_DIRECTION.md`: "no pixel art clásico" | **Hero Stylized Fantasy, 2D HD con mapa 2.5D.** La dirección artística manda. |
| Resolución | (pendiente) | Sprites 256–336 px, pensados para verse a 70–100 px | **Pantalla de referencia 1080×2340 vertical.** Unidad en juego: 70–100 px de alto. |
| Minis | 18 | 14 con sprites | **18 en total: 14 listas + 4 por ilustrar** (ver §4). |
| Líderes | 6 | 4 con arte | **6 en total: 4 listos + 2 por ilustrar** (ver §5). |
| Facciones | 3 | 3 | Sin cambios: Humanos, Ordu, No Muertos. |
| Mapa inicial | 2 carriles | Kit de caminos, puentes, agua, 5 terrenos | Sin cambios. **5 terrenos = 5 zonas** (§6). |
| Modo inicial | PvE | 5 jefes con habilidades y VFX | Sin cambios. **PvE por zonas con jefe final.** |
| Duración | 3 min | — | Se mantiene. El prototipo aún no tiene temporizador. |
| Sistema | Cartas + Energía | Mina de oro, cofre, piedra de captura | **Energía = recurso de despliegue. Oro/monedas = progreso** (§7). |
| Motor | Godot | Los assets tienen `.import` de Godot | El prototipo web es el laboratorio; **datos en JSON neutral** para portar a Godot. |

## 2. Identidad visual ("Hero Stylized Fantasy")

Principios (de `ART_DIRECTION.md`, resumidos y ordenados por prioridad):

1. **Silueta primero.** Cada unidad se reconoce en negro. Una seña grande por unidad: lanza enorme, arco grande, alas enormes, báculo gigante, bomba enorme.
2. **Proporciones exageradas.** Cabeza, manos, armas y hombreras grandes; poco detalle.
3. **Color por facción, siempre.** Banderas, bases, torres y anillo de equipo siguen la paleta.
4. **Animaciones cortas y claras.** Pocos fotogramas, acciones legibles sin efectos.
5. **Sombras suaves, nunca iluminación oscura.**

### Paletas

| Facción | Principal | Secundario | Acento |
|---|---|---|---|
| Humanos | Azul real `#2F5FD0` | Dorado `#E0B040` | Blanco `#F4F1E8` |
| Ordu | Rojo oscuro `#8A2A2A` | Negro `#1A1414` | Verde orco `#7A8A2A` (piel) |
| No Muertos | Morado oscuro `#5A2E8A` | Verde espectral `#7CFFB0` | Hueso `#E8DCB8` |

### Mapa 2.5D (lo que da la sensación de profundidad)

- Fondo pintado con las piezas del kit; unidades ordenadas por posición vertical; **sombra elíptica bajo cada unidad**; voladores elevados con su sombra en el suelo.
- Torres y bases con la bandera de su facción; mina de oro y piedra de captura como puntos de interés visibles.
- Cámara fija vertical, carriles legibles, zona de despliegue resaltada.

### Interfaz (propia, sin copiar kits de terceros)

Las capturas "WARFORGE" quedan como **referencia de ánimo, no como asset**. Dirección propuesta:

- Paneles **macizos y biselados** (piedra/metal oscuro cálido) con filete dorado y esquinas redondeadas.
- Botones **grandes y táctiles** (≥ 48 px), con color de facción para la acción principal.
- Cartas con **retrato de la unidad grande**, coste en una gema y marco por rareza.
- Tipografía gruesa y legible; números de daño y oro grandes.
- Todo se dibuja con CSS/SVG propios usando la paleta de arriba.

## 3. Reglas de juego unificadas

- 2 carriles, avance automático, despliegue en tu zona; la zona crece al capturar campamentos.
- Campamentos neutrales con mina de oro; torres por carril; base final.
- Héroe con una habilidad activa y enfriamiento.
- Cartas con **Energía** (máx. 10); rarezas: Común, Poco común, Raro, Épico, Legendario.
- Escala de las fichas a motor: **1 casilla = 16 px de alcance, 14 px/s de velocidad**; melee = 10 px.
  Vida y daño se usan tal cual en las fichas. Edificios ×1,7 respecto al prototipo actual.

## 4. Minis (18)

| Facción | Lista (arte ✓) | Por ilustrar |
|---|---|---|
| Humanos | Guerrero, Arquera, Mago, Sacerdote, Grifo | **Paladín** |
| Ordu | Grunt, Bombardero, Jinete de lobo, Bestia de asedio, Wyvern | **Chamán** |
| No Muertos | Esqueletos, Lich, Espectro, Dragón esquelético | **Abominación**, **Gárgola** |

Los 4 pendientes salen de tu `lista_unidades_a_diseñar.md`. Hasta que haya arte, usan un marcador (silueta con color de facción).
Las fichas con valores del documento están marcadas `doc`; las que no tenían ficha están marcadas `propuesto` y hay que revisarlas.
Aviso de balance: el Grifo cuesta 2 con 80 de vida y 26 de daño volando; probablemente deba costar 3.

## 5. Héroes (6)

| Facción | Héroe | Arte | Habilidad propuesta |
|---|---|---|---|
| Humanos | Comandante | ✓ idle | Grito de guerra: aliados +50% velocidad y ataque |
| Humanos | Maestra de hojas | ✓ sprites sueltos | Tormenta de cuchillas: daño en área |
| Ordu | Jefe de guerra | ✓ idle | Llamada de sangre: aliados ganan furia |
| Ordu | *(por ilustrar)* | — | Tótem sanador |
| No Muertos | Señor de la cripta | ✓ idle | Ejército de huesos: invoca esqueletos |
| No Muertos | *(por ilustrar)* | — | Niebla de maldición: ralentiza y daña |

Nota: `boss_senor_cripta` y el héroe `undead_crypt_lord` comparten nombre. Propuesta: el héroe se llama **Señor de la cripta** y el jefe **Rey de la cripta** (o el nombre que prefieras).

## 6. Zonas, jefes y VFX (5 zonas × 2 misiones)

El jefe va en la segunda misión de cada zona. Todos los VFX de `KOTA_VFX/boss_abilities` quedan asignados una vez:

| Zona | Terreno | Jefe | Habilidades (VFX) |
|---|---|---|---|
| 1 | Bosque | Raíz antigua | `roots`, `overgrowth`, `thorn_burst` |
| 2 | Desierto | Capitán saqueador | `charge`, `mine_rage`, `summoning` |
| 3 | Ruinas | Guardián de piedra | `quake`, `fragile_towers` |
| 4 | Nieve | Nigromante del túmulo | `army_of_dead`, `resurrection` |
| 5 | Volcánico | Señor de la cripta (jefe) | `mass_curse`, `soul_drain` |

Efectos de estado ya disponibles: `heal`, `slow`, `stun`, `poison`, `stealth`; de mapa: `gold_mine`, `chest_open`, `tower_capture`, `base_hit`, `tower_damaged`, `overtime` (sirve para el tiempo extra de los 3 minutos).

## 7. Economía (v1.2)

- **Energía:** máx. 10. El pasivo es bajo (**0,4/s**); lo que realmente la sube son las minas.
- **Minas de oro:** 2 libres junto a tu base (una por carril) + 1 por cada campamento (bloqueada hasta despejarlo).
  Una mina solo rinde **0,35/s mientras su Enano minero esté vivo y trabajando** (máx. 1 minero por mina).
  Si el enano muere, la mina deja de rendir.
- **Enano minero (carta universal):** **se añade solo a todos los mazos**: no se elige en el constructor y no ocupa ninguno de los 6 lugares,
  pero **rota con el resto** (mazo de 6 + enano = 7 cartas en rotación). **Cuesta 1.**
  Va solo a la mina libre más cercana. Si lo atacan se defiende, salvo mientras recolecta en una mina con oro; si la mina se agota, busca otra y, si no hay, avanza hasta otra mina o una edificación enemiga (ver §25).
  Facción de apoyo "Enanos". **No hay arte todavía**: se dibuja por código como marcador.
- **Mano rotatoria:** las 7 cartas se barajan; **4 en mano** y 3 en cola. Al jugar una, va al final de la cola y entra la siguiente
  (se ve cuál viene en "Sig."). El enano aparece con borde dorado cuando le toca en la mano.
- **Monedas:** se ganan al ganar (más con más estrellas); suben nivel de carta.
- **Cofres:** premio por objetivos (`chest` y `chest_open` ya existen).

## 8. Lo que falta por decidir o producir

0. **Arte del Enano minero** (ahora es un marcador dibujado por código).
1. Arte de las 4 minis y los 2 héroes pendientes.
2. Reencuadre de los frames de ataque y muerte de los jefes.
3. Tipografía y marcos de UI propios.
4. Revisar las fichas `propuesto` y el coste del Grifo.
5. Confirmar el nombre del héroe/jefe duplicado.
6. Licencia de cualquier imagen de terceros que quieras incluir en el juego.

---

## 9. Metajuego (v1.3)

Principios de estructura tomados de los juegos de estrategia móvil por carriles (no se copia ningún contenido de terceros): un **hub** claro,
objetivos opcionales por misión, progresión diaria y un modo de runs. Todo lo demás —nombres, arte, números— es de KOTA.

- **Hub principal:** avatar con nivel y barra de XP, monedas, héroe activo a gran tamaño, tu mazo (con el enano), botón **¡JUGAR!**
  (siguiente misión sin completar) y accesos rápidos. **Navegación inferior:** Inicio · Campaña · Mazmorra · Mazos · Misiones (con punto rojo
  si hay misiones listas o cofres sin abrir). Ajustes con el engranaje.
- **Briefing de misión:** antes de luchar se ven los 3 objetivos (con las estrellas ya logradas) y se pueden activar **mutadores**.
- **Objetivos de estrellas (independientes):** destruir la base enemiga · conservar al menos el 60 % de tu base · no perder ninguna torre.
  Se acumulan entre intentos; las estrellas de una misión son los objetivos cumplidos alguna vez.
- **Mutadores (+25 % monedas y XP cada uno; Sin héroe +40 %):** Enemigos veloces (+25 % velocidad) · Enemigos curtidos (+30 % vida) ·
  Energía escasa (pasivo ×0,5) · Torres frágiles (−40 % vida) · Sin héroe.
- **XP y nivel de jugador:** victoria 40 XP + 10 por estrella (derrota 10). Cada nivel da 50 monedas. XP necesaria = 80 + 40 × nivel.
- **Misiones diarias:** 3 por día (cambian a medianoche): ganar batallas, derrotar enemigos, minar energía, desplegar cartas, derrotar un jefe, ganar sin perder torres.
- **Cofres:** hasta 6. Se ganan con victorias de 2+ estrellas, al derrotar jefes y al acabar runs. Dan 50–130 monedas y, con un 30 % de probabilidad, un nivel gratis para una carta.
- **Mazmorra:** run de 8 niveles generados (terreno y enemigos rotan por las 5 zonas; jefes en el 4 y el 8) con **3 vidas**. Tras cada victoria se elige
  **1 de 3 reliquias** que duran toda la run: Hoja afilada, Armadura de roble, Pico de oro, Mochila de energía, Torres reforzadas, Reloj de arena,
  Botas veloces, Corazón de piedra, Estandarte de paz, Fuente de maná. Recompensa final: monedas por nivel superado (+150 si se completa), XP y cofres.
- **Tutorial:** en la primera misión, tres avisos (arrastrar una carta, enano a una mina libre, despejar un campamento); se pueden ocultar tocándolos.
- **Sonido:** efectos sintetizados con Web Audio (sin archivos): desplegar, golpe, moneda, explosión, captura, jefe, héroe, victoria y derrota. Se puede silenciar en Ajustes.

### Pruebas automáticas
`node tests/logic.test.js` ejecuta 32 comprobaciones de la lógica (modificadores, objetivos, XP, cofres, misiones diarias, mazmorra).

---

## 10. Talentos, eventos y modos (v1.4)

### Talentos por carta
- **3 ranuras** por carta que se abren al subir de nivel (**2, 3 y 5**). En cada una se elige **1 de 2** opciones; cambiar es gratis y se puede dejar vacía.
- Las opciones salen de 20 plantillas y se reparten de forma estable según el rol de la carta (cuerpo a cuerpo, a distancia, apoyo, minero…).
  - Ranura 1 (estadísticas): Vigor +20 % vida · Piel dura +30 % · Furia +15 % daño · Pies ligeros +15 % velocidad.
  - Ranura 2 (utilidad): Coraza +12 % armadura · Ritmo de combate −15 % entre ataques · Largo alcance +20 % · Reclutamiento −1 coste · Manos expertas +40 % curación · Zancada · Pico de acero +30 % energía de mina.
  - Ranura 3 (especial): Sed de sangre (cura 25 % del daño) · Golpe en área · Escarcha (ralentiza) · Golpe aturdidor (cada 4.º ataque) · Refuerzos (+1 unidad y +1 coste) · Último aliento (explota al caer) · Rompemuros (+60 % a edificios) · Égida (escudo 40 %) · Veta rica (+60 % mina).
- Se editan en **Mazos → Talentos** de cada carta (también la del enano). El coste que se muestra en la bandeja ya incluye los talentos.

### Evento semanal (rota cada lunes a las 00:00)
| Evento | Regla |
|---|---|
| Fiebre del oro | Minas ×2 de energía; enemigos +20 % de vida |
| Lluvia de meteoros | Cada 7–11 s cae un meteoro marcado (aviso de 1,3 s): daña a todos |
| Cacería de jefes | Dos jefes en la misma batalla |
| Día del héroe | Enfriamiento del héroe ×0,5 y habilidad con +35 % de radio |
| Ventisca | Cada 18 s se congela un carril entero 1,8 s |

3 niveles (Fácil, Normal, Difícil) con recompensa completa la primera vez (60/100/160 monedas; cofre en Normal y Difícil); repetirlos da un 25 %.
Superar los 3 da un bonus único de la semana: +100 monedas y 1 cofre. Se ve la cuenta atrás hasta el fin.

### Desafío del día
La misma batalla ese día, con **2 mutadores fijos** (nunca "Sin héroe"). Primera victoria del día: 80 monedas + 10 por día de racha (tope +70), 60 XP y 1 cofre.
La **racha** sube con días consecutivos y se rompe al saltarse uno. Se puede rejugar sin premio (10 monedas).

### Supervivencia
Oleadas infinitas, cada vez más rápidas y fuertes (la unidad más dura aparece a partir de la oleada 12), un jefe cada 5 oleadas y base enemiga indestructible.
Termina cuando cae tu base o al retirarte. Recompensa: 8 monedas y 6 XP por oleada y 1 cofre cada 10. Se guarda la mejor marca.

### Pantalla "Modos"
Reúne Evento, Desafío del día, Supervivencia y Mazmorra (la pestaña inferior pasó de "Mazmorra" a "Modos").

### Pruebas
`node tests/logic.test.js` (32 comprobaciones) y `node tests/modes.test.js` (42: talentos, eventos, desafío, supervivencia y reglas de campo).

---

## 11. Fase A — profundidad de combate (v1.5)

### Estados nuevos (valen para aliados y enemigos)
| Estado | Efecto |
|---|---|
| **Silencio** | La mini no puede usar habilidades (ni invocar, si es un Lich; tampoco habilidades de jefe). Dura lo que indique la habilidad. |
| **Desgarro** | −30 % de armadura mientras dure; la armadura puede quedar negativa (hasta −30 %) y entonces recibe más daño. |
| **Empujar / atraer** | Desplaza a la unidad sin sacarla de su carril. **Los jefes son inamovibles.** |
| **Parpadeo** | Se teletransporta junto a su objetivo (dejando un destello). |
| **Inmunidad** | Ningún daño durante unos segundos. |
| **Segunda oportunidad** | En vez de morir una vez, queda al 35 % de vida con 2 s de inmunidad (talento). |
| **Rayo encadenado** | El ataque salta a enemigos cercanos con el 60 % del daño (mago: 2 saltos; talento Relámpago: 1). |

Iconos sobre la cabeza: círculo morado tachado (silencio), escudo rojo roto (desgarro) y aro dorado (inmunidad).

### Habilidades automáticas de las minis (14 cartas)
Se lanzan solas con una IA sencilla cuando hay ocasión; si no la hay, reintentan a los 0,4 s sin gastar el enfriamiento. Se muestran en la ficha de cada carta.
| Mini | Habilidad (enfriamiento) | Qué hace |
|---|---|---|
| Guerrero | Escudo en alto (12 s) | −60 % de daño recibido 3 s, con poca vida |
| Arquera | Lluvia de flechas (10 s) | Salva en área contra un grupo (≥ 2) |
| Grifo | Picado (10 s) | Parpadea al objetivo y golpea ×2 |
| Mago | Nova arcana (12 s) | Daña y empuja a los cercanos |
| Sacerdote | Plegaria (14 s) | Cura el 25 % de vida a los aliados cercanos (≥ 2 heridos) |
| Grunt | Grito de guerra (14 s) | Aliados cercanos con prisa 4 s |
| Bombardero | Barril explosivo (9 s) | Daño en área |
| Wyvern | Lanza envenenada (8 s) | Desgarro 4 s |
| Jinete de lobo | Embestida (10 s) | Parpadea al objetivo y lo aturde |
| Bestia de asedio | Pisotón (12 s) | Aturde y empuja (≥ 2 enemigos) |
| Esqueletos | Garfio óseo (12 s) | Atrae a un enemigo lejano |
| Lich | Silencio (10 s) | Silencia 3 s a un enemigo con habilidad |
| Espectro | Desgarrar (9 s) | Parpadea tras el objetivo y le rompe la armadura |
| Dragón esquelético | Aliento helado (11 s) | Ralentiza y daña lo que tiene delante |

### Talentos nuevos
Relámpago (ranura 2), Desgarro (ranura 2) y Segunda oportunidad (ranura 3).

### Mapa
- **Torre neutral capturable:** algunos campamentos guardan una torre (se ve como silueta con el rótulo "TORRE NEUTRAL"). Al despejarlos pasa a ser tuya
  (900 de vida, dispara y los enemigos la atacan). **Perderla no cuenta** para el objetivo "no pierdas ninguna torre".
- **Neutrales con comportamiento:** dormidos (por defecto), **patrulla** (van y vienen unos 70 px) o **deambulan** cerca de su campamento. Los dos últimos están despiertos
  y atacan al que se acerca. La misión 1 se queda sin nada de esto (es el tutorial); desde la 2 hay variedad; en la Mazmorra, torre desde el nivel 3 y patrulla/deambular según el nivel.

### Balance
Las habilidades suman poder a ambos bandos, así que se suavizó el multiplicador global de dificultad y se subieron las misiones 9 y 10. Resultado con un bot sin estrategia:
con el mazo de ataque A y minero, gana de la 1 a la 9 y pierde la 10; los mazos de apoyo y de monturas lo tienen más difícil.

### Pruebas
`node tests/combat.test.js` (45 comprobaciones: estados, cada habilidad, torre neutral, patrullas y una batalla de prueba con las 13 cartas).

## 12. Fase B — variedad de misión (v1.6)

### Objetivos
| Objetivo | Cómo se gana | Notas |
|---|---|---|
| 🏰 Destruir | Derribar la base enemiga | El clásico |
| 🛡 Defender | Aguantar el tiempo límite con tu base en pie | Oleadas crecientes |
| 🚩 Capturar | Mantener 3 puntos de captura | Si solo hay enemigos en un punto, lo pierdes |
| 🎯 Cazar | Derrotar al campeón enemigo (aura y etiqueta "★ CAMPEÓN ★") | Tiene un tope de vida propio |
| 🛒 Escoltar | Llevar la carreta hasta la meta | Sale a los 10 s, armadura 0.45, no despierta campamentos |
Cada objetivo tiene sus 3 objetivos de estrellas propios.

### Interactuables y disparadores
- **Cofres del mapa**: se abren con una tropa cerca (algunos están bloqueados hasta cumplir una condición); dan energía, monedas o refuerzos. Estadística "Cofres del mapa".
- **Disparadores**: emboscada al capturar o abrir un cofre, refuerzos por tiempo. Un hito suelta oleadas o jefes.
- Bonus de monedas por objetivo en el resultado.

### Contenido
10 zonas × 2 misiones = 20 misiones (ids 10–19 son el capítulo 2, con `foeMult` ×0.9 y retoques individuales en M13, M16, M18 y M20).

### Pruebas
`node tests/phaseb.test.js` (72 comprobaciones). Totales: logic 32 · modes 42 · combat 45 · phaseb 72.
Pendiente de validar con personas: equilibrio real y juego en móvil físico.

## 13. Fase C — metajuego sin servidor (v1.7)

### Duelo contra rival simulado (`rival.js` + `duelAI` en `game.js`)
- "PvP sin servidor": un rival de IA juega con las mismas reglas que tú: energía propia (regen base + un extra equivalente a una mina), mano de 4 cartas que rota, mazo de 5–6 cartas y zona de despliegue arriba. Sin minas ni campamentos. Gana quien derribe la base rival (o tenga más % de base a los 4:00).
- La IA decide cada 1–2,5 s: mide la fuerza de cada bando por carril, defiende donde pierde y, sin amenaza, refuerza su ataque; ahorra energía si no hay presión; a veces se equivoca de carril según su habilidad.
- Cada vez se ofrecen 3 rivales (Novato / Parejo / Veterano) con mazos de 4 arquetipos (Horda, Legión Pálida, Alianza, Saqueadores). Más riesgo = más trofeos (+18/+25/+35, −10/−15/−20).
- 5 ligas por trofeos: Bronce 0, Plata 200, Oro 500, Platino 900, Diamante 1400. Nivel, habilidad e ingresos del rival suben con la liga. Cada 3.ª victoria da un cofre; racha de victorias = más monedas. Abandonar cuenta como derrota.

### Logros (`season.js`)
14 familias × 3 niveles (42 logros): victorias, bajas, jefes, energía minada, cartas jugadas, cofres del mapa, estrellas, mazmorra, supervivencia, racha del desafío (se guarda el máximo), duelos, trofeos, nivel y colección. Premio por nivel: 60/150/350 monedas + XP, y cofre en II y III. Se reclaman una sola vez.

### Tienda diaria
Ofertas fijas durante el día: cofre (140), 2 mejoras de cartas con 50% de descuento y una mini que no tengas (120 + 70 × coste); si ya tienes todas, un pack de XP. Una compra por oferta y día.

### Pase de temporada (gratuito, mensual)
30 niveles; cada 100 XP ganados (de cualquier modo) abren uno. Premio: monedas crecientes, cofre en los niveles 5, 15 y 25, 2 en el 10 y el 20 y 3 + bonus en el 30. Se reinicia cada mes. La pestaña incluye el calendario de los próximos 4 eventos semanales.

### Pruebas y balance
`node tests/phasec.test.js` (65 comprobaciones). Simulación con un bot sencillo: gana casi siempre en Bronce/Plata y sufre en Platino/Diamante con cartas poco subidas, que es la curva buscada. Pendiente de validar con personas.

## 14. Fase D — cosméticos, servidor opcional y arte pendiente (v1.8)

### Cosméticos (`cosmetics.js`)
23 aspectos en 3 tipos, que solo cambian el aspecto (nunca la fuerza): 8 marcos de avatar (CSS, sin arte nuevo), 9 títulos y 6 arenas de duelo (usan los 5 terrenos existentes). Se obtienen con logros, ligas, niveles del pase (10 Escarcha, 15 arena de Nieve, 20 Fuego, 25 título de temporada, 30 Mítico) o monedas (Dorado 400, Desierto 200, "El intrépido" 250). El marco y el título se ven en el hub; la arena se aplica a los duelos. Un equipamiento inválido vuelve solo al básico.

### Servidor opcional (`server/server.js`, `net.js`, `ui_online.js`)
- Node sin dependencias: `node server/server.js` → http://127.0.0.1:8787 (también sirve el juego). Por defecto solo escucha en el propio equipo; para jugar desde el móvil en la misma red: `HOST=0.0.0.0` (decisión del usuario, no hay cifrado ni HTTPS).
- API: registro (token propio, guardado con hash), partida en la nube con control de conflictos (409 + "forzar"), perfil público (mazo y niveles), ranking por trofeos y **rivales fantasma**: la IA del duelo juega el mazo real de otro jugador con trofeos parecidos (+5 trofeos extra si ganas).
- Seguridad: ids de carta validados, nombres saneados, niveles y trofeos acotados, cuerpo máximo de 256 KB, 120 peticiones/min por IP, rutas `server/`, `tests/`, `docs/` y `tools/` no se sirven, sin salir de la carpeta. La partida subida nunca lleva el token.
- El cliente es opcional (pestaña "Online" de la tienda): sin servidor el juego funciona igual y los fallos de red son silenciosos. Tras cada batalla sube perfil y partida.
- No incluye: emparejamiento simultáneo, amigos, gremios ni incursiones (exigen un servicio real y moderación). Para publicarlo en internet hace falta HTTPS y alojamiento: queda fuera de este paquete.

### Arte pendiente
No se puede generar arte desde el código. `node tools/make_art_brief.js` crea `docs/ENCARGO_ARTE.md` con las 4 minis (Paladín, Chamán, Abominación, Gárgola) y 2 héroes sin ilustrar, con el prompt base de KOTA. Hasta que existan, esas fichas siguen desactivadas.

### Pruebas
`node tests/phased.test.js` (68 comprobaciones, incluye un servidor real en memoria). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 68.

## 15. Fase E — mejoras rápidas del análisis del cliente (v1.9)

Salen de `ANALISIS_CLIENTE.md` §7 (ideas S). Diseño y números propios de KOTA.

- **Dificultad adaptativa:** tras 2 derrotas seguidas en una misión de campaña aparece en el briefing la opción 🆘 **Ayuda**: +3 de energía inicial, aliados +20% de vida y torres propias +25%; la recompensa baja a ×0,8. Ganar la misión pone el contador a cero. No existe en heroicas.
- **Tiempo extra en duelos:** si al acabar los 4:00 las dos bases están a menos de 10 puntos porcentuales, se juegan 60 s más: energía de ambos ×1,5, daño a bases ×1,5 y +2 de energía de golpe. Al terminar decide el % de base y un empate exacto lo pierdes. Las misiones de campaña no lo tienen. Se muestra "⏱ TIEMPO EXTRA" en el indicador.
- **Reemplazar mini:** toca "Sig. ↻" y luego la carta de la mano que quieras cambiar. Cuesta 1 de energía, la carta va al final de la cola y entra la siguiente (no se pierde ni se duplica nada). Cuenta en las estadísticas (`stats.replaced`).
- **Grupos aleatorios de campamento:** cada campamento (salvo los de la misión 1) tiene su grupo base y 2 alternativos del mismo tamaño y coste ±1 con tropas del enemigo de la zona, así que la dificultad no cambia pero cada partida es distinta. Se sortea al empezar. En la mazmorra, desde el nivel 2.
- **Heroicas:** al tener 2+ estrellas en una misión se puede jugar su versión heroica: enemigos +30%, campamentos +25%, torres +20%, base +15% y oleadas algo más rápidas; recompensa ×1,8 y un cofre extra la primera vez. No cambia estrellas ni desbloqueos. Nuevo logro familia "Heroico" (3/8/15).

**Pruebas:** `node tests/phasee.test.js` (50 comprobaciones). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 68 · phasee 50. Verificado en el móvil emulado (briefing con heroica/ayuda y reemplazo de carta).
**Pendiente de validar con personas:** si +1,3 de enemigos en heroicas y el ×0,8 de la ayuda están bien calibrados.

## 16. Fase F — ideas M del análisis del cliente (v2.0)

Diseño y números propios; la inspiración es solo la lista de comportamientos de `ANALISIS_CLIENTE.md`.

- **Jefes por fases:** al bajar al 66% y al 33% de vida un jefe (también el campeón de las cacerías) cambia de fase: 1,5 s de inmunidad, quita aturdimiento/silencio/ralentización, +20% de daño y +12% de velocidad por fase, habilidades cada 6,5 s y luego cada 5 s (antes 8) y, en la 3.ª fase, refuerzos. Se ve "¡Fase N!", marcas en su barra de vida y la fase actual (F1/F2/F3).
- **Interruptores:** palanca junto al carril (lado exterior). Una tropa tuya que se quede a menos de 52 px durante 1,2 s la acciona, una vez por partida; el enemigo y la carreta no pueden. Efectos: ⚡ **Energía** (+4), 🛡 **Refuerzos** (2 tropas de tu mazo), 💥 **Trampa** (140 de daño y 1,5 s de aturdimiento a 150 px) y 🔌 **Apagar torre** (la enemiga más cercana, 15 s). Los disparadores de misión pueden esperar a "n interruptores". Hay 1 desde la misión 3, 2 desde la 8 y 3 desde la 15 (y en la mazmorra desde el nivel 2). Nuevo logro "Palanquero".
- **Matorrales (visión de un solo sentido):** manchas de 44 px sobre los carriles (2 por mapa desde la misión 4, y en la mazmorra desde el nivel 3). Quien está dentro no puede ser atacado desde fuera ni por torres hasta que el atacante se acerca a menos de 48 px o entra también; los de dentro sí ven a los de fuera. No afecta a los voladores. El enemigo oculto se dibuja casi transparente.
- **Señales:** botón 📣 en la batalla con 4 emotes (¡Hola!, ¡Vamos!, ¡Ups!, ¡Buen juego!) y "Marcar" (un punto pulsante en el mapa durante 4 s). Espera de 3 s. Son cosméticas; en un duelo el rival responde con su propio emote según vaya ganando o perdiendo. **No hay juego cooperativo**, así que marcar un punto no cambia nada para la IA.
- **Camino de calaveras:** 10 niveles en la pantalla Modos; cada uno exige superar el anterior. Reciclan una misión de campaña (con su objetivo: destruir, cazar, escoltar, defender, capturar) con enemigos +17% por nivel, edificios más duros y **mutadores fijos** desde la calavera 3 (curtidos, veloces, energía escasa, torres frágiles combinados). Primera vez: 70 + 45 × nivel monedas, XP, 1 cofre (2 desde la 5.ª, 3 en la 10.ª). Repetir: 25 + 8 × nivel y sin cofres. Nuevo logro "Calavera".
- **Equilibrio (bot sencillo, 4 partidas por casilla):** calaveras 1-2 casi siempre ganadas con cartas Nv 2-5, 3-4 mixtas, 5-8 difíciles y 9-10 muy difíciles (el bot no usa interruptores ni matorrales a propósito). La campaña sigue igual de jugable que antes.

**Pruebas:** `node tests/phasef.test.js` (67 comprobaciones). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 68 · phasee 50 · phasef 67. Verificado en el móvil emulado (interruptores, matorral, menú de señales, fase de jefe y tarjeta de calaveras).
**Pendiente:** validar con personas la dificultad de las calaveras y si los interruptores se notan lo bastante.

## 17. Fase G — rediseño de la interfaz (v2.1)

### Estructura
- **Cabecera global** (siempre visible fuera de la batalla): avatar con marco y barra de XP (toca para abrir el **Perfil**) y, al otro lado, el **oro con un desplegable** que muestra 🔋 Energía y 💠 Cores ("para mejorar unidades") y un botón "Conseguir más" que lleva a la tienda.
- **Navegación inferior, 5 espacios** de izquierda a derecha: 🛒 **Tienda** · 🛡 **Ejército** · 🗺 **Mapa** (centro, más grande, pantalla principal) · ⚔ **Mazmorras** · 🏰 **Guild** (gris y bloqueado, solo avisa "próximamente").
- Puntos rojos de aviso: en Mapa (misiones diarias listas o cofres), en Mazmorras (desafío del día sin jugar) y en el avatar (logros o pase por reclamar).

### Mapa
Encabezado global + **mapa de la campaña** (10 zonas, la misión en curso resaltada y centrada) + **pie**: las **3 misiones diarias** (con barra de progreso y botón de reclamar), la **misión en curso** (botón grande), los **cofres** y un hueco **PvP bloqueado**. Los duelos contra rivales siguen en Mazmorras.

### Tienda
Ofertas del día (cofre, 2 **mejoras por oro** y una mini) · **Energía** (+30/+100/+300 por 60/180/480 de oro) · **Cores** (1/5/15 por 150/650/1800) · **Ofertas especiales** con dinero real (3 paquetes de ejemplo: $4.99, $9.99 y $19.99). **Estas últimas son solo escaparate**: no hay pasarela de pago, no se cobra ni se entrega nada (el botón está desactivado como "Próximamente").

### Ejército
Mazos guardados (3) · **carrusel deslizante de héroes** con marco por héroe (en color los tuyos, en gris con candado los bloqueados, con la pista de cómo desbloquearlos) · **héroe en tarjeta de 2 filas** junto a las **6 minis (3 arriba y 3 abajo)** · fila del Enano minero (universal) · **colección por raza** (Humanos, Ordu, No Muertos, Enanos) con las que no tienes en gris. Tocar una mini abre su ficha (estadísticas, habilidad, coste de mejora, talentos y añadir/quitar del mazo); tocar el héroe abre la suya.

### Perfil (avatar)
Pestañas: Perfil (nivel, estadísticas, ajustes) · Pase · Logros · Estilo · Online. Lo que antes estaba en "Misiones y cofres" y en la tienda de pestañas vive aquí o en el pie del Mapa.

### Energía y cores (economía nueva)
- **Mejorar una mini** cuesta oro + 🔋 energía + (desde el nivel 3→4) 💠 cores: Nv1→2 30/5, Nv2→3 60/10, Nv3→4 90/15 + 1 core, Nv4→5 120/20 + 2 cores.
- **Energía:** 1 por cada 10 XP ganados en cualquier modo; también se compra con oro. Empiezas con 20.
- **Cores:** 25% de probabilidad por cofre; logros de nivel II y III (1 y 2); pase en los niveles 10, 20 y 30 (1, 2 y 3); primera victoria heroica (1); primera vez en las calaveras 4 a 10 (1, y 3 en la 10). Empiezas con 1. También se compran.
- La mejora de la tienda diaria (oro ×1,5) sube un nivel sin gastar energía ni cores.

**Pruebas:** `node tests/phaseg.test.js` (47 comprobaciones; incluye que todos los elementos que usa el código existen en `index.html`, el orden de la navegación y que no hay código que entregue paquetes de dinero real). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 68 · phasee 50 · phasef 67 · phaseg 47. Verificado en el móvil emulado (mapa, tienda, ejército, ficha de mini, desplegable, flujo misión → batalla → mapa).
**Pendiente de decidir:** si energía y cores deben aparecer también al ganar misiones de campaña como botín visible (ahora la energía llega solo por XP) y qué hacer con el hueco del PvP.

## 18. Fase H — las 12 ideas de `FUNCIONES_CLIENTE.md` (v2.2)

Diseño y números propios. Cada idea parte de un comportamiento genérico visto en el análisis, no de código ni datos ajenos.

1. **Campamentos que reaparecen** (desde la misión 5 y en la mazmorra desde el nivel 3): un campamento despejado vuelve a tener guardianes (−20% de fuerza, +10% por vez) tras 90 s (60 s en mazmorra), cada vez un 25% más tarde, hasta 3 veces y solo si no hay tropas tuyas a menos de 140 px. Vencerlos da **+1⚡** de botín. No vuelven a cerrar la mina ni la zona.
2. **Minas con reserva:** cada mina tiene 20 de energía. Se gasta a ritmo normal; agotada, solo gotea (35%). Sin minero se recarga a 0,2/s. El enano cambia solo a otra mina con reserva si la suya se agota. Barra de reserva y aviso "AGOTADA" en el mapa.
3. **Interruptores de pago y reutilizables:** Energía (gratis, una vez), Trampa (1⚡, 30 s), Refuerzos (2⚡, 40 s) y Apagar torre (3⚡, 45 s). Si te falta energía la palanca queda a la espera ("sin energía") y se acciona al tenerla. Muestra el coste y el enfriamiento.
4. **Enemigos con talentos:** las **heroicas** dan 2 talentos a todos los enemigos (no jefes ni carreta) y las **calaveras** 1 desde la 3, 2 desde la 6 y 3 desde la 9 (se ven en el briefing de la heroica). Mismos talentos que usa el jugador.
5. **Tipos de daño:** físico (por defecto), **mágico** (ignora la armadura: mago, liche, chamán, dragón, espectro) y **asedio** (bombardero, bestia de asedio). Algunas minis resisten o sufren más: esqueletos (físico ×0,8, mágico ×1,25), espectro (físico ×0,65), gárgola, guerrero (mágico ×1,2), paladín, abominación, liche (mágico ×0,8) y bestia de asedio (asedio ×0,8). Se ve en la ficha de cada mini.
6. **Habilidades con calentamiento:** una mini recién desplegada tarda ≈35% del enfriamiento de su habilidad en poder usarla. Barra azul de carga bajo la vida de tus minis.
7. **Nidos y fuentes:** el **nido** enemigo (desde la misión 9; 2 desde la 16; mazmorra nivel 6) crea una criatura cada 26 s (máx. 2 vivas) hasta que lo destruyes (+2⚡). La **fuente** (desde la misión 6; 2 desde la 13; mazmorra nivel 2) cura un 12% cada 4 s a todos los que estén a 70 px, amigos y enemigos.
8. **Puntuación por partida:** ganar (1000) o perder (300) + daño a la base enemiga (hasta 500) + vida de tu base (hasta 300) + bajas ×8 + energía minada ×5 + rapidez (×3 por segundo bajo el par) + estrellas ×150 + cofres ×60 − torres perdidas ×80. Se guarda el **récord** por misión (también heroicas, calaveras y duelos), se muestra en el resultado y hay un logro "Puntuador". El perfil que se sube al servidor incluye la puntuación total.
9. **Mazmorras por temporadas:** abiertas de lunes a viernes y en **descanso** sábado y domingo (no se puede jugar). Al empezar la semana se reparten cofres por el mejor nivel de la anterior: nivel 4 → 1, nivel 8 → 2.
10. **Rivales por nivel y mmr:** los rivales llevan un nivel por carta (la más cara +1, la más barata −1) y hay **Mercenarios**, un mazo generado al azar (4 cartas de una raza + 2 de otras, con coste medio equilibrado). Una valoración oculta (**mmr**, tipo Elo, K=32) ajusta la dificultad de los rivales y el emparejamiento de los fantasmas del servidor.
11. **Mutadores y reliquias de mano:** *Mano inestable* (+20%: cada 30 s una carta de tu mano se cambia sola), *Sin la más cara* (+30%: tu mini más cara no entra en el mazo) y la reliquia **Retorno** (20% de que la carta vuelva a tu mano al desplegarla).
12. **Regeneración fuera de combate:** tras 5 s sin atacar ni recibir daño, una unidad (salvo jefes, carretas y creeps de campamento) recupera el 1,5% de vida por segundo.

**Pruebas:** `node tests/phaseh.test.js` (111 comprobaciones; equilibrio con un bot sencillo: la campaña y las calaveras quedan en el mismo orden de dificultad, dentro del ruido de la simulación). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 68 · phasee 50 · phasef 67 · phaseg 47 · phaseh 111.

## 19. Fase I — rango, XP de mini y nivel de colección (v2.3)

Salen de `FUNCIONES_CLIENTE.md` §5 (progresión de minis y niveles de colección). Diseño y números propios.

- **Rango (rareza) de cada mini:** 4 rangos (Recluta, Veterano, Élite, Leyenda). Cada ascenso sube en 1 el nivel máximo (5 → 8) y da un +5% de fuerza (se aplica como 0,42 niveles extra en batalla). Cuesta 300/600/1000 de oro y 3/6/10 cores y exige tener la mini en su nivel máximo y la barra de XP llena.
- **XP de mini con techo:** tras cada batalla las minis de tu mazo (y el enano minero) ganan 5 de XP, +3 si ganas, +1 por cada despliegue (máx. 10). El techo es 120/200/300 según el rango; con el techo alcanzado la mini queda "lista para ascender" y no gana más hasta ascender. Al ascender la XP vuelve a 0. El resultado de la batalla resume la XP ganada.
- **Nivel de colección:** suma de (nivel + 2 × rango) de todas tus minis. Hay 11 hitos (10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110) con premios de oro, energía, cores y cofres que se reclaman a mano. El panel está arriba en Ejército y el botón de Ejército avisa cuando hay algo por reclamar o ascender.
- **Interfaz:** la ficha de la mini muestra rango (estrellas), barra de XP, requisitos del ascenso y el botón "Ascender"; las fichas del mazo y de la colección llevan estrellas de rango.
- Los cofres, la tienda y las mejoras respetan el nivel máximo del rango.

**Pruebas:** `node tests/phasei.test.js` (57 comprobaciones). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 71 · phasee 50 · phasef 67 · phaseg 47 · phaseh 111 · phasei 57.
La revisión del arte nuevo está en `docs/REVISION_ARTE.md`.

## 20. Fase J — `design_complete` como línea de arte única: minis animadas (v2.4)

- **Empaquetador nuevo** `tools/pack_sheets.py` (solo Pillow): lee las hojas de `art/design_complete/units_current` (5 filas: 4 vistas · idle ×4 · caminar ×6 · ataque ×4 · muerte ×4), localiza las filas por sus huecos, parte cada fila en fotogramas por los huecos verticales (ajustando al número esperado), quita motas, usa **un único factor de escala por unidad**, alinea los pies abajo y el centro de masa del cuerpo en el centro de la celda. Uso: `python tools/pack_sheets.py [minis…]` (≈10 s por mini). Actualiza `art/manifest.json` y `manifest.js`.
- **Reparación automática:** un fotograma de ataque cuyo cuerpo opaco ocupa menos del 55% del habitual (efecto sin personaje) se sustituye por el anterior. Afectó a la sanadora (ataque 3) y a la wyvern (ataque 4).
- **Motor:** el manifiesto de cada mini lleva ahora `bh`/`bw` (alto y ancho del **personaje** dentro de la celda). La celda puede tener hasta un +40% de margen arriba para saltos y efectos sin que el personaje se encoja en pantalla; `spriteFrame`, `blit` y `makeIcon` escalan con `bh`/`bw`. Las 19 minis pasan a tener animaciones reales (antes una sola pose por estado); no hay fila "golpeado" y se mantiene el destello blanco. El **enano minero** usa su arte (el dibujo por código queda de respaldo).
- **Resultado:** las 19 minis con el estilo "juguete" de `ART_DIRECTION.md`, coherente con las estructuras, los héroes y las pantallas nuevas.
- **Pendiente de esta línea:** los 6 retratos de héroe y los 5 jefes anteriores siguen con el estilo anterior (hay `heroes_fullbody` y `bosses_expansion` sin empaquetar); estructuras, props, fondos, cosméticos, VFX y kit de interfaz (ver `REVISION_ARTE.md` §3).

**Pruebas:** `node tests/phasej.test.js` (14 comprobaciones: manifiesto sincronizado, 19 minis con 4/6/4/4 fotogramas, tamaños de celda y de hoja coherentes con el WebP, escala por `bh`, el enano usa su arte y las fuentes no entran en la caché). Totales: logic 32 · modes 42 · combat 45 · phaseb 72 · phasec 65 · phased 71 · phasee 50 · phasef 67 · phaseg 47 · phaseh 111 · phasei 57 · phasej 14.

## 21. Fase K — estructuras con estados y fondos con carriles ajustados (v2.5)

- **Estructuras:** `tools/pack_structures.py` separa cada PNG 2×2 de `design_complete/structures` en 4 estados y los guarda en `art/structures/design_states.webp` (56 entradas en el manifiesto, `k0 = 0.5`). Estados que el motor ya distingue: base/torre (entera, dañada con hp < 50 %, ruina al caer), mina (libre, bloqueada, trabajando, agotada), punto de captura (neutral, tuyo, disputado), cofre (cerrado, bloqueado, abriendo, abierto) y campamentos (limo, huesos, gnolls, puesto al despejarlo).
- **Ruinas:** `state.ruins` conserva base/torre destruidas y se dibujan con su estado "destruido".
- **Fondos y carriles:** `tools/pack_maps.py` genera los 5 fondos 960×1600 y los carriles pasan a ser polilíneas por terreno (`lanesFor(terrain)`), medidas sobre el color del camino de cada mapa; unidades y minas libres siguen la nueva curva.
- **Props:** `terrain_props` no se aplica; los fondos nuevos ya traen decoración.
- **Tests:** las 12 suites pasan; sw.js en `kota-v15`.

## 22. Fase L — jefes de expansión y héroes de cuerpo entero (v2.6)

- **Jefes:** `tools/pack_bosses.py` empaqueta `bosses_expansion` con el formato de 5 filas de las minis. Cinco jefes nuevos (Hidra del pantano, Rey cangrejo, Gólem de forja, Coloso de hielo, Reina araña) entran en el roster (`expansion: true`) y en `BOSS_STATS`, reutilizando las habilidades ya implementadas. Los 5 jefes anteriores **se mantienen** (siguen siendo los campeones de cada terreno); los nuevos aparecen en el evento semanal "Jefes de expansión" (`bossrush2`).
- **Héroes:** `tools/pack_heroes.py` crea hojas animadas `hero_<retrato>` (listas para usar) y una pose estática en `art/leaders_full/`, que muestra la ficha del héroe (`manifest.leadersFull`).
- **Pendiente:** usar las animaciones de héroe en batalla/menús.
- **Tests:** `tests/phasel.test.js` (+ las 12 anteriores); sw.js `kota-v16`.

### 22.1 Papel de los jefes de expansión en las zonas
- **Cacerías (`hunt`):** el campeón de cada terreno pasa a ser el jefe de expansión (bosque: Hidra del pantano · desierto: Rey cangrejo · ruinas: Gólem de forja · nieve: Coloso de hielo · volcán: Reina araña). Los jefes de zona 1/3/5/7/9 siguen siendo los clásicos.
- **Mazmorra:** nuevo jefe en el nivel 6 (Coloso de hielo), además de los niveles 4 y 8.
- **Misión calavera:** el segundo jefe es el Gólem de forja.
- **Evento semanal:** "Jefes de expansión" sigue rotando.

## 23. Fase M — VFX, cosméticos y kit de interfaz (v2.7)

- **VFX:** `tools/pack_vfx.py` junta los 23 efectos de `design_complete/vfx` (cuadrícula 4×2 de 8 fotogramas) en `art/vfx2.webp` (celda 160). El renderizador elige hoja con `vfxSrc(name)`: si el nombre está en `manifest.vfx2` usa la nueva, si no la antigua. Conectados en el motor (`fxv(...)`): poder de cada héroe (`<id>_power`), `shield`, `haste`, `armor_tear`, `ground_slam`, `silence`, `blink`, `meteor`, `blizzard`, `capture_ring`, `chest_light`, `coin_pickup`, `death_smoke` (muerte de jefe) y `hit_spark` (golpe cuerpo a cuerpo).
- **Cosméticos:** `tools/pack_ui.py` corta insignias de liga (5), marcos de avatar (7), emotes (8) y miniaturas de arena (5) en `art/cosmetics/` (`manifest.cos`). En uso: marcos (avatar y perfil, anillo superpuesto; pestaña Estilo), miniaturas de arena (pestaña Estilo) e insignias en la tarjeta de duelo y su resultado.
- **Kit de interfaz:** 37 componentes en `art/ui/kit/` (`manifest.ui`). En uso: moneda, gema de coste de carta y estrellas del resultado. Empaquetados sin usar aún: paneles, botones, marcos de rareza, barras, pestañas, interruptores.
- **Pendiente:** marcos de rareza (hay 4 y las rarezas son 5); ver §23.1.
- **Tests:** `tests/phasem.test.js` (+ 13 anteriores); sw.js `kota-v17`.

### 23.1 Resto del kit aplicado (v2.8)
- **Paneles** (`.panel`, `.zone`): `border-image` con el panel de piedra y remate dorado (esquinas sin deformar).
- **Botones:** `button.primary` usa el botón dorado; los botones de diálogo, el oscuro; los interruptores de ajustes llevan el toggle del kit (clase `is-on`).
- **Pestañas inferiores:** las placas `tab_*` sustituyen a los emojis (la activa brilla en dorado); el punto de aviso usa `dot_red`.
- **Barras:** el kit trae barras ya rellenas (no sirven para valores dinámicos); se aplicó su estilo con CSS (marco dorado y variantes `.blue/.purple/.red`).
- **Señales:** 8 emotes con arte (saludo, enfado, asombro, GG, risa, llanto, cuidado, gracias) + «Marcar»; el globo en batalla muestra el retrato.
- **Sin usar aún:** marcos de rareza de carta (hay 4 y las rarezas son 5), casillas/checks, aviso (`toast_bell`), `level_up` y `lightning_chain`.
- sw.js `kota-v18`.

### 23.2 Pulido del kit (v2.9)
- **`level_up`:** `uiVfx`/`levelUpFx` (render.js) animan el efecto sobre la interfaz al mejorar una carta y al subir de nivel (paneles de resultado y recompensas).
- **`lightning_chain`:** cada salto de una cadena de rayos dibuja el relámpago entre los dos objetivos.
- **Checks:** los objetivos de misión (briefing y resultado) usan `check_on/check_off`.
- **Aviso:** `toast` usa la campana del kit (`toast_bell`).
- **Sin usar aún:** marcos de rareza de carta (4 marcos, 5 rarezas), casillas `box_*`.
- sw.js `kota-v19`.

## 24. Fase N — pantalla de campaña como planeta girable (v3.0)

**Qué es:** la pestaña Mapa muestra un planeta esférico (canvas 2D, `ui_planet.js`) sobre un fondo espacial oscuro con marcos dorados. Cinco regiones, cada una con cinco mapas. Al tocar una región se abre un modal; el planeta conserva su orientación al cerrarlo.

**Regiones ↔ terrenos del proyecto:** Bosque Esmeralda (forest) · Dunas Doradas (desert) · Corona Glacial (snow) · Falla de Ceniza (volcanic) · Reino Olvidado (ruins). Los nombres, objetivos, descripciones y jefes de cada mapa son los del proyecto (`MISSIONS`).

**Dato nuevo — el quinto mapa:** el proyecto tenía 4 mapas por terreno (20 en total). Para cumplir «cinco mapas por región, el quinto es el jefe regional» se añadieron 5 misiones (ids 20-24, `regional: true`), una por terreno, cuyo jefe es el campeón de la región (`CHAMPIONS`: Hidra del pantano, Rey cangrejo, Gólem de forja, Coloso de hielo, Reina araña). Nombres propios: Pantano de la Hidra, Cueva del Rey cangrejo, Forja del Gólem, Cumbre del Coloso, Telaraña de la Reina. Se abren al superar los otros cuatro mapas de su región (`missionUnlocked`); las 20 originales mantienen ids, orden y cadena de desbloqueo. Constante `CORE_MISSIONS = 20` para lo que dependía del total (misiones de evento). El combate no cambia.

**Planeta:** superficie pintada por código (ruido 3D sin costuras, 768×384, por trozos para no bloquear la interfaz): bosque con ríos, dunas con oasis, nieve con grietas de hielo, ceniza con lava y ruinas con musgo y brillos espectrales; fronteras deformadas por ruido con una costura dorada. Se renderiza por píxel (normal → lon/lat → textura) solo mientras se mueve. Giro horizontal libre y vertical limitado a ±40°; la superficie y los marcadores comparten la misma proyección (`projectPoint`).

**Interacción:** arrastre con ratón o dedo (umbral de 8 px; un arrastre nunca abre una región, el `click` siguiente se descarta); inercia al soltar; toque sobre la superficie o sobre un marcador abre la región bajo el dedo. Teclado: flechas giran el escenario, Intro abre la región central, Tab recorre los marcadores y gira hacia el enfocado; cuatro botones ◀▲▼▶ con etiqueta; región central anunciada en una zona `aria-live`. Respeta `prefers-reduced-motion`.

**Marcadores y etiquetas:** botones HTML sobre el canvas; los de la cara oculta se desvanecen y dejan de captar toques; las etiquetas se colocan debajo o encima, nunca salen de la pantalla y se ocultan si chocarían con otra (el botón conserva su `aria-label` completo). Texto: «5 mapas · ★ 9/15».

**Modal:** `role="dialog"` `aria-modal`, cabecera con la región, cinco mapas como grupo de opciones (miniatura, nombre, objetivo, jefe/campeón, estrellas o motivo de bloqueo), selección dorada, «Iniciar mapa N» (abre el briefing de siempre para elegir mutadores y empezar) y «Cerrar». Escape cierra, el foco queda atrapado dentro y vuelve al marcador de origen; flechas cambian la selección.

**Reutilización de arte:** miniaturas de arena (`art/cosmetics/arena_*`), iconos de jefes/campeones (`makeIcon`), kit de interfaz (estrellas, marcos, botones, panel). No se generó arte nuevo ni se usó una maqueta como fondo.

**También:** las misiones diarias del pie de la pantalla se pliegan para dejar sitio al planeta. Se corrigió una carrera al arrancar (`show('home')` podía ejecutarse antes de cargar los últimos scripts cuando todo estaba en caché).

**Pendiente:** equilibrar los 5 jefes regionales con partidas reales; zoom con pellizco; miniaturas propias por mapa (hoy comparten la de su terreno). Tests: `tests/phasen.test.js` (+14 anteriores); sw.js `kota-v25`.

### 24.1 Mutadores guardados
Los mutadores opcionales de la preparación de batalla (briefing) están ocultos: `MUTATORS_IN_BRIEFING = false` en `ui.js`. Datos, reglas y recompensas intactos; el desafío diario y las calaveras siguen usándolos. Para reactivarlos basta poner la constante en `true`. sw.js `kota-v26`.

## 25. Fase O — comportamiento de los mineros (v3.1)

Reglas del enano minero (`mineStep` en `game.js`):
1. **Recolectando** en una mina con oro (reserva ≥ 1, a ≤ 48 px): no deja el trabajo aunque lo ataquen.
2. **Si lo atacan y no está recolectando** (de camino a la mina, mina agotada…): se defiende como una tropa normal. «Atacado» = recibió un golpe en los últimos 4 s (`MINER_ALERT`).
3. **Mina agotada:** la deja y busca otra con reserva ≥ 5, libre y desbloqueada (nunca la que acaba de dejar, `skipMine`). Si no hay ninguna, **avanza por su carril** atacando lo que encuentre —edificios enemigos incluidos— hasta dar con otra mina o una edificación enemiga. Mientras avanza revisa cada frame si aparece una mina utilizable y, si es así, va a ella.
4. Sin minas libres y sin haber agotado la suya, espera como antes.
Cambio respecto a antes: la mina agotada ya no «gotea» oro con el minero dentro (la constante `MINE_TRICKLE` queda sin uso práctico). Tests: `tests/phaseo.test.js` (+ ajuste en `phaseh`); sw.js `kota-v27`.
