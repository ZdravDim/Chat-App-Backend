import { addMessageToFirestore, deleteDoc, setDoc, doc, db } from './Firebase.config.js'
import { Server } from 'socket.io';
import { server } from './httpServer.js';

const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

server.listen(3001, () => {
	console.log('App listening at http://localhost:3001');
});

io.on("connection", (socket) => {

    console.log(socket.id + " connected")
  
    socket.on("message", (data) => {
		// console.log("Message received:", data);
		// io.emit("message", data);
    });

	socket.on('message-to-room', (data) => {
		console.log('Message to room: ' + data.roomName + " -> " + data.message)
		io.to(data.roomName).emit('message', data)
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
	
	socket.on('leave', async(phoneNumber, roomName) => {
		try {
			const userRef = doc(db, "rooms", roomName, "users", phoneNumber)
			await deleteDoc(userRef)
			console.log(socket.id + ' left room: ' + roomName)
			socket.leave(roomName)
		}
		catch(error) {
			console.log(error.message)
		}
	})
})
