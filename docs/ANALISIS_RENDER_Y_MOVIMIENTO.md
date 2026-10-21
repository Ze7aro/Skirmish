# Cómo se dibujan y se mueven las unidades, héroes y mapas — Warcraft Rumble frente a KOTA

Fecha: 20-oct-2026. Complementa `ANALISIS_CLIENTE.md` y `BRECHA_RUMBLE.md`.

## 0. Fuentes y límites

- **REA no estaba disponible** en esta sesión (el servidor MCP `rea` agotó el tiempo de conexión). Se usó lo que ya se había obtenido con él: el esqueleto de tipos C# (`Il2CppInspectorRedux`, 20 073 tipos) y un listado de las carpetas de datos del juego instalado.
- Es **estructura, no contenido**: nombres de clases, campos y las descripciones (`Tooltip`) que el propio juego trae. No hay lógica, números de balance, modelos, texturas ni animaciones, y no se ha copiado nada. Todo lo que sigue sobre Rumble es **deducción de esas firmas**; donde se infiere, se dice.
- Para confirmar cualquier punto dudoso haría falta mirar los *bundles* (`Data/StreamingAssets/Bundles`) o ejecutar el juego con una herramienta de inspección; no se ha hecho.

---

## 1. Unidades y héroes en Rumble

**No son sprites: son modelos 3D con esqueleto, animados con el `Animator` de Unity** (Mecanim). Se deduce de:

| Pieza | Qué dice la firma |
|---|---|
| `AspectModel` / `AspectModelBase` | Un *aspecto* por unidad con el nombre del **modelo**, el **controlador de animación**, posición/rotación/escala, **variantes de modelo** (el juego elige una al azar entre `Model` + `ModelVariants`), rotación aleatoria opcional y adjuntos |
| `AspectModelAttachment` + `AttachmentPoint` | Armas, monturas, mochilas… son modelos aparte acoplados a un hueso/punto |
| `AspectModelMaterial` | Un **material de estado** (congelado, veneno, sigilo…) que se mezcla con el aspecto normal con **tiempos de entrada, salida, pausa y reanudación** y una **prioridad** entre materiales |
| `AspectSkin` + `SkinAspectModelOverride` | Las skins **sustituyen el modelo** (y sus adjuntos); la lógica no cambia |
| `m_applyTeamColor` | El color de equipo se aplica **sustituyendo un degradado del material** según quién sea el dueño (no hay un modelo azul y otro rojo) |
| `m_showSilhouette` | Silueta visible cuando la unidad queda tapada por el escenario |
| `m_receivesDecals` | Recibe *decals* (los círculos de objetivo de los hechizos) |
| `BlobShadow` (+ `m_blobShadowRadius`, `m_useShadowOffset`, `m_shadowOffset`) | Sombra «de mancha» barata con radio propio; los voladores dibujan la sombra **como si estuvieran en el suelo** |
| `AspectMovement.m_baseOffset` | Altura a la que «flota» una unidad sobre el suelo |
| `AspectOutline` | Contorno de selección/enemigo |
| `RenderScaleResolver` | **Escala de render por calidad de dispositivo** (resolución dinámica) |
| `PrefabPool`, `ObjectPool` | Modelos y efectos **reutilizados** en vez de crearlos y destruirlos |
| `AssetBundle*` (por *scope*) | El arte llega en paquetes por ámbito (lo necesario para una misión), no todo de golpe |

**Animación (cómo se mueve el cuerpo)**

- Cada unidad tiene un **Animator** con **parámetros** que la simulación rellena: `Speed`, `RotationSpeed`, `IsAlive`, `Asleep`, `Life`, `InStealth`, `OnCooldown`, `Possessed`, `StartDeploy/StopDeploy/DeployDuration/DeployVariant`, `WoundCount`, `IsCaptured`, `WorkFraction`, `StartMine/MinedTime`… Es decir, **la simulación manda; el Animator solo reacciona**.
- *Behaviours* de estado reutilizables: `AnimationRandomVariation` / `AnimationCycleVariation` (elegir al azar o rotar entre N variantes de un ataque o idle), `AnimationStartRandom` (arrancar en un punto aleatorio para que un grupo no se mueva «a coro»), `AnimationSwapRandom`, `AnimationStateOverride`, `AnimatorOverride`.
- **`AnimationSynchronize`**: la animación se **estira** para durar exactamente lo que dura la acción en la simulación (`m_stretchAnimationDuration`, `m_durationParameter`, tiempo normalizado). Por eso un ataque lento y uno rápido de la misma unidad se ven bien.
- `AspectAnimation` (en datos): una acción de la simulación puede **disparar un parámetro o trigger** concreto en el modelo («lanzar habilidad», «aturdido»).
- `AnimatorMultiplexer`: **varios Animators por unidad** (cuerpo, montura, adjuntos) controlados a la vez.
- **Cliente y simulación separados**: `Common/Simulation` (compartido, determinista, también en el servidor) y `Client/Simulation/*Proxy` (solo visual). Los *Proxy* escuchan eventos de la simulación y los traducen a animación/efectos; no deciden nada.

