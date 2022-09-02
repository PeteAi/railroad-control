const WebSocket = require('ws');
const amqp = require('amqplib/callback_api');
const {WebSocketServer} = require("ws");

let publish_channel;
let wss;


function createConnection() {
    console.log("[amqp] connecting to amqp");
    amqp.connect('amqp://admin:admin@moba.local:5672', (err, conn) => {
        //if (err) throw err;
        console.log("[amqp] connection established");

        conn.on("error", (err) => {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });

        conn.on("close", () => {
            console.log("[amqp] reconnecting...");
            return setTimeout(createConnection, 1000)
        });

        conn.createChannel((err, p_channel) => {
            if (err) throw err;
            publish_channel = p_channel;
            publish_channel.assertQueue('java_queue', {durable: true});
        });

        conn.createChannel((err, subscribe_channel) => {
            if (err) throw err;
            const node_queue = 'node_queue'
            subscribe_channel.assertQueue(node_queue, {durable: true});

            subscribe_channel.consume(node_queue, (amqp_msg) => {
                if (amqp_msg !== null) {
                    let msg = JSON.parse(amqp_msg.content);

                    subscribe_channel.ack(amqp_msg);
                    if (msg.task === "switch") {
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(msg));
                            }
                        });
                        console.log("[ws] send switch command")
                        return;
                    }
                    if (msg.hasOwnProperty('all_parts')) {
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(msg));
                            }
                        });
                        console.log("[ws] recv all parts");
                    }
                }
            });
        });
        wss_connect();
        console.log("---------- init finished ----------")
    });

}

function wss_connect() {
    wss = new WebSocketServer({port:8080, host:'192.168.2.168'});
    wss.on('connection', function connection(ws) {
        ws.on('message', function message(msg) {
            console.log(`[ws] recv ${msg}`);
            publish_channel.sendToQueue('java_queue', Buffer.from(msg));
        });
    });
}

createConnection();