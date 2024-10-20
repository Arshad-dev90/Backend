import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error-middleware.js";
//import routes
import healthcheckRouter from "./routes/healthcehck-route.js";
import userRouter from "./routes/user-routes.js";
import tweetRouter from "./routes/tweet-routes.js";     
import videoRouter from "./routes/video-routes.js";

const app = express();

//common middleware
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
//routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/videos", videoRouter);



// app.use(errorHandler);   
export { app };
