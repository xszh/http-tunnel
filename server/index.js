import express from "express";
import SocketIO from "socket.io";
import http from "http";
import ss from "socket.io-stream";
import compression from "compression";
import { v4 as uuidv4 } from "uuid";
const app = express();
const server = http.createServer(app);
const logger = {
  info: console.log,
  debug: console.log,
  warn: console.warn,
  error: console.error,
};

const io = SocketIO(server);

const socketMap = new Map();
io.on("connection", (socket) => {
  const { uid } = socket.handshake.query;
  logger.info(`[${socket.id}] as [${uid}] connected`);
  socketMap.set(uid || socket.id, socket);
  socket.on("disconnect", (reason) => {
    logger.info(`[${socket.id}] as [${uid}] disconnected since ${reason}`);
  });
});

io.on("error", (err) => {
  logger.error(err);
});

app.use(compression());
app.use("/", (req, res) => {
  const tunnelHost = req.headers['tunnel-host'];
  const tunnelHosts = tunnelHost.split('.');
  if (tunnelHosts.length !== 4) {
    res.end("Invslid host name");
    return;
  }
  const uid = tunnelHosts[0];
  const { method, originalUrl, headers } = req;
  logger.info(`Incomming client: [${uid}]`);
  logger.info(req.originalUrl);
  if (socketMap.has(uid)) {
    const stream = ss.createStream();
    const uuid = uuidv4();
    ss(socketMap.get(uid)).emit("req", stream, {
      uuid,
      method,
      url: originalUrl,
      headers,
    });
    req.pipe(stream);
    ss(socketMap.get(uid)).once(`res-${uuid}`, (stream, data, callback) => {
      for (const key in data.headers) {
        let val = data.headers[key];
        res.setHeader(key, val);
      }
      res.status(data.status);
      stream.pipe(res);
    });
  } else {
    res.end(`Client [${uid}] not connected`);
    logger.warn(`Client [${uid}] not connected`);
  }
});

server.listen(38888, () => {
  console.log("Tunnel server listen on 38888");
});
