import { addMessageToFirestore, deleteDoc, getDoc, collection, getDocs, updateDoc, setDoc, doc, db } from './Firebase.config.js'
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

	const addUserToRoom = async(roomName, phoneNumber, isReciever) => {
	
		let userRef = doc(db, "rooms", roomName, "users", phoneNumber)
		const userDoc = await getDoc(userRef)

		let flag = false

		if (!userDoc.exists()) {

			flag = true
			const userData = { phoneNumber: phoneNumber }
			await setDoc(userRef, userData)

			// update user, add room
			userRef = doc(db, "users", phoneNumber)

			let joinedRooms = (await getDoc(userRef)).data().joinedRooms

			await updateDoc((userRef), {
				joinedRooms: [...joinedRooms, roomName]
			})
		}

		console.log(phoneNumber + ' joined room: ' + roomName)
		socket.join(roomName)
		if (flag) await joinOrLeaveMessage(roomName, phoneNumber, true, isReciever)
	}

	const extractSecondPhoneNumber = (inputString) => {
		const startIndex = inputString.indexOf('+', inputString.indexOf('+') + 1)
		return inputString.slice(startIndex)
	}

	const joinOrLeaveMessage = async(roomName, phoneNumber, joinMessage, isReciever) => {

		const messageData = {
			phoneNumber: phoneNumber,
			type: joinMessage ? "joined" : "left",
			id: uuidv4(),
			timestamp: Date.now()
		}

		await sendMessageToRoom(roomName, messageData)
		await addMessageToFirestore(roomName, messageData)
		
		if (roomName[0] === '+' && joinMessage && isReciever) io.emit('update-rooms', phoneNumber, roomName)
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
					
					console.log("Receiver number: " + receiverNumber)

					const userRef = doc(db, "users", receiverNumber)
					const userDoc = await getDoc(userRef)

					const requestArray = userDoc.data().incomingRequests

					await updateDoc(userRef, {
						incomingRequests: [roomName, ...requestArray]
					})
				}

				await setDoc(doc(db, "rooms", roomName), roomData)

				if (roomData.isPrivateRoom) await addUserToRoom(roomName, receiverNumber, true)
			}

			await addUserToRoom(roomName, phoneNumber, false)
			
		}
		catch(error) {
			console.log("Error joining room: " + error.message)
		}
	})
	
	socket.on('leave', async(phoneNumber, roomName, leaveFromFirebase) => {
		try {

			if (leaveFromFirebase) {

				let userRef = doc(db, "rooms", roomName, "users", phoneNumber)
				await deleteDoc(userRef)

				await joinOrLeaveMessage(roomName, phoneNumber, false, false)

				let querySnapshot = await getDocs(collection(db, "rooms", roomName, "users"))

				if (querySnapshot.empty) {
					
					querySnapshot = await getDocs(collection(db, "rooms", roomName, "messages"))

					const deletePromises = []
					querySnapshot.forEach((document) => {
						deletePromises.push(deleteDoc(document.ref))
					})
					
					await Promise.all(deletePromises)
					await deleteDoc(doc(db, "rooms", roomName))
				}

				// update user, remove room
				userRef = doc(db, "users", phoneNumber)

				let joinedRooms = (await getDoc(userRef)).data().joinedRooms

				await updateDoc((userRef), {
					joinedRooms: joinedRooms.filter(elem => elem !== roomName)
				})

				console.log(phoneNumber + ' left room: ' + roomName)
				socket.leave(roomName)
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
