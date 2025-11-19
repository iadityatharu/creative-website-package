import cluster from "cluster";
import os from "os";
import http from "http";
import dotenv from "dotenv";
dotenv.config();
import { AppDataSource } from "./configs/psqlDb.config";
import { createApp } from "./configs/app";
import { Logger } from "./utils/chalk";

const PORT = process.env.SERVER_PORT || 5436;

const numCPUs = os.cpus().length;

const startServer = async () => {
  try {
    Logger.info("Connecting to PostgreSQL...");
    await AppDataSource.initialize();
    Logger.success("Postgres connected successfully");

    const server = http.createServer(createApp());
    server.listen(PORT, () => {
      Logger.info(`Worker ${process.pid} running HTTP server on port ${PORT}`);
    });
  } catch (error: any) {
    Logger.error("Database connection failed: " + error.message);
    if (error?.query) {
      Logger.error(`Failed SQL: ${error.query}`);
    }
    if (error?.parameters) {
      Logger.error(`SQL parameters: ${JSON.stringify(error.parameters)}`);
    }
    process.exit(1);
  }
};

// if (cluster.isPrimary) {
//   Logger.info(`Master ${process.pid} is running`);
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on("exit", (worker, code, signal) => {
//     Logger.error(`Worker ${worker.process.pid} died`);
//     Logger.info("Starting a new worker...");
//     cluster.fork();
//   });
// } else {
startServer();
// }
