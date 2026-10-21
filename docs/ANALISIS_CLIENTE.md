# Análisis estructural del cliente de Warcraft Rumble (Ghidra + REA + Il2CppInspectorRedux)

Fecha: 19-oct-2026. Complementa `BRECHA_RUMBLE.md`. Es un **inventario de arquitectura y de sistemas**: nombres de tipos agrupados por área. No se ha copiado código, arte, textos, nombres de personajes ni datos de balance, y nada de esto se usa como asset de KOTA.

## 1. Cómo se obtuvo

| Paso | Resultado |
|---|---|
| Ghidra 12.1.4 vía REA | Arranca y abre `GameAssembly.dll`, pero el análisis automático de 79 MB supera el límite de 5,5 min de REA. Por sí solo no da nombres (IL2CPP) |
| Il2CppDumper 6.7.46 | **Descartado**: el juego usa metadatos IL2CPP **v39**, más nuevos de lo que soporta |
| **Il2CppInspectorRedux 2026.2** (.NET 10) | **Funcionó**: leyó el binario y `global-metadata.dat` v39 y generó los esqueletos C# de **20 073 tipos** (36 MB) |
| Límite | La salida se cortó con un aviso de timeout al final (posible omisión de algún tipo); los recuentos son orientativos. Solo hay firmas y estructura, **no la lógica ni los números de balance** (esos están en datos del servidor y paquetes de contenido) |

El volcado queda fuera del proyecto, en la carpeta temporal de la sesión (`scratchpad/rumble_dump/cs`). No se publica ni se usa.

## 2. Arquitectura que se deduce

- **Ensamblado del juego:** ≈ 6 000 tipos propios agrupados en `Client` (3 520), `Data` (774), `Common` (689), `Protocol` (604) y `FlatBuffer` (253). El resto son librerías (Unity, serialización, inyección de dependencias, telemetría, audio, push/analítica).
- **Simulación compartida cliente/servidor:** el código de combate vive en `Common/Simulation` (188 tipos) y el cliente solo añade *proxies* visuales (`Client/Simulation`, 271). Es decir, **una simulación determinista que el servidor puede reproducir** (hay un módulo de *replay*). Muy relevante: el motor de KOTA ya es determinista por pasos y separado del dibujado, así que un duelo asíncrono validado por servidor sería viable.
- **Modelo de "aspectos" (entidad-componente):** cada unidad, torre o punto del mapa es un objeto al que se le añaden *aspectos* (piezas de comportamiento). Eso explica que el contenido se arme por datos y no por código.
- **Datos de misión por contenido** (`Data/Missions`): una misión es un fichero con equipos, ejército, zonas de despliegue (con bordes "adelgazados" y tipos de casilla), carreteras, caminos de waypoints, props y escenas de props, zonas no transitables, bloqueadores de visión **de un solo sentido**, interruptores con opciones, **grupos de unidades aleatorios**, modificaciones de unidad y de talentos por misión, cámara acotada, información de victoria y de dificultad.

## 3. Catálogo de aspectos (comportamientos de entidad)

Habilidad · animación · armadura · rayo/haz · **trampa a la muerte** · colisión · temporizador de combate · **creep y campamento de creeps** · retraso de despliegue · desactivar captura de punto de interés · objetivo de despliegue forzado · **objetivo (goal)** · **fuente de oro minable** · base ("home") · interactuable · cinemática de intro · vida · **vidas limitadas** · área de despliegue móvil y bloqueador de despliegue · **transformación (morph)** · movimiento · **solo curable** · propietario · **periódico** · **fases** (jefes por fases) · **punto de interés** · **posesión** · **objetivo de atracción** · **sueño** · **sigilo** · **aturdimiento** · interruptor (toggle) · contador de fichas · **torreta** · no adquirible · tooltip, esquema y contorno.

## 4. Mejoras de ejército ("army buffs")

Tipos: oro ganado · modificador de mano · modificador de base · modificador de mini (concreto) · **quitar** mini · **reemplazar** mini · modificador de torre · **coste de uso del mazo**. Es el mecanismo detrás de mutadores, reliquias y mejoras de evento. En KOTA ya existe `mods` (mutadores/reliquias) con ideas equivalentes; faltan "reemplazar/quitar mini" y "coste del mazo".

