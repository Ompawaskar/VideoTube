import express from 'express'
import { verifyJWT } from '../middlewares/auth.middlewares.js'
import { upload } from '../middlewares/multer.middleware.js'
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.route('/getVideos').get(getAllVideos)
//secure routes
router.route('/publish').post(verifyJWT, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), publishAVideo)
router.route('/update/:videoId').patch(verifyJWT,upload.single('thumbnail'),updateVideo)
router.route('/:videoId').get(verifyJWT,getVideoById)
router.route('/delete/:videoId').delete(verifyJWT,deleteVideo);
router.route('/toggleStatus/:videoId').patch(verifyJWT,togglePublishStatus)
 

export default router