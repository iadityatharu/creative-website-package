import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path = require("path");
dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: [path.join(__dirname, "..", "entities", "**", "*.{js,ts}")],
});
