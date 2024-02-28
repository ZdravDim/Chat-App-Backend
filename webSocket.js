import { addMessageToFirestore, deleteDoc, setDoc, doc, db } from './Firebase.config.js'
import { Server } from 'socket.io';
import { server, getUserData } from './httpServer.js';

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

	const addUserToRoom = async(roomName, phoneNumber) => {
		const userData = { phoneNumber: phoneNumber }
	
		const userRef = doc(db, "rooms", roomName, "users", phoneNumber);
		await setDoc(userRef, userData);

		console.log(phoneNumber + ' joined room: ' + roomName)
		socket.join(roomName)
	}

	function extractSecondPhoneNumber(inputString) {
		const startIndex = inputString.indexOf('+', inputString.indexOf('+') + 1);
		return inputString.slice(startIndex);
	}

	socket.on('join', async(phoneNumber, roomName, createRoom) => {
		
		try {
			if (createRoom) {
				
				const roomData = { 
					roomName: roomName, 
					isPrivateRoom: roomName[0] === '+' 
				}

				let receiverNumber = ""

				if (roomData.isPrivateRoom) {
					receiverNumber = extractSecondPhoneNumber(roomName)
					const userData1 = await getUserData(phoneNumber)
					const userData2 = await getUserData(receiverNumber)

					roomData[phoneNumber] = {
						name: userData1.name,
						surname: userData1.surname
					}
					roomData[receiverNumber] = {
						name: userData2.name,
						surname: userData2.surname
					}
				}

				console.log(roomData)
				await setDoc(doc(db, "rooms", roomName), roomData);

				if (roomData.isPrivateRoom) addUserToRoom(roomName, receiverNumber)
			}

			addUserToRoom(roomName, phoneNumber)
			
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
			
			console.log(phoneNumber + ' left room: ' + roomName)
			socket.leave(roomName)
		}
		catch(error) {
			console.log("Error leaving room: " + error.message)
		}
	})
})
