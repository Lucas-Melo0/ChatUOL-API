import express from "express";
import { validateUser } from "./validator.js";
const server = express();
server.use(express.json());

const users = [];

server.post("/participants", (req, res) => {
  const user = req.body;
  const { error } = validateUser(user);
  const { name } = user;
  const isDuplicate = users.find((value) => value.name === name);
  if (error) {
    return res.sendStatus(422);
  }
  if (isDuplicate !== undefined) {
    return res.sendStatus(409);
  }

  users.push({ ...user, lastStatus: Date.now() });
  console.log(users);
  res.sendStatus(201);
});

server.listen(5000, () => {
  console.log("listening on 5000");
});
