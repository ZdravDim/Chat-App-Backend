// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA11_Orf7gStDculreYJlSbrD4ZVPhY9bQ",
  authDomain: "chatapp-4d642.firebaseapp.com",
  projectId: "chatapp-4d642",
  storageBucket: "chatapp-4d642.appspot.com",
  messagingSenderId: "711280795297",
  appId: "1:711280795297:web:e1e9099de3d24df9bc1ae0",
  measurementId: "G-H6FXF5V2JN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

import { WebSocketServer as Server } from 'ws';
import { v4 as uuidv4 } from 'uuid';
const wss = new Server({ port: 3001 });

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

    const message = {
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
        const leftId = clients.get(ws)["id"];
        
        const message = {
            type: 2,
            id: leftId
        };

        sendToAll(ws, message);

        clients.delete(ws);
      });
})

// sends a message to everyone subscribed to the channel
function sendToAll(ws, message) {
    const senderId = clients.get(ws)["id"];
    message["time"] = (new Date()).getTime();
    
    const outbound = JSON.stringify(message);

    [...clients.keys()].forEach((client) => {
        if (clients.get(client)["id"] != senderId) client.send(outbound);
        else if (message["type"] == 0) { // only if it's standard message add attribute "sameUser", and set it to true
            let toSender = message
            toSender["sameUser"] = true;
            client.send(JSON.stringify(toSender));
        }
    });

    addMessageToFirestore(message);
}

// Function to add a message to Firestore
async function addMessageToFirestore(message) {
    try {
      const docRef = await addDoc(collection(db, "messages"), message);
      console.log("Message written with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding message to Firestore: ", e);
    }
  }