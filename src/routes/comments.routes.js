import { Router } from "express";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route('/:videoId').get(getVideoComments);
router.route('/add/:videoId').post(verifyJWT ,addComment);
router.route('/update').patch(verifyJWT , updateComment);
router.route('/delete').delete(verifyJWT,deleteComment);

export default router