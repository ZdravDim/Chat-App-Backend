// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getFirestore, collection, updateDoc, setDoc, getDoc, getDocs, deleteDoc, doc } from "firebase/firestore"

import dotenv from 'dotenv'
dotenv.config()

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app)

// Function to add a message to Firestore
async function addMessageToFirestore(roomName, messageData) {
	try {
		const messRef = doc(db, "rooms", roomName, "messages", messageData.id)
		await setDoc(messRef, messageData)
	}
	catch (e) {
		console.error("Error adding message to Firestore: ", e)
	}
}

const logInSubmit = async(phoneNumber, password, loginAttempt) => {

	const docRef = doc(db, "users", phoneNumber)
	const docSnap = await getDoc(docRef)

	if (docSnap.exists() && docSnap.data().password === password) {
		if (loginAttempt) console.log("Login successful.")
		return true
	}

	return false

}

const deleteAccount = async(phoneNumber) => {

	await deleteDoc(doc(db, "users", phoneNumber))
	
	console.log('Account with phone: ' + phoneNumber + ' is deleted')
}

const phoneAvailable = async(phoneNumber) => {

	const docRef = doc(db, "users", phoneNumber)
	const docSnap = await getDoc(docRef)
	return !docSnap.exists()
}

export {
	db,
	doc,
	setDoc,
	getDoc,
	updateDoc,
	getDocs,
	deleteDoc,
	collection,
	addMessageToFirestore,
	logInSubmit,
	deleteAccount,
	phoneAvailable
}