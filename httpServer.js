import express from 'express';
import http from 'http';

const app = express();
const server = http.createServer(app);

app.get('/', function (req, res) {
    res.send('hello world')
  });
  
export default server