**Héroes**: mismo sistema (un modelo y un controlador), con *aspectos* de habilidad y de «cutscene» de introducción/fin de partida (`AspectIntroCutscene`, cámara con FOV y transición propios para la secuencia final).

---

## 2. Mapas en Rumble

Una **misión es un conjunto de datos** (`Data/Missions`) sobre una **escena 3D**:

| Pieza | Función |
|---|---|
| `MissionTerrain` | El terreno (un asset) con interruptor de visibilidad |
| `MissionProp` + `MissionPropSetScene` | **Props colocados** (cada uno con su asset, posición, rotación, escala, y **datos de luz horneada**: `LightmapIndex`, `LightmapScaleOffset`, `CastShadows`). Se agrupan en **sets** (`Base` + alternativos) y **capas** (`Default`, `Lights`) |
| `MissionRoad` (+ `MissionRoadGoal`, `RoadAlignment`) | **Caminos como objetos**: cada uno con **metas** según la dirección del equipo y, opcionalmente, un **interruptor** que lo activa |
| `MissionWaypointList` | **Listas de puntos de ruta** (posición + rotación) para patrullas, escoltas y guardias |
| `DeployZone*` (`TileType`, `ThinnedEdges`) | La **zona de despliegue como casillas**, con tipos y bordes «adelgazados» (para que la zona no se vea como un bloque recto) |
| `LineOfSightBlocker`, `MissionOneWayLosBlocker` | **Bloqueadores de visión**, incluidos los de **un solo sentido** (nuestros matorrales) |
| `MissionVariant` | **Variantes** de la misma misión (otra dificultad/otro contenido) |
| Navegación | **Grafo de navegación (A\*) horneado** que se **envía con la misión** (`ClientNavigationSystem.Initialize(..., graphData)`), con **máscaras de áreas**; hay renderizadores de depuración (`RoadDebugRenderer`, `NavigationDebugRenderer`) |

Conclusión: el mapa es **geometría 3D iluminada de antemano** + **capas de datos** (caminos, zonas, rutas, visión) que la simulación consulta. El arte y la lógica están separados.

---

## 3. Movimiento en Rumble

- **`AspectMovement`** (datos): velocidad lineal **en celdas por segundo**, velocidad angular (360°/s por defecto) con **multiplicador lento fuera de combate** (¼), distancia de «llegada», `ignoreNavGraph` (ir en línea recta, para voladores) y `ignoreLosForFlight`.
- La velocidad deseada se publica por evento y llega al Animator como `Speed` (por eso el ciclo de andar va **acompasado con la velocidad real**).
- **Varios «cerebros» de movimiento** (aspectos `AspectMovementAI*`), cada uno con una **prioridad de movimiento** (`m_movementPriority`) y un orden de arbitraje:
  - `Goal` — ir hacia una meta (prioridad 0): distancia de llegada.
  - `Lane` — seguir el camino: busca carriles con un cilindro de búsqueda, **puede re-adquirir el carril tras un combate** (`AllowLaneReevaluation`), prioridad 1.
  - `Leash` — volver a donde empezó si se aleja más que `LeashRange`; si está cerca **se queda quieto en vez de volver exactamente** (evita temblores), prioridad 1,5.
  - `Patrol` / `RandomPatrol` / `Wander` — rutas de puntos de ruta con **retraso inicial, espera en cada punto, arco de llegada, bucle y operaciones al llegar** (por ejemplo, «al terminar la ruta, hacer X»).
- Es decir: **una pila de comportamientos con prioridad**, no un `if` gigante. Cada campamento, guardián, escolta o minero es la misma máquina con distintos aspectos.

---

## 4. Cómo lo hace KOTA hoy

**Sprites** (`tools/pack_sheets.py`, `render.js`)
- Hojas WebP de **5 filas** por unidad: vistas (4) · idle ×4 · caminar ×6 · ataque ×4 · muerte ×4. El empaquetador **descarta la fila de vistas**.
- Un solo factor de escala por unidad, pies alineados, celdas con margen; el render escala por la altura del **personaje** (`bh`).
- Animación elegida en `drawUnit` según estado (aturdido→idle, ataque, caminar, idle). Cuadros: caminar 9 fps y idle 4 fps **fijos**; muerte 9 fps; ataque por progreso de un `atkT` de **0,45 s fijo**. Desfase por unidad (`t + id·0,37`). Volar = onda senoidal de ±2 px. Mirar a izquierda/derecha = **volteo horizontal**.
- Héroes: retrato + pose de cuerpo entero estática; hojas animadas empaquetadas pero **sin uso en batalla**. Jefes: mismas hojas de 5 filas.
- Peso total del arte de unidades: 5,2 MB (35 archivos); todo se **precarga al inicio**.

**Mapas**
- Un fondo pintado **960×1600** por terreno + **estructuras con estados** (atlas 2×2) + props. Los **carriles son polilíneas por terreno** medidas a mano/por color sobre el fondo; la unidad se «ata» al carril con `clampLane` (ancho ±34 px). Zonas de despliegue = `y ≥ 630`. Mapa como datos: campamentos, interruptores, matorrales, nidos, fuentes, cofres (`MISSIONS`, `mapFeatures`).

