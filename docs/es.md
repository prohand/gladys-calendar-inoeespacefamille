# iNoé Espace Famille – Agenda para Gladys

Esta integración lleva las **reservas de sus hijos** en su **iNoé Espace Famille** (el portal
familiar de AIGA que usan muchos municipios y centros franceses: comedor, extraescolar, centro
de ocio, guardería) al **calendario de Gladys**.

- Un **calendario por niño** («Léa – iNoé»).
- Un **evento de día completo** por día reservado, con todas las franjas del día:
  «Léa – Accueil de loisirs : Matin, Repas, Après-midi».
- Una ausencia o una plaza en lista de espera no es un día reservado.
- Una reserva cancelada en el portal desaparece del calendario en la siguiente sincronización.
- Los días pasados se quedan en el calendario.

El portal da las franjas (mañana, comida, tarde…), no sus horas: los eventos duran todo el día.

La integración **solo lee**: nunca reserva, cancela ni paga nada. Es una integración **en la
nube**: se comunica con los servidores de AIGA por Internet.

Se necesita Gladys 5.3 o posterior.

> Esta integración completa la integración **iNoé Espace Famille** (facturas, un dispositivo por
> niño, disparadores de escena), que sigue siendo necesaria para todo lo que no es el
> calendario. Ambas pueden instalarse juntas.

## Instalación (administrador)

En Gladys, abra **Integraciones** e instale **iNoé Espace Famille – Agenda**. La pantalla de
configuración tiene tres ajustes, comunes a todos los usuarios:

| Campo                          | Clave             | Qué poner                                                                                                  |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Intervalo de sincronización    | `refresh_minutes` | Cada cuántos minutos se lee el portal (60 por defecto, de 15 a 1440).                                      |
| Días publicados por adelantado | `days_ahead`      | Cuántos días de la planificación de cada niño van al calendario, hoy incluido (31 por defecto, de 7 a 92). |
| Zona horaria                   | `timezone`        | Lo que decide qué es «hoy»: `Europe/Paris` por defecto, `Indian/Reunion`, `America/Martinique`…            |

El botón **Sincronizar ahora** (`sync_now`) lee de inmediato el portal de cada usuario y da,
para cada uno, el centro y el número de días reservados por niño.

## Activar sus calendarios (cada usuario)

Cada usuario de Gladys que quiera los calendarios lo hace **para sí mismo**, en el bloque
**Mis calendarios** de la página de la integración:

| Campo                | Qué poner                                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dirección del portal | La dirección de la página de inicio de sesión del portal, pegada tal cual: `https://espacefamille.aiga.fr/index.html?dossier=1626256#connexion…` o `https://espacefamille.aiga.fr/11578177`. El número solo también sirve. |
| Correo electrónico   | El correo con el que inicia sesión en el portal.                                                                                                                                                                           |
| Contraseña           | La contraseña del portal. Solo se envía al servidor de inicio de sesión de AIGA y nunca se escribe en los registros.                                                                                                       |

Luego pulse **Activar**. Los calendarios aparecen tras la primera lectura (unos segundos).

> **¿Dónde está la dirección del portal?** En el correo de creación de cuenta de su centro, o en
> la barra de direcciones del navegador en el portal: el número después de `dossier=` (o después
> de `espacefamille.aiga.fr/`).

Dos interruptores de cada calendario le pertenecen:

- **Sincronizar**: apagado, el calendario se vacía y deja de actualizarse. Encendido de nuevo,
  se llena en la siguiente sincronización.
- **Compartir**: un calendario empieza **privado**. Compartido, el hogar lo ve, y llega a las
  **escenas** (el disparador de calendario de Gladys, `calendar.event-is-coming`, y las acciones
  de calendario) y al asistente.

Desactivar la integración en **Mis calendarios** elimina sus calendarios iNoé de Gladys.

Un niño que ya no está en la cuenta del portal pierde su calendario. Una lectura del portal sin
ningún niño no elimina nada.

## Ideas de escenas

- El disparador de calendario de Gladys (`calendar.event-is-coming`) en el calendario compartido
  «Léa – iNoé», la víspera por la tarde: enviar por Telegram el nombre del evento
  («Léa – Périscolaire : Cantine»).
- Preguntar al asistente: «¿Qué tiene Léa mañana?»

## Solución de problemas

La pantalla de configuración muestra, para cada usuario cuya sincronización falló, su nombre y
la causa:

| Mensaje                                          | Qué hacer                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| «por completar en «Mis calendarios»»             | El usuario completa su cuenta en **Mis calendarios**.                                           |
| «iNoé no reconoce esta dirección de portal»      | Copie de nuevo la dirección del correo del centro.                                              |
| «el portal rechazó el correo o la contraseña»    | Inicie sesión en el propio portal; si la contraseña cambió, actualícela en **Mis calendarios**. |
| «el portal iNoé está en mantenimiento»           | Nada que hacer: se reintentará en la próxima sincronización.                                    |
| «Gladys rechazó la actualización del calendario» | Consulte los registros de la integración.                                                       |

Si la planificación de un niño no se puede leer, sus eventos ya en el calendario se quedan;
**Sincronizar ahora** muestra «planificación ilegible» para ese niño.

El portal no tiene API pública: la integración usa los mismos intercambios que el sitio web. Si
AIGA cambia su sitio, puede ser necesaria una actualización de la integración.

## Privacidad

- Solo se leen los usuarios que activaron la integración, cada uno con su propia cuenta.
- La contraseña solo se envía a `ism.aiga.fr` (el servidor de inicio de sesión de AIGA).
- No se envía nada a otro sitio que a los servidores de AIGA y a su Gladys. La integración no
  escribe nada en disco.
