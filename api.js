const express = require('express');
const bodyParser = require('body-parser');
const wppconnect = require('@wppconnect-team/wppconnect');
const config = require('./config.json');

process.title = 'tratando de que funcione';
global.client = null;
let isRestarting = false;

const app = express();
const port = process.env.PORT || config.port;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const configEvenNode = {
  session: 'default',
  autoClose: false,
  catchQR: false,
  headless: true,
  browserArgs: ['--no-sandbox'],
};

// 🔁 Cliente
const startClient = async () => {
  try {
    console.log('[WPP] Iniciando cliente...');
    const client = await wppconnect.create(configEvenNode);
    setupClientHandlers(client);
    global.client = client;
  } catch (error) {
    console.error('[WPP] Error al iniciar cliente:', error);
    setTimeout(startClient, 10000); // retry
  }
};

const setupClientHandlers = (client) => {
  client.onStateChange((state) => {
    console.log('[WPP] Estado:', state);
    const badStates = ['CONFLICT', 'UNLAUNCHED', 'UNPAIRED', 'UNPAIRED_IDLE'];
    if (badStates.includes(state) && !isRestarting) {
      restartClient(`Estado conflictivo: ${state}`);
    }
  });

  client.onLogout(() => {
    console.warn('[WPP] Logout detectado');
    restartClient('Se deslogueó el cliente');
  });

  listenMessage(client); // Tu lógica de mensajes
};

const restartClient = async (reason) => {
  if (isRestarting) return;
  isRestarting = true;
  console.warn('[WPP] Reinicio por:', reason);

  try {
    if (global.client) {
      const browser = global.client.getBrowser?.();
      await global.client.close();
      global.client = null;

      if (browser && typeof browser.close === 'function') {
        await browser.close();
        console.log('[WPP] Puppeteer cerrado');
      }
    }
  } catch (err) {
    console.error('[WPP] Error al cerrar Puppeteer:', err);
  } finally {
    isRestarting = false;
    setTimeout(startClient, 1000);
  }
};

// 🧪 Keep-alive cada 30 min
setInterval(() => {
  if (global.client?.getHostDevice) {
    global.client.getHostDevice().catch((err) => {
      console.warn('[WPP] Keep-alive error:', err.message);
    });
  }
}, 1000 * 60 * 30);

// 🛠️ Seguridad ante errores globales
process.on('unhandledRejection', (reason) => {
  console.error('[WPP] Unhandled Rejection:', reason);
  restartClient('Unhandled Rejection');
});

// Endpoints útiles
app.get('/status', async (req, res) => {
  if (!global.client) return res.json({ status: 'disconnected' });
  try {
    const info = await global.client.getHostDevice();
    return res.json({ status: 'connected', info });
  } catch (e) {
    return res.json({ status: 'error', message: e.message });
  }
});

app.post('/restart', async (req, res) => {
  restartClient('Reinicio manual');
  res.json({ restarting: true });
});

// Rutas
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.path);
  next();
});

app.use('/chat', require('./components/chatting'));
app.use('/group', require('./components/group'));
app.use('/contact', require('./components/contact'));

// Inicio
app.listen(port, () => {
  console.log('[SERVER] Live en puerto:', port);
});

startClient();
