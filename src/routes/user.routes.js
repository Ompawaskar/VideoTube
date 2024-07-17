import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getUserWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateFiles } from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();


const cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]);
router.route('/register').post(cpUpload , registerUser)

router.route('/login').post(loginUser)

router.route('/logout').post(verifyJWT, logoutUser);

router.route('/refreshAccessToken').post(refreshAccessToken)

router.route('/change-password').patch(verifyJWT, changeCurrentPassword)

router.route('/change-files').patch(verifyJWT,
    upload.fields([{ name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }],
    ),
    updateFiles
)

router.route('/current-user').get(verifyJWT , getCurrentUser)

router.route('/updateAccount').patch(verifyJWT , updateAccountDetails)

router.route('/c/:username').get(verifyJWT,getUserChannelProfile)

router.route('/history').get(verifyJWT,getUserWatchHistory)

export default router