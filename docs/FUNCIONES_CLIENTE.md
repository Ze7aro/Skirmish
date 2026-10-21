# Funciones del cliente de Warcraft Rumble y su utilidad para KOTA

Fecha: 19-oct-2026. Complementa `ANALISIS_CLIENTE.md` (que describía la estructura general) con una lista concreta de **clases, funciones y parámetros** y una valoración de cuáles nos sirven.

## 0. De dónde sale y cuánto se puede confiar

- **Fuente:** Il2CppInspectorRedux leyó el binario y los metadatos IL2CPP v39 (219 437 métodos, 9 240 clases propias del juego) y se aplicaron a Ghidra (330 350 funciones, 384 273 con nombre).
- **Qué hay:** nombres de clases, nombres y firmas de métodos y **nombres y tipos de los campos de datos** (los parámetros que un diseñador puede configurar).
- **Qué NO hay:** la lógica interna ni los números de balance. De momento solo se descompilaron 12 funciones (aturdimiento: animación y constructores).
- **Por tanto, la columna "qué hace" es una deducción** a partir de nombres y campos, no una lectura del código. Los que dicen "(alta)" tienen nombres y campos muy claros; "(media)" o "(baja)" son hipótesis.
- **Uso:** solo para inspirar mecánicas propias. No se copia código, datos, textos ni números. Los identificadores originales se anotan únicamente para poder volver a buscarlos.

Leyenda de KOTA: ✅ ya lo tenemos · ◐ lo tenemos a medias · 🆕 sería nuevo. Esfuerzo: **S** medio día · **M** 1-2 días · **L** varios días.

## 1. Comportamientos de entidad ("aspectos")

Cada unidad, torre, campamento o punto del mapa es un objeto al que se le acoplan estas piezas. Cuadro por pieza: qué hace, qué se puede configurar y si nos sirve.

