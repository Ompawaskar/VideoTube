import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateFiles } from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route('/register').post(upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), registerUser)

router.route('/login').post(loginUser)

router.route('/logout').post(verifyJWT, logoutUser);

router.route('/refreshAccessToken').post(refreshAccessToken)

router.route('/change-password').post(verifyJWT, changeCurrentPassword)

router.route('/change-files').post(verifyJWT,
    upload.fields([{ name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }],
    ),
    updateFiles
)

router.route('/currentUser').get(verifyJWT , getCurrentUser)

router.route('updateAccount').post(verifyJWT , updateAccountDetails)

export default router