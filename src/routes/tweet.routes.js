import {Router} from 'express'
import { createTweet, deleteTweet, getUserTweets, updateTweet } from '../controllers/tweet.controller.js'
import { verifyJWT } from '../middlewares/auth.middlewares.js'

const router = Router()

router.route('/:username').get(getUserTweets)

//Secured Routes
router.route('/create').post( verifyJWT,createTweet)
router.route('/update/:tweetId').patch( verifyJWT,updateTweet)
router.route('/delete/:tweetId').delete( verifyJWT,deleteTweet)

export default router