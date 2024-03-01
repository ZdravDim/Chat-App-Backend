import { addMessageToFirestore, deleteDoc, getDoc, updateDoc, setDoc, doc, db } from './Firebase.config.js'
import { Server } from 'socket.io'
import { server, getUserData } from './httpServer.js'

import { v4 as uuidv4 } from 'uuid'

const io = new Server(server, { cors: { origin: "http://localhost:3000" } })

server.listen(3001, () => {
	console.log('App listening at http://localhost:3001')
})

io.on("connection", (socket) => {

    console.log(socket.id + " connected")

	socket.on('message-to-room', async(messageData) => {
		messageData.id = uuidv4()
		messageData.timestamp = Date.now()
		console.log('Message to room: ' + messageData.roomName + " -> " + messageData.messageBody)
		await sendMessageToRoom(messageData.roomName, messageData)
		await addMessageToFirestore(messageData.roomName, messageData)
	})

    socket.on("disconnect", () => {
      console.log(socket.id + " disconnected")
    })

	const sendMessageToRoom = async(roomName, messageData) => {
		
		io.to(roomName).emit('message', messageData)
		
		const roomRef = doc(db, "rooms", roomName)

		await updateDoc(roomRef, {
			latestTimestamp: messageData.timestamp
		})
	}

	const addUserToRoom = async(roomName, phoneNumber) => {
	
		const userRef = doc(db, "rooms", roomName, "users", phoneNumber)
		const userDoc = await getDoc(userRef)

		let flag = false

		if (!userDoc.exists()) {

			flag = true
			const userData = { phoneNumber: phoneNumber }
			await setDoc(userRef, userData)
		}

		console.log(phoneNumber + ' joined room: ' + roomName)
		socket.join(roomName)
		if (flag) await joinOrLeaveMessage(roomName, phoneNumber, true)
	}

	const extractSecondPhoneNumber = (inputString) => {
		const startIndex = inputString.indexOf('+', inputString.indexOf('+') + 1)
		return inputString.slice(startIndex)
	}

	const joinOrLeaveMessage = async(roomName, phoneNumber, joinMessage) => {

		const messageData = {
			phoneNumber: phoneNumber,
			type: joinMessage ? "joined" : "left",
			id: uuidv4(),
			timestamp: Date.now()
		}

		await sendMessageToRoom(roomName, messageData)
		await addMessageToFirestore(roomName, messageData)
		
	}

	socket.on('join', async(phoneNumber, roomName, createRoom) => {
		
		try {
			if (createRoom) {
				
				const roomData = { 
					roomName: roomName, 
					isPrivateRoom: roomName[0] === '+',
					latestTimestamp: 0
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

				await setDoc(doc(db, "rooms", roomName), roomData)

				if (roomData.isPrivateRoom) await addUserToRoom(roomName, receiverNumber)
			}

			await addUserToRoom(roomName, phoneNumber)
			
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
				socket.leave(roomName)
				await joinOrLeaveMessage(roomName, phoneNumber, false)
				return
			}
			
			console.log(phoneNumber + ' left room: ' + roomName)
			socket.leave(roomName)
		}
		catch(error) {
			console.log("Error leaving room: " + error.message)
		}
	})
})
