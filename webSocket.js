import { addMessageToFirestore } from './Firebase.config.js' // use later
import { Server } from 'socket.io';
import { server } from './httpServer.js';

const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

server.listen(3001, () => {
	console.log('App listening at http://localhost:3001');
});

io.on("connection", (socket) => {
    console.log("connected")
  
    socket.on("message", (data) => {
		console.log("Message received:", data);

		io.emit("message", data); //socket.emit()
    });
  
    socket.on("disconnect", () => {
      console.log("disconnected");
    });
  });