import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended: true , limit: "16kb"}));
app.use(express.static('public'));
app.use(cookieParser());

//Routes import
import userRouter from './routes/user.routes.js'
import videoRouter from './routes/video.routes.js'
import tweetRouter from './routes/tweet.routes.js'
import subscriptionRouter from './routes/subscriber.routes.js'


app.use('/api/v1/users',userRouter)
app.use('/api/v1/video',videoRouter)
app.use('/api/v1/tweets',tweetRouter)
app.use('/api/v1/subscription',subscriptionRouter)

export { app }