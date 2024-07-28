import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Video } from '../models/video.model.js'

// TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
export const getChannelStats = asyncHandler(async (req, res) => {
    const { username } = req.params

    const channelStats = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            // Total Subs
            $lookup: {
                from: "subscriptions",
                let: { userId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$channel", "$$userId"]
                            }
                        }
                    },
                    {
                        $count: "totalSubs"
                    }
                ],
                as: "SubsCount"
            }
        },
        {
            $unwind: {
                path: '$SubsCount',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                "totalSubscribers": {
                    $ifNull: ["$SubsCount.totalSubs", 0]
                }
            }
        },
        {
            // Total Video Views and Video Count and Video Likes
            $lookup: {
                from: "videos",
                let: { channelId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$owner', '$$channelId']
                            }
                        }
                    },
                    {
                        // Total likes
                        $lookup: {
                            from: "likes",
                            let: { videoId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ['$video', '$$videoId']
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        totalVideoLikes: { $sum: 1 }
                                    }
                                },
                                {
                                    $project: {
                                        totalVideoLikes: 1,
                                        _id: 0
                                    }
                                }
                            ],

                            as: "TotalLikes"
                        }
                    },
                    {
                        $unwind: {
                            path: '$TotalLikes',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $project:{
                            TotalLikes: "$TotalLikes.totalVideoLikes"
                        }
                    },
                    {
                        $unwind: {
                            path: '$videoDetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalVideos: {
                                $sum: 1
                            },
                            totalViews: {
                                $sum: '$views'
                            },
                            totalLike:{
                                $sum: '$TotalLikes'
                            }

                        }
                    },
                ],

                as: "videoDetails"
            }


        },
        {
            $unwind: {
                path: '$videoDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                avatar: 1,
                createdAt: 1,
                totalSubscribers: 1,
                totalViews: "$videoDetails.totalViews",
                totalVideos: "$videoDetails.totalVideos",
                totalLikes: "$videoDetails.totalLike",
            }
        }


    ])


    return res.status(200).json(new ApiResponse(200, { channelStats }, "Channel stats fetched."))


})

// TODO: Get all the videos uploaded by the channel
export const getChannelVideos = asyncHandler(async (req, res) => {
    let { username } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!username)
        throw new ApiError(400, "Username is required")

    username = username.toLowerCase();

    const { _id: channelId } = await User.findOne({ username });
    console.log(channelId);
    if (!channelId)
        throw new ApiError(500, "User does not exsist.")

    const userVideos = await Video.find({
        $and: [
            { owner: channelId },
            { isPublished: false }
        ]

    }).skip(parseInt(page - 1) * parseInt(limit)).limit(parseInt(limit)).sort({ createdAt: -1 });


    return res.status(200).json(new ApiResponse(200, userVideos, "Videos fetched"))
})