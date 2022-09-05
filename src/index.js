import express from "express";
import { validateUser, validateMessage } from "./validator.js";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { stripHtml } from "string-strip-html";
import cors from "cors";
dotenv.config();

const server = express();
server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
const usersCollection = mongoClient.db("test").collection("participants");
const messageCollection = mongoClient.db("test").collection("messages");
const currentTime = new Date().toLocaleTimeString("en-GB");

const stringSanitazing = (string) => {
  let sanitized = stripHtml(string).result;
  return sanitized.trim();
};

const removeInactiveUser = async () => {
  await mongoClient.connect();
  const users = await usersCollection.find().toArray();
  for (let i = 0; i < users.length; i++) {
    if (Date.now() - users[i].lastStatus >= 10000) {
      await usersCollection.deleteOne({ name: users[i].name });
      await messageCollection.insertOne({
        from: users[i].name,
        to: "Todos",
        text: "sai da sala",
        type: "status",
        time: currentTime,
      });
    }
  }
};

setInterval(removeInactiveUser, 15000);

server.post("/participants", async (req, res) => {
  const user = req.body;
  const { error } = validateUser(user);
  const name = stringSanitazing(user.name);
  console.log(name);
  if (error) {
    return res.sendStatus(422);
  }

  try {
    await mongoClient.connect();
    const participant = { ...user, lastStatus: Date.now() };
    const users = await usersCollection.find().toArray();
    const isDuplicate = users.find((value) => value.name === name);
    if (isDuplicate) {
      return res.sendStatus(409);
    }
    await usersCollection.insertOne(participant);
    await messageCollection.insertOne({
      from: name,
      to: "Todos",
      text: "Entra na sala",
      type: "status",
      time: currentTime,
    });
    res.sendStatus(201);
  } catch (err) {
    res.sendStatus(422);
  } finally {
    mongoClient.close();
  }
});

server.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    const users = await usersCollection.find().toArray();
    res.status(200).send(users);
  } catch (error) {
    res.sendStatus(500);
  } finally {
    mongoClient.close();
  }
});

server.post("/messages", async (req, res) => {
  const { error } = validateMessage(req.body);
  const { user } = req.headers;
  const { text } = req.body;

  if (error || !user) {
    return res.sendStatus(422);
  }

  try {
    await mongoClient.connect();
    const message = {
      ...req.body,
      text: stringSanitazing(text),
      from: stringSanitazing(user),
      time: currentTime,
    };
    await messageCollection.insertOne(message);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(422);
  } finally {
    mongoClient.close();
  }
});

server.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;
  try {
    await mongoClient.connect();
    const messages = await messageCollection.find().toArray();
    const allowedMessages = messages.filter(
      (value) =>
        value.to === user || value.from === user || value.type === "message"
    );
    if (limit) {
      return res.status(200).send(allowedMessages.slice(-limit));
    }
    res.status(200).send(allowedMessages.reverse());
  } catch (error) {
    res.sendStatus(500);
  } finally {
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
  } finally {
    mongoClient.close();
  }
});

server.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { user } = req.headers;

  try {
    await mongoClient.connect();
    const messages = await messageCollection.find().toArray();
    const isExistingMessage = messages.find((message) =>
      message._id.equals(ObjectId(id))
    );
    const isMessageFromUser = messages.find((message) => message.from === user);

    if (!isExistingMessage) {
      return res.sendStatus(404);
    }
    if (!isMessageFromUser) {
      return res.sendStatus(401);
    }

    await messageCollection.deleteOne({ _id: ObjectId(id) });
    return res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  } finally {
    mongoClient.close();
  }
});

server.put("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { user } = req.headers;
  const { error } = validateMessage(req.body);
  if (error) {
    return res.sendStatus(422);
  }
  try {
    await mongoClient.connect();
    const message = await messageCollection.findOne({ _id: ObjectId(id) });
    if (!message) {
      return res.sendStatus(404);
    }
    if (user !== message.from) {
      return res.sendStatus(401);
    }
    await messageCollection.updateOne(message, { $set: req.body });
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  } finally {
    mongoClient.close();
  }
});
server.listen(process.env.PORT, () => {
  console.log(`listening on ${process.env.PORT}`);
});
