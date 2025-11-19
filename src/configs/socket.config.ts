import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { Logger } from "../utils/chalk";

let io: Server;

export const initSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket: Socket) => {
    Logger.info(`🔌 Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      Logger.info(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized!");
  return io;
};
