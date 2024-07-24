import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import mongoose, { isValidObjectId } from "mongoose"

const isPlaylistOwner = async (playlistId, userId) => {
    try {
        const playlist = await Playlist.findById(playlistId);
        if (!playlist)
            return false;

        console.log(playlist.owner.toString());
        console.log(userId);

        return playlist.owner.toString() === userId.toString()
    } catch (error) {
        console.log(error);
    }
}
//TODO: create playlist
export const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name)
        throw new ApiError(400, "Playlist name is required.")

    const playlistExsist = await Playlist.find({ name });
    if (playlistExsist.length !== 0) {
        throw new ApiError(400, "Playlist already exsists.")
    }

    const playlist = await Playlist.create({ name, description, videos: [], owner: req.user?._id });

    if (!playlist)
        throw new ApiError(500, "Error creating Playlist. Please Try again later")

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist Created"))

})

//TODO: get user playlists
export const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId))
        throw new ApiError(400, "Not a valid Id")

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1
                        }
                    }
                ],
                as: "VideoDetails"
            }

        },
        {
            $project: {
                name: 1,
                description: 1,
                VideoDetails: 1,
                owner: 1,
                _id: 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, { playlists }, "Fetched Playlists"))

})

//TODO: get playlist by id
export const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Not a valid Id")

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1
                                    }
                                }
                            ],
                            as: "channelName"

                        }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            channelName: 1
                        }
                    }
                ],
                as: "videoDetails"

            }
        }

    ])

    if (!playlist)
        throw new ApiError(500, "Playlist not Found")

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched"))

})

// Add Video
export const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!(isValidObjectId(playlistId) || isValidObjectId(videoId)))
        throw new ApiError(400, "Not a valid ID.")

    const authenticateUser = await isPlaylistOwner(playlistId, req.user._id)

    if (!authenticateUser)
        throw new ApiError(401, "Unauthorized request")

    const addedVideo = await Playlist.findByIdAndUpdate(playlistId, {
        $push: {
            videos: new mongoose.Types.ObjectId(videoId)
        }

    },
        {
            new: true
        })

    if (!addedVideo)
        throw new ApiError(500, "Error while adding video.")

    return res.status(200).json(new ApiResponse(200, addedVideo, "Video added"))

})

// TODO: remove video from playlist
export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!(isValidObjectId(playlistId) || isValidObjectId(videoId)))
        throw new ApiError(400, "Not a valid ID.")

    const authenticateUser = await isPlaylistOwner(playlistId, req.user._id)

    if (!authenticateUser)
        throw new ApiError(401, "Unauthorized request")

    const deletedVideo = await Playlist.findByIdAndUpdate(playlistId,
        {
            $pull:{
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new: true
        }
    )

    if(!deletedVideo)
        throw new ApiError(500,"Error deleting video.")

    return res.status(200).json(new ApiResponse(200,deletedVideo,"Video removed."))


})

// TODO: delete playlist
export const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Not a valid ID.")

    const authenticateUser = await isPlaylistOwner(playlistId, req.user._id)

    if (!authenticateUser)
        throw new ApiError(401, "Unauthorized request")

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist)
        throw new ApiError(500, "Error deleting Playlist")

    return res.status(200).json(new ApiResponse(200, deletedPlaylist, "Playlist Deleted."))

})

//TODO: update playlist
export const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if(!(name || description))
        throw new ApiError(400,"Nothing to update")

    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Not a valid ID.")

    const authenticateUser = await isPlaylistOwner(playlistId, req.user._id)

    if (!authenticateUser)
        throw new ApiError(401, "Unauthorized request")

    const playlist = await Playlist.findById(playlistId);
    if(!playlist)
        throw new ApiError(500,"Error Updating Playlist.")

    playlist.name = name ? name : playlist.name;
    playlist.description = description ? description : playlist.description;

    await playlist.save();

    return res.status(200).json(new ApiResponse(200,playlist,"Updated Playlist"))
})