| Pieza | Qué hace (confianza) | Parámetros que se configuran | ¿Sirve a KOTA? |
|---|---|---|---|
| **AspectLife** | Vida, herida, muerte y resurrección con duraciones; ejecuta operaciones al morir (alta) | vida máxima, tiempo de herida/muerte/decaimiento, nº máximo de resurrecciones, operaciones al morir y al resucitar | ✅ vida. 🆕 *resurrecciones limitadas con efecto* (S) |
| **AspectArmor** | Reducción de daño según **tipo de daño** (alta) | tipo de daño que cubre, multiplicador, multiplicador acumulable, modificador plano, condiciones | ◐ solo tenemos % plano. 🆕 **armadura por tipo de daño** (físico/mágico/asedio) (M) |
| **AspectAbility** | Habilidad con adquisición de objetivos (alta) | a quién apunta (aliado/enemigo), altura mín/máx, ¿puede apuntar a sigilosos o muertos?, solo provocadores, ignorar provocación, objetivos en enfriamiento | ✅ habilidades automáticas. 🆕 **reglas de objetivo por habilidad** (S) |
| **AspectStun** | Marca a la unidad como aturdida y reproduce la animación (alta) | animación | ✅ |
| **AspectCheatDeath** | Marca "trampa a la muerte" (alta) | sin parámetros (la lógica está fuera) | ✅ "Segunda oportunidad" |
| **AspectLimitedLives** | Vidas con tiempo de reaparición (alta) | nº de vidas, tiempo de reaparición, operaciones al reaparecer y al quedarse sin vidas | 🆕 **jefes o héroes con vidas** y puntos de reaparición (M) |
| **AspectPhases** | Lista de fases por tramo de vida (alta) | lista de fases (cada una con sus datos) | ✅ jefes por fases |
| **AspectPeriodic** | Ejecuta acciones cada X segundos (alta) | retraso inicial, periodo, **rango aleatorio**, nº máximo de veces, cortar si se cumple una condición, no actuar durante el retraso de despliegue | 🆕 **torres o criaturas que invocan/curan cada X s** (S) |
| **AspectCombatTimer** | Detecta "en combate" y "fuera de combate" (alta) | tiempo para salir de combate, acciones al entrar por 1.ª vez / al entrar / al salir | 🆕 **regeneración fuera de combate** (S) |
| **AspectDeployDelay** | Retraso de aparición entre las unidades de un mismo despliegue (alta) | pausa, pausa inicial, retraso por índice, deslizar desde el punto de despliegue | 🆕 **despliegue escalonado** (más legible, S) |
| **AspectMorph** | Transformación temporal de una unidad en otra (alta) | unidad destino, ¿es transformación permanente?, duración escalable | 🆕 **habilidad de transformación** (M) |
| **AspectPossess** | Posesión: la unidad cambia de ejército (alta) | de qué ejército toma la ubicación, si toma el nivel | 🆕 **control mental** (M-L) |
| **AspectPullTarget** | Un "viajero" va hasta el objetivo y vuelve, atrayéndolo (media) | velocidad de ida y vuelta, retraso, distancias de llegada, rayo hacia el viajero | ✅ atraer. 🆕 **gancho visible que viaja** (S) |
| **AspectOnlyHealable** | Solo se puede curar, no recibe otros efectos (media) | ninguno | 🆕 torres/aliados que el sacerdote cura (S) |
| **AspectSleep / AspectStealth / AspectUnacquireable** | Dormido, sigiloso y "no apuntable" (alta) | ninguno | ✅ sueño y sigilo. 🆕 **unidades intocables** (S) |
| **AspectCreep / AspectCreepCamp** | Criatura neutral y campamento con **reaparición** (alta) | tiempo inicial, duración del combate, **tiempo de reaparición y reaparición escalada**, ¿reaparece en grupo?, tiempo mínimo garantizado sin enemigos, reaparecer en vivo | ◐ campamentos de una sola vez. 🆕 **campamentos que reaparecen** (M) |
| **AspectGoldSourceMineable** | Fuente de oro **con reserva** (alta) | oro máximo, oro inicial, acciones al minar, **tiempo de recarga de oro** | ◐ minas infinitas. 🆕 **minas con reserva que se agotan y se recargan** (M) |
| **AspectInteractable** | Objeto interactivo **con coste y enfriamiento** (alta) | enfriamiento, **coste en oro para activar y desactivar**, condiciones, acciones, modo interruptor (on/off), duración activa, aspectos que activa, temporizador visible | ◐ interruptores gratis de un solo uso. 🆕 **de pago, reutilizables y con enfriamiento** (S) |
| **AspectPointOfInterest** | Punto capturable (alta) | condiciones de captura, nivel de propiedad y de disputa, tiempos de reinicio, radios de captura y disputa | ✅ puntos de captura. 🆕 **reinicio y disputa** (S) |
| **AspectTokenCounter** | Contador de fichas con umbrales (media) | umbrales, eventos al cambiar, valor inicial, valor de reinicio | 🆕 **acumuladores** (p. ej. "cada 3 golpes…") (S) |
| **AspectToggle** | Activa o desactiva otro aspecto tras un retraso (media) | retraso, duración, estado deseado, buscar en hijos/padres | 🆕 útil para jefes y trampas (S) |
| **AspectTurret** | Torreta que gira hacia el objetivo (alta) | punto de anclaje, velocidad de giro, volver a la dirección del equipo | solo visual |
| **AspectBeam** | Rayo entre dos puntos (alta) | prefab, origen y destino, desplazamientos | ✅ rayo encadenado (visual) |
| **AspectMovement** | Velocidad y giro (alta) | velocidad lineal y angular, ignorar rejilla de navegación, **ignorar visión al volar** | ✅ |
| **AspectCollider** | Colisión, empuje y capas (alta) | capas, peso de empuje, solape, obstáculo | ◐ separación simple |
| **AspectForcedDeployTarget** | Obliga a desplegar en un punto (alta) | radio, ajustar al borde o al centro, filtro de ejército, minis requeridas | 🆕 **tutoriales y misiones guiadas** (S) |
| **AspectMobileDeployArea / …AnywhereBlockerArea** | Zona de despliegue móvil y zonas donde **no** se puede desplegar (alta) | tipo de acceso, dimensiones | ◐ zonas fijas. 🆕 **zonas de despliegue que se mueven o se bloquean** (M) |
| **AspectGoal / AspectHome** | Marcan el objetivo y la base (alta) | ninguno | ✅ |

## 2. Mejoras de ejército

