# Chat App Backend

- Custom backend for Chat App Front
- Http + WebSocket Server
- Containerized app

## Technologies

- Express.js + Firestore
- Socket.IO
- Docker

## Installation

- Use the `git clone https://github.com/ZdravDim/Chat-App-Backend.git` command to clone the project and then `npm install` to install dependencies.

## Starting up the project

### Both frontend and backend

- Install [Docker](https://www.docker.com/products/docker-desktop)
- Download https://github.com/ZdravDim/Chat-App-Front-Web/blob/main/docker-compose.yaml
- Use the `cd` command to navigate to folder containing downloaded file
- Then run `docker-compose up`
- Frontend will run on http://localhost:443
- Backend will run on http://localhost:8080

### Backend only

- Run `npm start` to start the project, it will run on http://localhost:8080
