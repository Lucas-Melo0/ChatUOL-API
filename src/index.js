import express from "express";
import { validateUser, validateMessage } from "./validator.js";
const server = express();
server.use(express.json());

const users = [];
const messages = [];

server.post("/participants", (req, res) => {
  const user = req.body;
  const { error } = validateUser(user);
  const { name } = user;
  const isDuplicate = users.find((value) => value.name === name);
  if (error) {
    return res.sendStatus(422);
  }
  if (isDuplicate) {
    return res.sendStatus(409);
  }

  users.push({ ...user, lastStatus: Date.now() });
  console.log(users);
  res.sendStatus(201);
});

server.get("/participants", (req, res) => {
  res.send(users);
});

server.post("/messages", (req, res) => {
  const currentTime = new Date().toLocaleTimeString("en-GB");
  const message = req.body;
  const { error } = validateMessage(message);
  const { user } = req.headers;

  if (error || !user) {
    return res.sendStatus(422);
  }

  messages.push({ ...message, from: user, time: currentTime });

  return res.sendStatus(200);
});

server.get("/messages", (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;
  const allowedMessages = messages.filter(
    (value) =>
      value.to === user || value.from === user || value.type === "message"
  );
  if (limit) {
    return res.status(200).send(allowedMessages.slice(-limit));
  }
  return res.status(200).send(allowedMessages.reverse());
});

server.post("/status", (req, res) => {
  const { user } = req.headers;
  const activeUser = users.find((value) => value.name === user);
  if (!activeUser) {
    return res.sendStatus(404);
  }
  activeUser.lastStatus = Date.now();
  res.send("OK");
});
server.listen(5000, () => {
  console.log("listening on 5000");
});
