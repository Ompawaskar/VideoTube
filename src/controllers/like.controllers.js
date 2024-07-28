import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Like } from "../models/like.model.js"
import mongoose from "mongoose"

export const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    const likeStatus = await Like.findOne({ video: videoId, likedBy: req.user?._id })

    if (!likeStatus) {
        const likedVideo = await Like.create({ video: videoId, likedBy: req.user?._id });

        if (!likedVideo)
            throw new ApiError(500, "Error while Liking the video. Try again later.")

        return res.status(200).json(new ApiResponse(200, likedVideo, "Video Liked"))
    }

    const unLikedVideo = await Like.findOneAndDelete({ video: videoId, likedBy: req.user?._id })

    if (!unLikedVideo)
        throw new ApiError(500, "Error while UnLiking the video. Try again later.")

    return res.status(200).json(new ApiResponse(200, unLikedVideo, "Video UnLiked"))

})

export const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    const likeStatus = await Like.findOne({ comment: commentId, likedBy: req.user?._id })

    if (!likeStatus) {
        const likedComment = await Like.create({ comment: commentId, likedBy: req.user?._id });

        if (!likedComment)
            throw new ApiError(500, "Error while Liking the comment. Try again later.")

        return res.status(200).json(new ApiResponse(200, likedComment, "Comment Liked"))
    }

    const unLikedComment = await Like.findOneAndDelete({ comment: commentId, likedBy: req.user?._id })

    if (!unLikedComment)
        throw new ApiError(500, "Error while UnLiking the comment. Try again later.")

    return res.status(200).json(new ApiResponse(200, unLikedComment, "unLikedComment"))

})

export const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    
    // Check if the user has already liked the tweet
    const likeStatus = await Like.findOne({ tweet: tweetId, likedBy: req.user?._id });

    if (!likeStatus) {
        // Add a like if it doesn't exist
        const likedTweet = await Like.create({ tweet: tweetId, likedBy: req.user?._id });

        if (!likedTweet) {
            throw new ApiError(500, "Error while liking the tweet. Try again later.");
        }

        return res.status(200).json(new ApiResponse(200, likedTweet, "Tweet liked"));
    }

    // Remove the like if it exists
    const unlikedTweet = await Like.findOneAndDelete({ tweet: tweetId, likedBy: req.user?._id });

    if (!unlikedTweet) {
        throw new ApiError(500, "Error while unliking the tweet. Try again later.");
    }

    return res.status(200).json(new ApiResponse(200, unlikedTweet, "Tweet unliked"));
});

export const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
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
                                        username: 1,
                                        _id: 0
                                    }
                                }
                            ],
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    },
                    {
                        $project: {
                            username: '$ownerDetails.username',
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            views: 1,
                            duration: 1
                        }

                    }
                ],
                as: "videos"

            }
        },

        {
            $unwind: "$videos"
        },
        {
            $replaceRoot: { newRoot: "$videos" }
        }

    ])

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked Videos fetched"))
})