import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`Connected to MongoDB: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("Error connecting to MongoDB", error);
  }
};

export default connectDB;