| Pieza | Qué hace | Parámetros | ¿Sirve? |
|---|---|---|---|
| **GoldEarned** | Suma energía por segundo | aumento aditivo por segundo | ✅ ya tenemos (mutadores y reliquias) |
| **HandModifier** | Cambia cómo funciona la mano | "devolver la mini a la mano" | 🆕 **reliquia que devuelve la carta a la mano** (S) |
| **HomeModifier / TowerModifier** | Modifica la base o las torres | lista de modificaciones, máximo de unidades afectadas y de acumulaciones, indicadores requeridos | ✅ |
| **MiniReplacement** | Sustituye una mini por otra (también en mano) | mini requerida, lista de sustituciones, ¿cambiar con la carta en mano?, ¿repetir la lista? | 🆕 **mutador "cambio de cartas"** (S) |
| **MiniRemove** | Quita una mini del mazo | mini a quitar | 🆕 **mutador "sin X"** (S) |
| **UseCostDeck** | Usa el coste de mazo (media) | — | 🆕 posible mutador de coste (S) |

## 3. Misiones como datos

Una misión se compone de piezas colocadas en el mapa. Lo que contiene y lo que podemos aprovechar:

| Pieza | Qué contiene | ¿Sirve? |
|---|---|---|
| **MissionVictoryInfo** | Tipo de misión, **tiempo límite**, y una **fórmula de puntuación**: puntos por victoria, empate y derrota, **multiplicador por diferencia de oro** y puntos por tramos de vida de la base enemiga | 🆕 **puntuación por partida** (más allá de las 3 estrellas) para ranking y desempate (S-M) |
| **MissionUnit** | Unidad con nivel relativo, **talentos "heroicos" y de incursión** y modificaciones de unidad y de talento | 🆕 **enemigos heroicos con talentos propios** (hoy solo les subimos números) (M) |
| **MissionDeployArea** | Zona de despliegue con objetivos, **variantes en las que se desactiva** (normal/heroica), etiquetas de IA y forma | 🆕 zonas distintas por dificultad (S) |
| **MissionSwitch + Choices** | Interruptor con **varias opciones** (no solo una acción) y propietario | ◐ nuestros interruptores tienen un efecto fijo. 🆕 **palancas con elección** (S) |
| **MissionRandomizedUnitGroup** | Grupos con posibilidades y pesos | ✅ campamentos aleatorios |
| **Road / Waypoints / Navigation / Unwalkable / OneWayLosBlocker** | Carreteras, caminos de waypoints, zonas no transitables y bloqueadores de visión de un solo sentido | ✅ matorrales. 🆕 **rutas con waypoints** para patrullas y carretas (M) |
| **Prop / PropSet / Terrain / CameraBound** | Escenografía, terreno y límites de cámara | ✅ props por terreno |

## 4. Simulación y partida

| Pieza | Qué hace (confianza) | ¿Sirve? |
|---|---|---|
| **Session** | Reloj de la partida con **escala de ticks** y máximo (alta) | ✅ x1/x2. 🆕 **ticks fijos para repeticiones** (L) |
| **Victory** | Fin de partida con **tiempo extra** (tiempo transcurrido y restante, "en tiempo extra") (alta) | ✅ tiempo extra en duelos |
| **Team** | Dirección de avance, resultado y "victoria decidida" (alta) | ✅ |
| **Army** | Oro (con eventos de cambio y de ubicación), mano de **4 casillas** con reemplazos, **señales y emotes**, contador de jugadas y de reemplazos por mini (alta) | ✅ mano, señales, reemplazar. 🆕 **estadística de jugadas por mini** (S) |
| **ArmyGenerator** | Genera ejércitos de IA: elige minis, **nivel medio objetivo** y niveles por mini (alta) | ◐ nuestro rival usa mazos fijos. 🆕 **rivales generados por nivel objetivo** (S) |
| **CooldownManager** | **Enfriamiento y "calentamiento"** (cooldown y coolup) con callbacks (alta) | 🆕 **habilidades que tardan en armarse al desplegar** (S) |
| **MorphManager** | Gestiona transformaciones y qué aspectos se quedan o se quitan (media) | 🆕 con Morph (M) |
| **PhysicsManager** | Consultas de solape (cilindro/caja) y rayos (alta) | ✅ equivalente propio |
| **DeployHelper / DeployArea / BlockerUtils** | Colocación válida, expulsión de unidades de zonas bloqueadas (alta) | ◐ (S) |

