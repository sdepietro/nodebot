const wppconnect = require('@wppconnect-team/wppconnect');
const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config.json");
const crypto = require('crypto');
const dayjs = require('dayjs');

process.title = "tratando de que funcione";
global.client = null;

const app = express();
const port = process.env.PORT || config.port;

app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const listenMessage = (client) => {
    // Por ahora no hace nada
};

const start = (client) => {
    global.client = client;
    listenMessage(client);
    console.log("[WPP] Cliente iniciado correctamente");
};

const configEvenNode = {
    session: 'default', // 🚨 Esto asegura que la sesión se persista
    catchQR: true,
    headless: true,
    browserArgs: ['--no-sandbox'],
};

// Función para iniciar o reiniciar el cliente
const initClient = async () => {
    console.log("[WPP] Iniciando cliente...");
    try {
        const client = await wppconnect.create(configEvenNode);
        start(client);
    } catch (error) {
        console.error("[WPP] Error al iniciar cliente:", error);
    }
};

// Llama la primera vez
initClient();

// Rutas de tu app
const chatRoute = require("./components/chatting");
const groupRoute = require("./components/group");
const authRoute = require("./components/auth");
const contactRoute = require("./components/contact");

app.use(function (req, res, next) {
    console.log(req.method + " : " + req.path);
    next();
});
app.use("/chat", chatRoute);
app.use("/group", groupRoute);
// app.use("/auth", authRoute);
app.use("/contact", contactRoute);

// ✅ Endpoint: Estado actual
app.get("/status", async (req, res) => {
    if (!global.client) return res.json({ status: "disconnected" });

    try {
        const info = await global.client.getHostDevice();
        return res.json({ status: "connected", info });
    } catch (error) {
        return res.json({ status: "error", message: error.message });
    }
});

// ✅ Endpoint: Reiniciar cliente manualmente
app.get("/restart", async (req, res) => {
    const { token } = req.query;
    const today = dayjs().format('YYYYMMDD');
    const expectedHash = crypto.createHash('md5').update(`woopi${today}`).digest('hex');

    if (!token || token !== expectedHash) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    try {
        if (global.client) {
            const browser = global.client.getBrowser?.();
            await global.client.close();
            if (browser && typeof browser.close === 'function') {
                await browser.close();
            }
            global.client = null;
        }
    } catch (e) {
        console.error("[WPP] Error al cerrar cliente:", e.message);
    }

    await initClient();
    res.json({ restarted: true });
});

app.listen(port, () => {
    console.log("Server Running Live on Port : " + port);
});
