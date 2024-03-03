// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getFirestore, collection, updateDoc, setDoc, getDoc, getDocs, deleteDoc, doc } from "firebase/firestore"

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
const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app)

// Function to add a message to Firestore
async function addMessageToFirestore(roomName, messageData) {
	try {
		const messRef = doc(db, "rooms", roomName, "messages", messageData.id);
		await setDoc(messRef, messageData);
	}
	catch (e) {
		console.error("Error adding message to Firestore: ", e)
	}
}

const logInSubmit = async(phoneNumber, password, loginAttempt) => {

	const docRef = doc(db, "users", phoneNumber);
	const docSnap = await getDoc(docRef);

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

	const docRef = doc(db, "users", phoneNumber);
	const docSnap = await getDoc(docRef);
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