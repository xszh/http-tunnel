import SocketIOClient from "socket.io-client";
import ss from "socket.io-stream";
import http from "http";
import config from "./config";

const logger = {
  info: console.log,
  debug: console.log,
  warn: console.warn,
  error: console.error,
};

const io = SocketIOClient(config.server, {
  query: {
    uid: config.uid,
  },
});

ss(io).on("req", (stream, data) => {
  const req = http.request({
    hostname: config.local,
    port: config.port,
    path: data.url,
    headers: data.headers,
    method: data.method,
  }, res => {
    const headers = res.headers;
    const status = res.statusCode;
    const resStream = ss.createStream();
    ss(io).emit(`res-${data.uuid}`, resStream, {
      status,
      headers
    });
    res.pipe(resStream);
  });
  stream.pipe(req);
});
