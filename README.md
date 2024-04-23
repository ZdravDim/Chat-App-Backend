# Chat App Backend

- Custom backend for Chat App Front
- Http + WebSocket Server
- Containerized app

## Technologies

- Express.js + Firestore
- Socket.IO
- Docker

## Installation

> [!NOTE]
> Project depends on Firebase configuration, which is set in environment variables, so in order to start up the project by cloning, you need to setup you own Firebase project and put configuration in .env file

- Use the `git clone https://github.com/ZdravDim/Chat-App-Backend.git` command to clone the project and then `npm install` to install dependencies.

### Only Backend ( requires you to set up a Firebase project )

- Run `npm start` to start the project, it will run on http://localhost:8080

### Frontend and Backend ( doesn't require you to set up a Firebase project )

- Install [Docker](https://www.docker.com/products/docker-desktop)
- Download https://github.com/ZdravDim/Chat-App-Front-Web/blob/main/docker-compose.yaml
- Use the `cd` command to navigate to folder containing downloaded file
- Then run `docker-compose up`
- Frontend will run on http://localhost:80
- Backend will run on http://localhost:8080
