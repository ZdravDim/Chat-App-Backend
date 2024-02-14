import express, { json } from 'express';
import http from 'http';
import { logInSubmit } from './Firebase.config.js';
import cors from 'cors';
import cookieParser from "cookie-parser";
import jwt from 'jsonwebtoken';

const jwt_key = "aasgdyakk"
const jwtExpirySeconds = 20

const app = express();

const server = http.createServer(app);

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.post('/login', function (req, res) {

    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) return res.status(400).send('Missing phoneNumber or password');
    
    const logInSuccess = logInSubmit(req.body.phoneNumber, req.body.password)

    if (logInSuccess) {

        newCookie(res, phoneNumber)
        res.status(200)
        res.send()

    } else {

        res.status(401)
        res.send()
    }
});

app.get('/logout', function(req, res) {
    
    emptyCookie(res)
    res.status(200)
    res.send()
})

app.get('/auth', function(req, res) {

    const token = req.cookies.jwt
    
    try {

        const decoded_payload = verifyToken(token)

        return res.status(200).send({ status: "logged-in", token: token })

    } catch(error) {

        if (error.name === 'TokenExpiredError') {

            const expired_payload = jwt.decode(token)
            new_token = newCookie(res, expired_payload["phoneNumber"])
            return res.status(200).send({ status: "logged-in", token: new_token })

        }

        return res.status(401).send({ status: "logged-out" })
    }
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// verifies jwt
const verifyToken = (token) => {
    return jwt.verify(token, jwt_key)
}

// sets new cookie that stores empty jwt
const emptyCookie = (res) => {
    res.cookie('jwt', null, {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'None',
        secure: true
    });
}

// sets new cookie that stores new valid jwt
const newCookie = (res, phoneNumber) => {

    const token = jwt.sign({
        phoneNumber,
        createdAt: Date.now() // to ensure every token is unique
    }, jwt_key, {
        algorithm: "HS256",
        expiresIn: jwtExpirySeconds,
    })

    res.cookie('jwt', token, {httpOnly: true, sameSite: 'None', secure: true,  maxAge: jwtExpirySeconds * 1000})

    console.log('New token: ', token)
    return token
}

export {
    server,
    verifyToken
}