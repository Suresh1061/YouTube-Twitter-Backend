import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()

app.use(cors({
    credentials: true,
    origin: "http://localhost:5173",
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static("public"))
app.use(cookieParser())

//routes import 
import userRouter from './routes/user.routes.js'
import videoRouter from './routes/video.routes.js'
import commentRoute from './routes/comment.routes.js'
import likeRoute from './routes/like.routes.js'
import tweetRoute from './routes/tweet.routes.js'
import playlistRoute from './routes/playlist.routes.js'
import subscriptionsRoute from './routes/subscription.routes.js'
import dashboardRoute from './routes/dashboard.routes.js'
import healthCheckRoute from './routes/healthcheck.routes.js'

//routes declarations
app.use('/api/v1/users', userRouter)
app.use('/api/v1/videos', videoRouter)
app.use('/api/v1/comments', commentRoute)
app.use('/api/v1/likes', likeRoute)
app.use('/api/v1/tweets', tweetRoute)
app.use('/api/v1/playlists', playlistRoute)
app.use('/api/v1/subscription', subscriptionsRoute)
app.use('/api/v1/dashboard', dashboardRoute)
app.use('/api/v1/healthcheck', healthCheckRoute)


// http://localhost:8000/api/v1/users/register

export { app }