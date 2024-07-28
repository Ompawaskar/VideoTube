import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.controllers.js";

const router = Router();

router.use(verifyJWT)

//Toggle Like
router.route('/').get(getLikedVideos)
router.route('/toggle/video/:videoId').put(toggleVideoLike)
router.route('/toggle/comment/:commentId').put(toggleCommentLike)
router.route('/toggle/tweet/:tweetId').put(toggleTweetLike)

export default router