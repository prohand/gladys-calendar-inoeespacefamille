// -----------------------------------------------------------------------------
// Entry point of the iNoé Espace Famille calendar integration.
//
// Role of this file: wire the SDK to the sync loop (src/sync.js). It holds NO
// portal logic. It only:
//   1. instantiates the SDK (connection, auth, reconnection: handled for you);
//   2. registers the event handlers BEFORE connect();
//   3. connects, then starts the sync loop.
//
// Environment variables provided by the Gladys supervisor to the container:
//   - GLADYS_HOST_API_URL         (host API URL)
//   - GLADYS_INTEGRATION_TOKEN    (integration-scoped JWT)
//   - GLADYS_INTEGRATION_SELECTOR (integration identifier)
// The SDK reads them automatically: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { syncReport } from './src/messages.js';
import { Sync } from './src/sync.js';

const gladys = new GladysIntegration();
const sync = new Sync(gladys);

// --- "My calendars": a user enabled, disabled or changed their account -------
// Also fired when they flip a calendar's `sync` / `shared` toggle. Lost while
// disconnected: the 'connected' listener below re-reads every account.
gladys.onCalendarAccountUpdated(async (userSelector) => {
  logger.info(`onCalendarAccountUpdated -> syncing user ${userSelector}`);
  await sync.syncUser(userSelector);
});

// --- Manifest actions: buttons in the Configuration screen -------------------
gladys.onAction('sync_now', async () => {
  logger.info('Action sync_now');
  return syncReport(await sync.syncAll());
});

// --- Configuration updated by the administrator ------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated -> new configuration received');
  sync.configure(newConfig);
  // Restart the loop: the interval may have changed, and a longer window
  // must be read now rather than at the next tick.
  sync.start();
});

// --- Connection lifecycle ----------------------------------------------------
// The SDK logs the WebSocket lifecycle itself (under `gladys-sdk`).
gladys.on('connected', async () => {
  try {
    sync.configure(await gladys.getConfig());
    sync.start();
  } catch (err) {
    logger.error('Post-connection initialization failed', err);
    await gladys
      .setConnectionStatus(false, {
        en: 'Initialization failed, check the integration logs.',
        fr: "L'initialisation a échoué, consultez les journaux de l'intégration.",
        de: 'Die Initialisierung ist fehlgeschlagen, sehen Sie in den Protokollen der Integration nach.',
        es: 'La inicialización falló, consulte los registros de la integración.',
      })
      .catch(() => {});
  }
});

gladys.on('disconnected', () => {
  sync.stop();
});

// --- Graceful shutdown -------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  sync.stop();
});

// An unexpected rejection is logged, never fatal: the next sync retries.
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', err);
});

// --- Startup -----------------------------------------------------------------
logger.info('Starting the iNoé Espace Famille calendar integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
