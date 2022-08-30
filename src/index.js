import express from "express";

const server = express();

server.listen(5000, () => {
  console.log("listening on 5000");
});
