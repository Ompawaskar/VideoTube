import { Router } from "express";
import { verifyJWT } from '../middlewares/auth.middlewares.js'
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";

const router = Router()

router.use(verifyJWT)

router.route('/toggle/:channelId').patch(toggleSubscription)
router.route('/subscribers/:channelId').get(getUserChannelSubscribers)
router.route('/subscribed/:subscriberId').get(getSubscribedChannels)

export default router

