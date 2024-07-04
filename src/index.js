import express from "express";
import 'dotenv/config'
import connectDB from "./db/index.js";

const app = express();

connectDB();
