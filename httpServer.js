import express from 'express';
import http from 'http';
import { logInSubmit } from './Firebase.config.js';
import cors from 'cors';
import cookieParser from "cookie-parser";

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
        res.cookie('jwt', 'asdfasdf.asdfasdfasdf.asdfasdf', {httpOnly: true, sameSite: 'None', secure: true}) // change logic to sign jwt
        res.status(200)
        res.send()
    } else {
        res.status(401)
        res.send()
    }
});

app.get('/logout', function(req, res) {
    
    res.cookie('jwt', null, {
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'None',
        secure: true
      });
    res.status(200)
    res.send()
})

app.get('/status', function(req, res) {
    
    const jwt = req.cookies.jwt
    console.log('jwt: ', jwt)
    res.status(200)
    if (jwt != null) return res.send({ status: "logged-in" }) // change logic to verify jwt
    res.send({ status: "logged-out" })
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default server