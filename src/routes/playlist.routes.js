import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";

const router = Router();

// Create Playlist
router.route('/create').post(verifyJWT,createPlaylist);

// Get Playlists
router.route('/user/:userId').get(getUserPlaylists);

//Get Playlist By Id
router.route('/:playlistId').get(getPlaylistById);

//Add Video
router.route('/add/:playlistId/:videoId').patch(verifyJWT, addVideoToPlaylist)

//Remove Video
router.route('/remove/:playlistId/:videoId').patch(verifyJWT, removeVideoFromPlaylist)

//Delete Playlist
router.route('/delete/:playlistId').delete(verifyJWT, deletePlaylist)

//Update Playlist
router.route('/update/:playlistId').patch(verifyJWT, updatePlaylist)





export default router