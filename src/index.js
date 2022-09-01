import express from "express";
import { validateUser, validateMessage } from "./validator.js";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
dotenv.config();

const server = express();
server.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017");
const usersCollection = mongoClient.db("test").collection("participants");
/* const removeInactiveUser = () => {
  users = users.filter((user) => Date.now() - user.lastStatus <= 10);
};

setInterval(removeInactiveUser, 10000); */

server.post("/participants", async (req, res) => {
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
  try {
    await mongoClient.connect();
    const participant = { ...user, lastStatus: Date.now() };
    await usersCollection.insertOne(participant);
    res.sendStatus(201);
    mongoClient.close();
  } catch (error) {
    res.sendStatus(422);
    mongoClient.close();
  }
});

server.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    const users = await usersCollection.find().toArray();
    res.status(200).send(users);
    mongoClient.close();
  } catch (error) {
    res.sendStatus(500);
    mongoClient.close();
  }
});

server.post("/messages", async (req, res) => {
  const currentTime = new Date().toLocaleTimeString("en-GB");
  const { error } = validateMessage(req.body);
  const { user } = req.headers;

  if (error || !user) {
    return res.sendStatus(422);
  }
  try {
    await mongoClient.connect();
    const messageCollection = mongoClient.db("test").collection("messages");
    const message = { ...req.body, from: user, time: currentTime };
    await messageCollection.insertOne(message);
    res.sendStatus(201);
    mongoClient.close();
  } catch (error) {
    res.sendStatus(422);
    mongoClient.close();
  }
});

server.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;
  try {
    await mongoClient.connect();
    const messageCollection = mongoClient.db("test").collection("messages");
    const messages = await messageCollection.find().toArray();
    const allowedMessages = messages.filter(
      (value) =>
        value.to === user || value.from === user || value.type === "message"
    );
    if (limit) {
      return res.status(200).send(allowedMessages.slice(-limit));
    }
    res.status(200).send(allowedMessages.reverse());
    mongoClient.close();
  } catch (error) {
    res.sendStatus(500);
    mongoClient.close();
  }
});

server.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    await mongoClient.connect();
    const users = await usersCollection.find().toArray();
    const activeUser = users.find((value) => value.name === user);
    if (!activeUser) {
      return res.sendStatus(404);
    }

    await usersCollection.updateOne(
      { _id: activeUser._id },
      { $set: { lastStatus: Date.now() } }
    );
    return res.sendStatus(200);
  } catch (error) {
    return res.sendStatus(500);
  }
});
server.listen(5000, () => {
  console.log("listening on 5000");
});
