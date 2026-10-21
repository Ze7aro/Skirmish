# Qué le falta a KOTA para sentirse como un Rumble completo

Informe del 18-oct-2026. Es un **inventario de sistemas y de estructura de contenido**, no una copia: no se ha extraído código, arte, textos,
nombres de personajes ni tablas de datos. Todo lo que se construya sigue siendo contenido original de KOTA.

## 1. Cómo se obtuvo (y sus límites)

- **REA** abrió `GameAssembly.dll` (PE x64), pero **no pudo analizarlo en este equipo**: sus motores profundos (Ghidra, Hopper, IDA) no están
  configurados (`GHIDRA_INSTALL_DIR` sin definir; Hopper solo existe en macOS) y rechaza el formato de `global-metadata.dat`. Tampoco abre carpetas
  que no sean aplicaciones JavaScript. Para activarlo haría falta instalar Ghidra 12.1 + Java y configurar la variable; incluso así, los nombres de
  los sistemas del juego están en los metadatos de IL2CPP, no en el binario.
- **Lo que sí se hizo:** leer los nombres de tipos/métodos de `global-metadata.dat` (≈210 000 identificadores únicos) y contar cuántos pertenecen a
  cada área funcional, más el recuento de paquetes de contenido por categoría en `Data/StreamingAssets/Bundles`.
- **Límite importante:** el número de identificadores es una *señal del tamaño relativo* de cada área, no una medida exacta. Además es solo el cliente:
  la lógica de servidor (cuentas, emparejamiento, economía real, antitrampas) no está ahí.

## 2. Inventario por área (tamaño relativo)

| Área | Identificadores | Qué indica |
|---|---:|---|
| Cuenta / servidor / telemetría | 4 093 | Es un servicio online: sesiones, permisos, grupos A/B, cohortes |
| Tienda y economía | 2 819 | Ofertas limitadas, paquetes, varias monedas, insignias de "nuevo" |
| Cofres y recompensas | 1 911 | Cofres de guerra, pistas de actividad, páginas de recompensa |
| Social | 1 514 | Gremios, amigos, chat, invitaciones, clasificaciones, emotes |
| Progresión y desafíos | 1 324 | Desafíos con categorías y secuencias, hitos, logros |
| PvP / clasificatoria | 853 | Emparejamiento, partidas personalizadas, rango, recompensas de colocación |
| Cosméticos | 794 | Aspectos (skins), emotes, estatuas |
| Mazmorra | 390 | Secuencias de niveles, licencias, recompensas |
| Talentos | 389 | Talentos por mini, conjuntos, talentos propios |
| Incursiones | 325 | Secuencias con vista previa, estado local |
| Eventos de temporada | 294 | Isla de eventos, recompensas por evento |
| Mapa: objetivos y POI | 207 | Zonas de despliegue, campamentos, puntos de captura, objetivos, disparadores |
| Combate: estados | 176 | Ver lista abajo |
| Tutorial / FTUE | 122 | Experiencias guiadas con pausa, secuencias y condiciones |
| Combate: habilidades | 74 | Habilidades con cargas, canalización, proyectiles encadenados |
| Mutadores | 63 | Cambian el equipo/mejoras del ejército |

**Contenido (paquetes en disco):** ≈ 460 misiones y ≈ 200 paquetes de datos de misión, 29 zonas, ≈ 270 paquetes de datos de unidades (minis, líderes,
enemigos y jefes), ≈ 300 de talentos, ≈ 95 de botín de mazmorra, ≈ 45 de mutadores, ≈ 30 de eventos de temporada, ≈ 70 de cosméticos y ≈ 120 de estatuas.
Para comparar: KOTA tiene 10 misiones, 5 zonas, 18 minis (14 con arte), 6 héroes, 5 jefes, ≈ 90 opciones de talento, 5 mutadores, 10 reliquias y 5 eventos.

**Sistemas de combate presentes** (nombres genéricos): estados de aturdimiento, silencio, desgarro de armadura (sunder), provocación, sigilo, sueño,
furia, parpadeo (blink), espejismo (copias), transformación, posesión, empujar / atraer, "trampa a la muerte", inmunidades, canalización, rayo y
proyectil encadenado, torres neutrales especiales, bandera/captura de puntos, fuentes de oro minables y estáticas, vidas limitadas, patrulla y
deambular de neutrales, objetivos (metas), disparadores por zonas, objetivo de despliegue forzado, intros con cinemática.

## 3. Cobertura actual de KOTA

✔ = hecho · ◐ = parcial · ✗ = falta

