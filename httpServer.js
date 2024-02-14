import express, { json } from 'express';
import http from 'http';
import { logInSubmit } from './Firebase.config.js';
import cors from 'cors';
import cookieParser from "cookie-parser";
import jwt from 'jsonwebtoken';

const jwt_key = "aasgdyakk"
const jwtExpirySeconds = 10
const oneDay = 24 * 60 * 60 * 1000 // in miliseconds

const app = express();

const server = http.createServer(app);

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.post('/api/login', function (req, res) {

    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) return res.status(400).send('Missing phoneNumber or password');
    
    const logInSuccess = logInSubmit(req.body.phoneNumber, req.body.password)

    if (logInSuccess) {
        newCookie(res, phoneNumber)
        return res.status(200).send()
    }

    return res.status(401).send()
    
});

app.get('/api/logout', function(req, res) {
    
    emptyCookie(res)
    return res.status(200).send()
})

app.post('/api/auth', function(req, res) {

    const access_token = req.cookies.access_token
    const refresh_token = req.cookies.refresh_token
    
    try {

        verifyToken(access_token)
        console.log("valid")
        return res.status(200).send()

    } catch(error) {

        if (!access_token) {
            try {
                const token_payload = verifyToken(refresh_token)

                // generate access token based on given refresh token
                const now = Date.now()
                token_payload.iat = now
                token_payload.exp = now + jwtExpirySeconds * 1000
                const access_token = jwt.sign({ token_payload }, jwt_key);
                res.cookie('access_token', access_token, {httpOnly: true, sameSite: 'None', secure: true,  maxAge: jwtExpirySeconds * 1000})

                return res.status(200).send()
                
            }
            catch (error) { return res.status(401).send() }
        }
        
        console.log("bad")
        return res.status(401).send()
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

    res.cookie('access_token', null, {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'None',
        secure: true
    });

    res.cookie('refresh_token', null, {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'None',
        secure: true
    });

}

// sets new cookie that stores new valid jwt
const newCookie = (res, phoneNumber) => {

    const now = Date.now()

    const token_payload = {
        sub: phoneNumber,
        iat: now,
        exp: now + jwtExpirySeconds * 1000
    }

    const access_token = jwt.sign(token_payload, jwt_key)

    token_payload.exp += oneDay

    const refresh_token = jwt.sign(token_payload, jwt_key)

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