// Supports ES6
// import { create, Whatsapp } from '@wppconnect-team/wppconnect';
const wppconnect = require('@wppconnect-team/wppconnect');

const express = require("express");
const bodyParser = require("body-parser");

const config = require("./config.json");

process.title = "tratando de que funcione";
global.client = null; // "aca metes el cliente de wppconnect para que siga funcionando en el resto de la app"

const app = express();

const port = process.env.PORT || config.port;
//Set Request Size Limit 50 MB
app.use(bodyParser.json({ limit: "50mb" }));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const start = (client) => {
    global.client = client;

    listenMessage(client);
}

const listenMessage = (client) => {
}

const configEvenNode = {
    browserArgs: [
        '--no-sandbox',
    ]
}

wppconnect
    // .create()
    .create(configEvenNode)
    .then((client) => start(client))
    .catch((error) => console.log(error));


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
// app.use("/auth", authRoute); // no se usa más esto. ahora el QR se imprime en consola y se inicia sesión desde ahí
app.use("/contact", contactRoute);

app.listen(port, () => {
    console.log("Server Running Live on Port : " + port);
});
