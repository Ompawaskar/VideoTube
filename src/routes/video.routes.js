import express from 'express'
import { verifyJWT } from '../middlewares/auth.middlewares.js'
import { upload } from '../middlewares/multer.middleware.js'
import { publishAVideo, updateVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.route('/publish').post(verifyJWT, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), publishAVideo)
router.route('/update').post(verifyJWT,upload.single('thumbnail'),updateVideo)

export default router