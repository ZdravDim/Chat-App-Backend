import { addMessageToFirestore, deleteDoc, setDoc, doc, db } from './Firebase.config.js'
import { Server } from 'socket.io';
import { server } from './httpServer.js';

import { v4 as uuidv4 } from 'uuid'

const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

server.listen(3001, () => {
	console.log('App listening at http://localhost:3001');
});

io.on("connection", (socket) => {

    console.log(socket.id + " connected")
  
    socket.on("message", (messageData) => {
		//...
    });

	socket.on('message-to-room', (messageData) => {
		messageData.id = uuidv4()
		messageData.timestamp = Date.now()
		console.log('Message to room: ' + messageData.roomName + " -> " + messageData.messageBody)
		io.to(messageData.roomName).emit('message', messageData)
		addMessageToFirestore(messageData.roomName, messageData)
	})

    socket.on("disconnect", () => {
      console.log(socket.id + " disconnected");
    });

	socket.on('join', async(phoneNumber, roomName, createRoom) => {
		
		try {
			if (createRoom) {
				const roomData = { roomName: roomName }
				await setDoc(doc(db, "rooms", roomName), roomData);
			}
			
			const userData = { phoneNumber: phoneNumber }
	
			const userRef = doc(db, "rooms", roomName, "users", phoneNumber);
			await setDoc(userRef, userData);
	
			console.log(socket.id + ' joined room: ' + roomName)
			socket.join(roomName)
		}
		catch(error) {
			console.log("Error joining room: " + error.message)
		}
	})
	
	socket.on('leave', async(phoneNumber, roomName, leaveFromFirebase) => {
		try {

			if (leaveFromFirebase) {
				const userRef = doc(db, "rooms", roomName, "users", phoneNumber)
				await deleteDoc(userRef)
			}
			
			console.log(socket.id + ' left room: ' + roomName)
			socket.leave(roomName)
		}
		catch(error) {
			console.log("Error leaving room: " + error.message)
		}
	})
})
