import { Router } from "express";
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controller.js";

const router = Router();

router.route('/stats/:username').get(getChannelStats)
router.route('/videos/:username').get(getChannelVideos)

export default router