| Sistema | KOTA | Nota |
|---|:-:|---|
| Carriles, despliegue en zona, energía, mano de cartas que rota | ✔ | |
| Minas de oro + minero | ✔ | Un solo tipo de fuente (minable) |
| Campamentos neutrales con sueño y correa | ✔ | Sin patrulla ni deambular |
| Héroes con habilidad activa | ✔ | 4 de 6 con arte |
| Jefes con habilidades | ✔ | 5, 12 habilidades |
| Talentos por carta | ✔ | 20 plantillas; no hay talentos exclusivos de cada mini |
| Mutadores | ✔ | 5 |
| Mazmorra con botín | ✔ | |
| Eventos de temporada | ◐ | Rotan en local; sin isla de eventos ni recompensas propias |
| Misiones diarias, XP, cofres | ✔ | |
| Tutorial | ◐ | 3 avisos; sin misiones guiadas |
| Estados de combate | ✔ (Fase A) · antes: ◐ | Hay: aturdir, ralentizar, furia, escudo, armadura, sigilo, sueño. Faltan: silencio, desgarro, empujar/atraer, parpadeo, espejismo, transformación, posesión, trampa a la muerte, canalización, rayo encadenado |
| Habilidades activas de las minis | ✔ | 14 cartas, automáticas (Fase A) |
| Torre neutral capturable | ✔ | Fase A |
| Puntos de captura con bandera, cofres en el mapa | ✗ | El cofre solo se gana al final |
| Objetivos de misión variados (defender, matar objetivo, capturar N…) | ✗ | Todas las misiones son "destruir la base" |
| Disparadores / eventos de mapa guionizados | ✗ | |
| Mapas más grandes que una pantalla | ✗ | |
| PvP / clasificatoria | ✗ | Solo existe contra oleadas de IA |
| Incursiones, gremios, amigos, chat, clasificaciones | ✗ | Requieren servidor |
| Tienda, ofertas, varias monedas, pase de temporada | ✗ | |
| Cosméticos (aspectos, emotes, estatuas) | ✗ | |
| Logros | ✗ | |
| Cuentas y guardado en la nube | ✗ | Todo es local (`localStorage`) |
| Volumen de contenido (cientos de misiones, ~100 minis) | ✗ | Cuello de botella: arte |

## 4. Hoja de ruta propuesta

Esfuerzo: **S** ≈ medio día · **M** ≈ 1-2 días · **L** ≈ varios días · **XL** necesita servidor/otro equipo.

### Fase A — Profundidad de combate ✅ HECHA (ver biblia §11)
1. **Más estados** ✅ (silencio, desgarro, empujar/atraer, parpadeo, segunda oportunidad, rayo encadenado). Original: silencio (bloquea habilidades), desgarro (baja armadura), empujar/atraer, trampa a la muerte, rayo encadenado. Se añaden como rasgos de ficha y como habilidades de jefe.
2. **Habilidades activas en minis** ✅ (14 cartas, automáticas): algunas cartas con habilidad propia con enfriamiento (se lanzan solas con IA simple o con un toque). Hay que decidir cuáles y revisar sus fichas.
3. **Torre neutral capturable** ✅: al despejar su campamento pasa a ser tuya y dispara. Reutiliza campamentos y torres.
4. **Neutrales con patrulla y deambular** ✅.

### Fase B — Variedad de misión ✅ HECHA (ver biblia §12)
5. ✅ **Objetivos distintos** (M): defender N segundos, derrotar a un objetivo, capturar 2 puntos, sobrevivir con vidas limitadas. Cambia la condición de victoria y las 3 estrellas.
6. ✅ **Cofres e interactuables en el mapa** (S–M) y **disparadores** sencillos (emboscada al capturar, refuerzos al abrir un cofre) (M).
7. ✅ **Más zonas y misiones** (L): el generador ya reparte terrenos y enemigos; hay arte para 5 terrenos, así que cada zona nueva es contenido de datos.

### Fase C — Metajuego sin servidor ✅ HECHA (ver biblia §13)
8. ✅ **Duelo contra rival simulado** (L): una "PvP sin servidor": un mazo rival juega con las mismas reglas de energía y despliega minis. Es lo que más se parece al corazón de Rumble sin infraestructura.
9. ✅ **Logros** (M), **tienda con ofertas diarias en monedas del juego** (M) y **pase de temporada gratuito** que usa el XP (M).
10. ✅ **Calendario de eventos** con recompensas propias (M).

### Fase D — Depende de arte o de servidor (hecho lo que se puede por código: ver biblia §14)
11. ⏳ **Más minis, héroes y jefes con arte propio** (XL, arte; encargo listo en docs/ENCARGO_ARTE.md): hoy son 14 minis listas, faltan 4 para las 18 y 2 héroes.
12. ✅ **Cosméticos** (aspectos, emotes) (L, arte).
13. ◐ **Cuentas, nube, ranking y rivales fantasma** ✅ (servidor opcional). Pendiente: emparejamiento simultáneo, gremios, amigos e incursiones.

### Lo que no se va a replicar
Nombres, personajes, textos, música, arte ni datos de otros juegos. Y la economía de pago de un juego en servicio (ofertas con dinero real) queda fuera.
