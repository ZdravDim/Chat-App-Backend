const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { json } = require('express');
const wss = new WebSocket.Server({ port: 3001 });

const clients = new Map();

/*
- message codes:
0 - standard message
1 - joined chat
2 - left chat
*/

wss.on('connection', (ws) => {
    const id = uuidv4();
    const color = Math.floor(Math.random() * 360);
    const metadata = { id, color };

    clients.set(ws, metadata);

    message = {
        type: 1,
        id: id
    };
    sendToAll(ws, message);
    console.log(metadata);

    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);
        const metadata = clients.get(ws);

        message["type"] = 0;
        message["sender"] = metadata["id"];
        message["color"] = metadata["color"];

        sendToAll(ws, message);

        console.log(message["sender"] + ": " + message["text"]);
    });

    ws.on("close", () => {
        leftId = clients.get(ws)["id"];
        
        message = {
            type: 2,
            id: leftId
        };

        sendToAll(ws, message);

        clients.delete(ws);
      });
})

//sends a message to everyone subscribed to the channel
function sendToAll(ws, message) {
    senderId = clients.get(ws)["id"];
    message["time"] = (new Date()).getTime();
    
    outbound = JSON.stringify(message);

    [...clients.keys()].forEach((client) => {
        if (clients.get(client)["id"] != senderId) client.send(outbound);
        else if (message["type"] == 0) { // only if it's standard message add attribute "sameUser", and set it to true
            toSender = message
            toSender["sameUser"] = true;
            client.send(JSON.stringify(toSender));
        }
    });
}