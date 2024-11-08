const router = require('express').Router();
const { MessageMedia, Location } = require("whatsapp-web.js");
const request = require('request')
const vuri = require('valid-url');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/*
const mediadownloader = (url, path, callback) => {
    request.head(url, (err, res, body) => {
      request(url)
        .pipe(fs.createWriteStream(path))
        .on('close', callback)
    })
  }
*/

router.post('/sendmessage/:phone', async (req,res) => {
    let phone = req.params.phone;
    let message = req.body.message;

    if (phone == undefined || message == undefined) {
        res.send({ status:"error", message:"please enter valid phone and message" })
    } else {
        /*
        Dejo la anterior implementación de referencia que teníamos con pedroslopez
        client.sendMessage(phone + '@c.us', message).then((response) => {
            if (response.id.fromMe) {
                res.send({ status:'success', message: `Message successfully sent to ${phone}` })
            }
        });
        */
        await client
            .sendText(phone + '@c.us', message)
            .then((result) => {
                // console.log('Result: ', result); //return object success
                res.send({ status:'success', message: `Message successfully sent to ${phone}` })
            })
            .catch((err) => {
                console.error('Error when sending: ', err); //return object error
                res.send({ status:"error", message: err })
            });
    }
});

router.post('/sendimage/:phone', async (req,res) => {
    // var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    const base64regex = /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/]+={0,2}$/;

    let phone = req.params.phone;
    let image = req.body.image;
    let caption = req.body.caption;

    if (phone == undefined || image == undefined) {
        res.send({ status: "error", message: "please enter valid phone and base64/url of image" })
    } else {
        if (base64regex.test(image)) {
            console.log('base64 detected');
            /*
            let media = new MessageMedia('image/png',image);
            client.sendMessage(`${phone}@c.us`, media, { caption: caption || '' }).then((response) => {
                if (response.id.fromMe) {
                    res.send({ status: 'success', message: `MediaMessage successfully sent to ${phone}` })
                }
            });
            */
            await client
                .sendFileFromBase64(
                    `${phone}@c.us`,
                    image,
                    'image',
                    caption
                )
                .then((result) => {
                    console.log('Result: ', result); //return object success
                    res.send({ status:'success', message: `Result: ${JSON.stringify(result)}` })
                })
                .catch((err) => {
                    console.error('Error when sending: ', err); //return object error
                    res.send({ status:"error", message: err })
                });
        } else if (vuri.isWebUri(image)) {
            console.log('base64 not detected');
            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp');
            }

            const imagePath = path.join('./temp', path.basename(image)); // Definir la ruta de la imagen en la carpeta temp

            // Descargar la imagen desde la URL y guardarla en la carpeta temp
            try {
                const response = await axios({
                    method: 'get',
                    url: image,
                    responseType: 'stream'
                });

                const writer = fs.createWriteStream(imagePath);
                response.data.pipe(writer);

                writer.on('finish', async () => {
                    await client
                        .sendImage(
                            `${phone}@c.us`,
                            imagePath,
                            'image',
                            caption
                        )
                        .then((result) => {
                            console.log('Result: ', result); //return object success
                            res.send({ status: 'success', message: `Result: ${JSON.stringify(result)}` });
                        })
                        .catch((err) => {
                            console.error('Error when sending: ', err); //return object error
                            res.send({ status: "error", message: err });
                        });
                });

                writer.on('error', (err) => {
                    console.error('Error when writing file: ', err);
                    res.send({ status: "error", message: err });
                });

            } catch (err) {
                console.error('Error when downloading the image: ', err);
                res.send({ status: "error", message: err });
            }
        } else {
            res.send({ status:'error', message: 'Invalid URL/Base64 Encoded Media' })
        }
    }
});

router.post('/sendpdf/:phone', async (req, res) => {
    const base64regex = /^data:application\/pdf;base64,[A-Za-z0-9+/]+={0,2}$/;

    let phone = req.params.phone;
    let pdf = req.body.pdf;
    let caption = req.body.caption;

    if (phone == undefined || pdf == undefined) {
        res.send({ status: "error", message: "please enter valid phone and base64/url of pdf" });
    } else {
        if (base64regex.test(pdf)) {
            await client
                .sendFileFromBase64(
                    `${phone}@c.us`,
                    pdf,
                    'pdf',
                    caption
                )
                .then((result) => {
                    console.log('Result: ', result); //return object success
                    res.send({ status: 'success', message: `Result: ${JSON.stringify(result)}` });
                })
                .catch((err) => {
                    console.error('Error when sending: ', err); //return object error
                    res.send({ status: "error", message: err });
                });
        } else if (vuri.isWebUri(pdf)) {
            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp');
            }

            const pdfPath = path.join('./temp', path.basename(pdf)); // Definir la ruta del PDF en la carpeta temp

            // Descargar el PDF desde la URL y guardarlo en la carpeta temp
            try {
                const response = await axios({
                    method: 'get',
                    url: pdf,
                    responseType: 'stream'
                });

                const writer = fs.createWriteStream(pdfPath);
                response.data.pipe(writer);

                writer.on('finish', async () => {
                    await client
                        .sendFile(
                            `${phone}@c.us`,
                            pdfPath,
                            'pdf',
                            caption
                        )
                        .then((result) => {
                            console.log('Result: ', result); //return object success
                            res.send({ status: 'success', message: `Result: ${JSON.stringify(result)}` });
                        })
                        .catch((err) => {
                            console.error('Error when sending: ', err); //return object error
                            res.send({ status: "error", message: err });
                        });
                });

                writer.on('error', (err) => {
                    console.error('Error when writing file: ', err);
                    res.send({ status: "error", message: err });
                });

            } catch (err) {
                console.error('Error when downloading the PDF: ', err);
                res.send({ status: "error", message: err });
            }
        } else {
            res.send({ status: 'error', message: 'Invalid URL/Base64 Encoded Media' });
        }
    }
});

router.post('/sendlocation/:phone', async (req, res) => {
    let phone = req.params.phone;
    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    let desc = req.body.description;

    if (phone == undefined || latitude == undefined || longitude == undefined) {
        res.send({ status: "error", message: "please enter valid phone, latitude and longitude" })
    } else {
        try {
            let loc = new Location(latitude, longitude, desc || "");
            client.sendMessage(`${phone}@c.us`, loc).then((response) => {
                if (response.id.fromMe) {
                    res.send({status: 'success', message: `MediaMessage successfully sent to ${phone}`})
                }
            });
        } catch (error) {
            console.log(error);
        }
    }
});

router.get('/getchatbyid/:phone', async (req, res) => {
    let phone = req.params.phone;
    if (phone == undefined) {
        res.send({status:"error",message:"please enter valid phone number"});
    } else {
        client.getChatById(`${phone}@c.us`).then((chat) => {
            res.send({ status:"success", message: chat });
        }).catch(() => {
            console.error("getchaterror")
            res.send({ status: "error", message: "getchaterror" })
        })
    }
});

router.get('/getchats', async (req, res) => {
    client.getChats().then((chats) => {
        res.send({ status: "success", message: chats});
    }).catch(() => {
        res.send({ status: "error",message: "getchatserror" })
    })
});

module.exports = router;
