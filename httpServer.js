import express from 'express'
import http from 'http'
import { logInSubmit, deleteAccount, collection, setDoc, getDoc, getDocs, doc, db, phoneAvailable, updateDoc } from './Firebase.config.js'
import cors from 'cors'
import cookieParser from "cookie-parser"
import jwt from 'jsonwebtoken'

const JWT_KEY = process.env.JWT_KEY
const jwtExpirySeconds = 300
const oneDay = 24 * 60 * 60 * 1000 // in miliseconds

const app = express()

const server = http.createServer(app)

app.use(cors({ origin: "https://zdravdim.github.io", credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.post('/api/phone-available', async function(req, res) {

    const phoneNumber = req.body.phoneNumber
    
    try {
        const available = await phoneAvailable(phoneNumber)
        if (available) return res.status(200).send()
        return res.status(409).send()
    }
    catch(error) {
        console.log("Error checking if phone is available: " + error.message)
        return res.status(500).send("Error checking if phone is available: " + error.message)
    }

})

app.post('/api/sign-up', async function(req, res) {

    let userData = req.body
    userData.incomingRequests = []
    userData.joinedRooms = []
    userData.userColor = '#' + Math.floor(Math.random() * 16777215).toString(16)
    const phoneNumber = userData.phoneNumber

    try {
        await setDoc(doc(db, "users", phoneNumber), userData)
        return res.status(200).send()
    }
    catch(error) {
        console.log("Error signing-up: " + error.message)
        return res.status(500).send("Error signing-up: " + error.message)
    }
})

app.post('/api/login', async function (req, res) {

    const { phoneNumber, password } = req.body
    if (!phoneNumber || !password) return res.status(400).send('Missing phoneNumber or password')
    
    const logInSuccess = await logInSubmit(req.body.phoneNumber, req.body.password, true)

    if (logInSuccess) {
        newCookie(res, phoneNumber)
        return res.status(200).send()
    }

    return res.status(401).send()
    
})

app.get('/api/logout', function(req, res) {

    emptyCookie(res)
    return res.status(200).send()
})

app.delete('/api/delete-account', async function(req, res) {
    
    const phoneNumber = authenticateUser(req, res)

    if (phoneNumber) {
        
        try {
            await deleteAccount(phoneNumber)
            emptyCookie(res)
            return res.status(200).send()
        }
        catch(error) {
            console.log("Error deleting account with number " + phoneNumber + ": " + error.message)
            return res.status(500).send("Error deleting account with number " + phoneNumber + ": " + error.message)
        }

    }

    return res.status(409).send()
})

app.post('/api/auth', function(req, res) {

    if (authenticateUser(req, res)) return res.status(200).send()
    return res.status(409).send()

})

app.post('/api/user-data', async function(req, res) {

    const phoneNumber = authenticateUser(req, res)

    if (phoneNumber) {

        const userData = await getUserData(phoneNumber)
        return res.status(200).send(userData)

    }

    return res.status(409).send()
})

app.post('/api/room-messages', async function(req, res) { 

    if (authenticateUser(req, res)) {

        try {

            const roomName = req.body.roomName
            let messagesArray = []

            const querySnapshot = await getDocs(collection(db, "rooms", roomName, "messages"))
            querySnapshot.forEach((message) => { messagesArray.push(message.data()) })
        
            return res.status(200).send({ messagesArray : messagesArray })

        }
        catch(error) {
            return res.status(500).send()
        }

    }

    return res.status(409).send()
})

app.post('/api/user-exists', async function(req, res) {
    if (authenticateUser(req, res)) {

        try {

            const phoneNumber = req.body.phoneNumber
            
            const docRef = doc(db, "users", phoneNumber)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) return res.status(200).send({"userExists": true})
            
            return res.status(200).send({"userExists": false})

        }
        catch(error) {
            console.log("Error checking if user exists: " + error.message)
            return res.status(500).send()
        }

    }

    return res.status(409).send()
})

app.post('/api/user-rooms', async function(req, res) {

    const phoneNumber = authenticateUser(req, res)

    if (phoneNumber) {

        try {

            let roomsArray = []
            const promises = []

            const querySnapshot = await getDocs(collection(db, "rooms"))

            querySnapshot.forEach(async(document) => {

                const userDocRef = doc(db, "rooms", document.id, "users", phoneNumber)

                promises.push(getDoc(userDocRef).then((userSnapshot) => {
                    if (userSnapshot.exists()) {
                        roomsArray.push(document.data())
                    }
                }))

            })

            await Promise.all(promises)

            return res.status(200).send({ rooms: roomsArray })

        }
        catch(error) {
            console.log("Error reading rooms for user " + phoneNumber + ": " + error.message)
            return res.status(500).send("Error reading rooms for user " + phoneNumber + ": " + error.message)
        }
    }

    return res.status(409).send()
})

app.post('/api/accept-request', async function(req, res) {
    
    if (authenticateUser(req, res)) {
        
        const phoneNumber = req.body.phoneNumber
        const roomName = req.body.roomName

        try {

            const userRef = doc(db, "users", phoneNumber)
            const userDoc = await getDoc(userRef)

            const requestArray = userDoc.data().incomingRequests

            await updateDoc(userRef, {
                incomingRequests: requestArray.filter(elem => elem !== roomName)
            })

            return res.status(200).send()
        }
        catch(error) {
            console.log("Error accepting request: " + error.message)
            return res.status(500).send("Error accepting request: " + error.message)
        }

    }

    return res.status(409).send()
})

app.post('/api/room-exists', async function(req, res) {

    if (authenticateUser(req, res)) {

        try {

            const roomName = req.body.roomName
            const phoneNumber = req.body.phoneNumber

            console.log("Check if room exists for user: " + roomName + " (" + phoneNumber + ")")

            const docRef = doc(db, "rooms", roomName)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
                
                const userRef = doc(db, "rooms", roomName, "users", phoneNumber)
                const userDoc = await getDoc(userRef)

                return res.status(200).send({ roomExists: true, userIsJoined: userDoc.exists() })
            }

            return res.status(200).send({ roomExists: false })

        }
        catch(error) {
            console.log("Error checking if " + roomName + " exists: " + error.message)
            return res.status(500).send("Error checking if " + roomName + " exists: " + error.message)
        }
    }

    return res.status(409)
})

app.post('/api/private-room-exists', async function(req, res) {

    if (authenticateUser(req, res)) {

        try {

            const phoneNumber1 = req.body.phoneNumber1
            const phoneNumber2 = req.body.phoneNumber2

            let data1 = await getUserData(phoneNumber1)
            let data2 = await getUserData(phoneNumber2)
            delete data1["userColor"]
            delete data2["userColor"]

            let roomName = phoneNumber1 + phoneNumber2
            console.log("Check if private room exists: " + roomName)

            let docRef = doc(db, "rooms", roomName)
            let docSnap = await getDoc(docRef)

            if (docSnap.exists()) return checkPrivateRoomUsers(data1, data2, roomName, res)
            
            roomName = phoneNumber2 + phoneNumber1
            console.log("Check if private room exists: " + roomName)

            docRef = doc(db, "rooms", roomName)
            docSnap = await getDoc(docRef)

            if (docSnap.exists()) return checkPrivateRoomUsers(data1, data2, roomName, res)
            
            return res.status(200).send({
                roomExists: false,
                user1: data1,
                user2: data2
            })

        }
        catch(error) { 
            console.log("Error checking if " + roomName + " exists: " + error.message)
            return res.status(500).send()
        }
    }

    return res.status(409)
})

app.post('/api/change-color', async function(req, res) {

    if (authenticateUser(req, res)) {

        try {
            const userRef = doc(db, "users", req.body.phoneNumber)
            await updateDoc(userRef, {
                userColor: req.body.userColor
            })
            return res.status(200).send()
        }
        catch(error) {
            console.log("Error changing color: " + error.message)
            return res.status(500).send("Error changing color: " + error.message)
        }

    }
    return res.status(409).send()
})

app.post('/api/reset-password', async function(req, res) { 

    if (authenticateUser(req, res)) {

        try {

            const logInSuccess = await logInSubmit(req.body.phoneNumber, req.body.oldPassword, false)

            if (logInSuccess) {
                const userRef = doc(db, "users", req.body.phoneNumber)
                await updateDoc(userRef, { password: req.body.newPassword })
                return res.status(200).send({ success: true })
            } 

            return res.status(200).send({ success: false })

        }
        catch(error) {
            console.log("Error reseting password: " + error.message)
            return res.status(500).send()
        }

    }

    return res.status(409).send()
})

const checkPrivateRoomUsers = async(data1, data2, roomName, res) => {

    data1.joined = false
    data2.joined = false

    const querySnapshot = await getDocs(collection(db, "rooms", roomName, "users"))

    querySnapshot.forEach((document) => {
        switch(document.id) {
            case data1.phoneNumber:
                data1.joined = true
                break
            case data2.phoneNumber:
                data2.joined = true
                break
            default:
                console.log('Invalid document.id: ' + document.id)
        }
    })

    return res.status(200).send({
        roomExists: true,
        roomName: roomName,
        user1: data1,
        user2: data2
    })
}

// returns user data
export const getUserData = async(phoneNumber) => {
    console.log("Get user data for: " + phoneNumber)

    const docRef = doc(db, "users", phoneNumber)
    const docSnap = await getDoc(docRef)

    const userData = docSnap.data()
    delete userData["password"]
    
    return userData
}

// returns user phone number if authentication is successful
const authenticateUser = (req, res) => {

    const access_token = req.cookies.access_token
    const refresh_token = req.cookies.refresh_token
    
    try {

        const token_payload = verifyToken(access_token)
        console.log("Access token is valid (" + token_payload.sub + ")")
        return token_payload.sub

    } catch(error) {

        if (!access_token) {
            try {
                console.log("Generated new access token using refresh token")
                const token_payload = verifyToken(refresh_token)

                // generate access token based on given refresh token
                const now = Date.now()
                token_payload.iat = now
                token_payload.exp = now + jwtExpirySeconds * 1000
                const access_token = jwt.sign(token_payload, JWT_KEY)
                res.cookie('access_token', access_token, {httpOnly: true, sameSite: 'None', secure: true,  maxAge: jwtExpirySeconds * 1000})
                return token_payload.sub
            }
            catch (error) { return null }
        }
        
        console.log("User not authenticated")
        return null
    }
}

// verifies jwt
const verifyToken = (token) => {
    return jwt.verify(token, JWT_KEY)
}

// sets new cookie that stores empty jwt
const emptyCookie = (res) => {

    res.cookie('access_token', null, {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'None',
        secure: true
    })

    res.cookie('refresh_token', null, {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'None',
        secure: true
    })

}

// sets new cookie that stores new valid jwt
const newCookie = (res, phoneNumber) => {

    const now = Date.now()

    const token_payload = {
        sub: phoneNumber,
        iat: now,
        exp: now + jwtExpirySeconds * 1000
    }

    const access_token = jwt.sign(token_payload, JWT_KEY)

    token_payload.exp += oneDay

    const refresh_token = jwt.sign(token_payload, JWT_KEY)

    res.cookie('access_token', access_token, {httpOnly: true, sameSite: 'None', secure: true,  maxAge: jwtExpirySeconds * 1000})
    res.cookie('refresh_token', refresh_token, {httpOnly: true, sameSite: 'None', secure: true,  maxAge: oneDay})

    console.log('New tokens: ')
    console.log('Access: ', access_token)
    console.log('Refresh: ', refresh_token)

    return access_token
}

export {
    server,
    verifyToken
}