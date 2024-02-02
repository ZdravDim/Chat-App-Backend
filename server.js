const WebSocket = require('ws');
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

    outbound = JSON.stringify({
        type: 1,
        id: id
    });
    sendToAll(outbound);
    console.log(metadata);

    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);
        const metadata = clients.get(ws);

        message.type = 0;
        message.sender = metadata.id;
        message.color = metadata.color;

        const outbound = JSON.stringify(message);
        sendToAll(outbound);

        console.log(message.sender + ": " + message.text);
    });

    ws.on("close", () => {
        leftId = clients.get(ws).id;
        outbound = JSON.stringify({
            type: 2,
            id: leftId
        });

        sendToAll(outbound);

        clients.delete(ws);
      });
})

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

function sendToAll(message) {
    [...clients.keys()].forEach((client) => {
        client.send(message);
    });
}