## 5. Metajuego y servicios

| Pieza | Qué hace (confianza) | ¿Sirve? |
|---|---|---|
| **ClientDungeonManager** | Mazmorras **con calendario**: tiempo hasta que acaba, tiempo de descanso ("downtime") y hasta la siguiente (alta) | 🆕 **mazmorras por temporadas con descanso** (S) |
| **RandomMissionSelector** | Elige misiones al azar entre las disponibles (alta) | ◐ desafío del día; 🆕 **misión sorpresa** (S) |
| **MiniProgressionManager / MiniRarityManager** | Experiencia de mini con **techo de XP** y **mejora de rareza con una moneda** (alta) | 🆕 **mejora de rareza** como segundo eje de progreso (M) |
| **ClientLevelProgressionHelpers** | "Nivel de colección" y rango de niveles de minis, recompensas escaladas por tiempo (media) | 🆕 **nivel de colección** (suma de niveles) con recompensas (S-M) |
| **PlayerProgressionManager (210 métodos)** | Nivel de jugador, tutorial ("FTUE"), bonificaciones de recompensa, permisos (alta) | ◐ ya tenemos nivel y tutorial corto |
| **CommonPvpMatchmakingLogic** | **Cubos de emparejamiento y cálculo de MMR y su ajuste** por partida (alta) | ◐ trofeos. 🆕 **MMR con cubos** para los fantasmas del servidor (S) |
| **SeasonalEventTimingHelpers** | Calendarios con periodo, **vista previa de próximos eventos**, refresco diario, filtros por isla (alta) | ✅ calendario. 🆕 **vista previa y refresco diario** (S) |
| **Warchest / Raid / Guilds / Leaderboards / ActivityTracker** | Pase con puntos de gremio, incursiones, gremios, clasificaciones, rastreador de actividad (alta) | ✅ pase y ranking. Resto: servicio real (XL) |
| **SignedTicket / transacciones** | Boletos firmados para validar compras y partidas en el servidor (alta) | 🆕 si algún día hay servidor serio: **validar resultados** (L) |

## 6. Qué haría yo primero

Ordenado por valor para el juego y esfuerzo. Todo con diseño y números propios de KOTA:

| # | Idea | Origen | Esfuerzo | Por qué |
|---|---|---|---|---|
| 1 ✅ | **Campamentos que reaparecen** | CreepCamp | M | Da razón para controlar el mapa durante toda la partida |
| 2 ✅ | **Minas con reserva y recarga** | GoldSourceMineable | M | Hace que el enano minero tenga que moverse y compite por las minas |
| 3 ✅ | **Interruptores de pago, reutilizables y con enfriamiento** | Interactable | S | Convierte la palanca en una decisión de oro |
| 4 ✅ | **Enemigos heroicos con talentos** | MissionUnit | M | La heroica deja de ser solo "más vida" |
| 5 ✅ | **Armadura por tipo de daño** | Armor | M | Más sentido a elegir minis según el enemigo |
| 6 ✅ | **Habilidades con "calentamiento"** | CooldownManager | S | Evita habilidades inmediatas al desplegar |
| 7 ✅ | **Torres/criaturas periódicas** | Periodic | S | Contenido nuevo con casi nada de arte |
| 8 ✅ | **Puntuación por partida** | VictoryInfo | S-M | Ranking más justo que solo ganar/perder |
| 9 ✅ | **Mazmorras por temporadas con descanso** | DungeonManager | S | Rutina semanal sin más contenido |
| 10 ✅ | **Rivales generados por nivel objetivo y MMR con cubos** | ArmyGenerator + Pvp | S | Duelos más parejos con poco trabajo |
| 11 ✅ | **Mutadores de mano: devolver carta, sustituir, quitar** | ArmyBuff* | S | 3 mutadores nuevos baratos |
| 12 ✅ | **Regeneración fuera de combate** | CombatTimer | S | Unidades más resistentes entre peleas |

Lo que **no** merece la pena de momento: posesión y transformación (mucho arte y reglas), gremios/incursiones (requieren servicio real) y todo lo de validación firmada.