**Movimiento**
- `moveToward`: línea recta en px/s (velocidad de la carta × modificadores: lento ×0,55, prisa ×1,5, carga ×1,7), `clampLane`, **volteo instantáneo**; `followLane` = siguiente nodo de la polilínea y, al final, la base enemiga.
- Los comportamientos están **entrelazados en `updateUnit`** (sacerdote, minero, guardia de campamento, patrulla, campeón…) con un orden fijo de `if`. No hay separación entre unidades (solo empujones puntuales).

---

## 5. Qué podemos adoptar (por valor / esfuerzo)

| # | Idea | De dónde sale | Esfuerzo | Notas |
|---|---|---|---|---|
| 1 | **Acompasar el andar con la velocidad real** (fps del ciclo ∝ velocidad, y más lento con *slow*, más rápido con *haste*) | `Speed` → Animator | S | Evita el «patinar»; cambio de 3 líneas en `spriteFrame` |
| 2 | **Estirar el ataque a la acción** (que la duración y el golpe coincidan con el `cd`/ventana) y reproducir el golpe en el cuadro del impacto | `AnimationSynchronize` | S–M | Solo visual; el daño sigue como ahora. Con cuadro de impacto marcado en el manifiesto |
| 3 | **Usar la fila de vistas** que hoy descartamos: de **espaldas** para quien sube hacia la base enemiga, **de frente** para quien baja, **3/4** en combate | modelo 3D que gira | M | Ya tenemos el arte; hay que empaquetarla y elegir vista por el ángulo de movimiento |
| 4 | **Giro suave** (velocidad angular, más lenta fuera de combate) en vez de volteo instantáneo | `m_speedAngular` | S | Un par de cuadros de «giro» o un ligero *squash* al cambiar de lado |
| 5 | **Variación al azar de idle/ataque** y arranque aleatorio (ya tenemos desfase por unidad) | `AnimationRandomVariation/StartRandom` | S | Requiere variantes en el arte (pendiente de encargo) |
| 6 | **Materiales de estado con fundido** (congelado, veneno, sigilo, aturdido) con tiempos de entrada/salida y prioridad | `AspectModelMaterial` | S–M | Tinte con `globalCompositeOperation`/filtro y alfa animado, en vez de solo iconos |
| 7 | **Sombra «de mancha» por unidad** (radio propio; en voladores, sombra en el suelo y cuerpo elevado) | `BlobShadow` | S | Un campo `shadow` en el manifiesto |
| 8 | **Anillo/degradado de color de equipo** y **silueta si queda tapada** (matorral, estructura) | `m_applyTeamColor`, `m_showSilhouette` | S | Refuerza lectura en móvil |
| 9 | **Pila de comportamientos de movimiento con prioridad** (meta, carril, correa, patrulla) | `AspectMovementAI*` | M | Unifica minero, guardias, patrullas, escolta y campeón; permite **re-adquirir carril tras combate**, **espera en puntos**, **distancia de llegada** y **correa sin temblores** |
| 10 | **Separación suave entre unidades** (evitar el solapamiento) | colisión/navegación | M | O(n²) con ≤60 unidades es barato; vigilar que no cambie el equilibrio |
| 11 | **Mapa como datos con capas**: fondo, carriles (con ancho), zona de despliegue, props, rutas de puntos, bloqueadores de visión, **variantes** | `Mission*` | M | Un JSON por mapa; las 20+5 misiones comparten fondo por terreno y cambian de variante |
| 12 | **Capa de depuración** (`?debug=lanes`) que dibuje carriles, zonas, rutas y visión | `RoadDebugRenderer` | S | Ayuda a ajustar carriles contra el fondo (hoy lo hago con un script aparte) |
| 13 | **Carga por ámbito**: solo las hojas del mazo, del enemigo y del terreno | `AssetBundle` por scope | M | Ahorra memoria y arranque (hoy 5,2 MB de unidades + 1,8 MB de VFX al inicio) |
| 14 | **Calidad dinámica**: bajar DPR/tamaño del planeta/partículas si baja el FPS | `RenderScaleResolver` | S | Útil en móviles modestos |
| 15 | **Separar simulación y vista** de forma explícita (eventos de la simulación → *proxies* visuales) | `Common` vs `Client/*Proxy` | L | Es la base del **replay validado** y del servidor autoritativo; ya apuntado en la brecha |

**Orden recomendado:** 1 → 7 → 8 → 6 → 2 (mejoran el aspecto sin tocar reglas) · luego 12 → 9 → 11 (orden interno y herramientas) · y dejar 3, 10, 13 para cuando haya hueco de arte/rendimiento.

---

## 6. Aviso

Este documento describe **técnicas generales** inferidas de nombres de tipos del cliente para decidir cómo mejorar un juego original. No contiene ni se ha usado arte, modelos, animaciones, textos, datos ni código de Warcraft Rumble, y KOTA no debe copiarlos. Las ideas de la tabla 5 se implementarían con arte propio.