## 5. Interfaz y modos (por carpeta de UI)

Con su tamaño en tipos: gremios (147) · **PvP** (119) · **eventos de temporada** (84) · cuenta (57) · **incursiones/Raid** (45) · **mazmorras** (37) · **Warchest** (31, pase de recompensas) · celebraciones de mini (22) · ventanas emergentes (17) · elección robusta (15) · perfil (15) · nombres (14) · **mapa del mundo** (12) · **Skull Road** (12, ruta de dificultad creciente) · **lista de misiones** (12) · tienda (8) · **clasificaciones** (8) · mejora del tablero de ejército (6) · **heroicas** (7) · **Arclight Surge** (3, modo de evento) · rastreador de actividad (11) · vista previa de ejército.
Pantallas "glue" (de menú): **Ejército** (inventario de minis con "páginas"/tomos), **Mundo** (mapa), **Tienda**, **Evento** y la de **Misión activa**. HUD de batalla: indicador y medidor de oro, bandeja con **botón "reemplazar mini"**, paneles de equipo y de fase, temporizador, **tiempo extra (Overtime)**, texto flotante de combate, indicadores fuera de pantalla, **selector de señales y de emotes**, latencia y observador.

## 6. Progresión y economía

Gestores de: monedas (virtuales y de dinero real, separadas), progresión de jugador, **progresión de minis por puntos de rareza**, minis equipados, **seguidores** (mini que acompaña al héroe), **talentos equipables**, **pieles**, avatares, emotes, **mazmorras**, **permisos** por contenido, **dificultad adaptativa** (se desbloquea una opción más fácil tras fallar), **boletos firmados** para validar compras y partidas, coordinador de transacciones, selección aleatoria de misión/contenido y **calendarios** (Schedule) para eventos.

## 7. Qué podemos adoptar en KOTA (ideas, por valor / esfuerzo)

| # | Idea | Esfuerzo | Notas |
|---|---|---|---|
| 1 ✅ | **Dificultad adaptativa**: tras 2–3 derrotas seguidas, ofrecer "ayuda" (+energía inicial o −vida enemiga) | S | Retiene a jugadores nuevos; cabe en `mods` |
| 2 ✅ | **Tiempo extra (Overtime)**: al acabar el reloj sin ganador, sudden death con oleadas más rápidas | S | Ya existe `overtime` en el estado; falta activarlo en duelos |
| 3 ✅ | **Botón "reemplazar mini"** de la bandeja (pagar para cambiar una carta de la mano) | S | Usa la cola de rotación que ya hay |
| 4 ◐ | **Aspecto "solo curable", "periódico", "fases" y "posesión"** | M | Fases = jefes con 2–3 formas; encaja con jefes nuevos |
| 5 ✅ | **Interruptores y bloqueadores de visión de un solo sentido** en el mapa | M | Variedad táctica sin arte nuevo |
| 6 ✅ | **Grupos de unidades aleatorios** en campamentos | S | Rejugabilidad |
| 7 ✅ | **Selector de señales** (pings) y **emotes** en duelo | S–M | Casi sin arte: iconos |
| 8 ✅ | **Skull Road** = nuestra Mazmorra con dificultad por escalones y recompensas más grandes | M | Ya tenemos la base |
| 9 | **Mejoras de ejército por slot** (tablero con ranuras mejorables) | M | Mini-meta nueva |
| 10 | **Seguidor** (una mini que acompaña al héroe) y **mini "heroica"** | M | Extiende héroes |
| 11 | **Puntos de rareza por mini** (progresión por copias) en vez de monedas planas | M | Cambia la economía: decidir antes |
| 12 ✅ | **Heroicas** (versión difícil de misiones ya superadas con premio extra) | S | Reutiliza contenido |
| 13 | **Replay validado** de duelos (guardar semilla + órdenes) | L | Base del PvP asíncrono con servidor |
| 14 | **Raid** cooperativo, **gremios** | XL | Requiere servicio real |

## 8. Aviso legal y de uso

Esto describe **cómo está organizado** un juego de este género, no cómo está hecho el de Blizzard. Cada punto de §7 se implementaría con diseño, nombres y arte propios de KOTA. El volcado de tipos no debe redistribuirse.
