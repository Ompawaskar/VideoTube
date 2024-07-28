import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"


const isVideoOwner = async (videoId,userId) => {
    try {
        return await Video.exists({_id: videoId,owner: userId})
    } catch (error) {
        throw error;
    }
}

export const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy = "views", sortType, userId } = req.query;

    if (!query) {
        throw new ApiError(400, "Query is required.");
    }

    if (!["views", "createdAt", "duration"].includes(sortBy)) {
        sortBy = "createdAt";
    }

    const sortDirection = sortType === "asc" ? 1 : -1;

    const aggregationPipeline = [
        {
            $search: {
                index: "search",
                text: {
                    query,
                    path: ['title', 'description']
                }
            }
        },
        {
            $sort: {
                [sortBy]: sortDirection
            }
        },
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: (page - 1) * parseInt(limit) }, { $limit: parseInt(limit) }]
            }
        }
    ];

    const result = await Video.aggregate(aggregationPipeline);
   
    const paginatedVideos = {
        data: result[0].data,
        total: result[0].metadata[0]?.total || 0,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil((result[0].metadata[0]?.total || 0) / limit)
    };

    return res.status(200).json(new ApiResponse(200, paginatedVideos, "Videos fetched successfully"));

})

export const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    let videoLocalPath = ""
    let thumbnailLocalPath = ""

    if (req.files && Array.isArray(req.files.video) && req.files.video[0]) {
        videoLocalPath = req.files.video[0];
    }

    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail[0]) {
        thumbnailLocalPath = req.files.thumbnail[0];
    }

    if (!videoLocalPath) {
        throw new ApiError(400, "Video File Missing")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail File Missing")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath.path);
    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath.path);

    console.log("VideoFile", videoFile);

    if (!videoFile)
        throw new ApiError(500, "Could not upload video. Please Try again later.");

    if (!thumbnailFile)
        throw new ApiError(500, "Could not upload thumbnail. Please Try again later.");

    const video = {
        title,
        description,
        owner: req.user._id,
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        duration: videoFile.duration / 60
    }

    const createdVideo = await Video.create(video);

    console.log("Video", createdVideo);

    return res.status(200).json(new ApiResponse(200, createdVideo, "Video Published Successfully!"))

})

export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind:"$user"
        },
        {
            // Subscriber count and isSubscribed status
            $lookup:{
                from: "subscriptions",
                let: {channelId:"$user._id" , userId: new mongoose.Types.ObjectId(req.user._id)},
                pipeline:[
                    {
                        $match:{
                            $expr:{
                                $eq:['$channel','$$channelId']
                            }
                        }
                    },
                    {
                        $group:{
                            _id: null,
                            subscriberCount: {$sum: 1},
                            isSubscribed: {
                                $max:{$eq:['$subscriber','$$userId']}
                            }
                        }
                    },
                ],
                as: "subscribtionDetails"
            }
        },
        {
           $unwind:"$subscribtionDetails"
        },
        {
            //Total Likes and Like status
            $lookup:{
                from: "likes",
                let: {videoId: "$_id",userId:new mongoose.Types.ObjectId(req.user._id)},
                pipeline:[
                    {
                        $match:{
                            $expr:{
                                $eq:['$video','$$videoId']
                            }
                            
                        }
                    },
                    {
                        $group:{
                            _id: null,
                            likeCount:{
                                $sum : 1
                            },
                            likeStatus:{
                                $max:{$eq:['$likedBy','$$userId']}
                            }
                        }
                    }
                ],
                as: "likeDetails"

            }
        },
        {
            $unwind:{
                path: '$likeDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
             //Total Likes and Like status
             $lookup:{
                from: "comments",
                let: {videoId: "$_id"},
                pipeline:[
                    {
                        $match:{
                            $expr:{
                                $eq:['$video','$$videoId']
                            }
                            
                        }
                    },
                    {
                        $count: 'commentCount'
                    }
                ],
                as: 'commentDetails'
             }
        },
        {
            $unwind:'$commentDetails'
        },
        {
            $project:{
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                username: '$user.username',
                avatar: '$user.avatar',
                username: '$user.username',
                isSubscribed: '$subscribtionDetails.isSubscribed',
                channelSubs: '$subscribtionDetails.subscriberCount',
                totalLikes: '$likeDetails.likeCount',
                isLiked: '$likeDetails.likeStatus',
                totalComments: '$commentDetails.commentCount'

            }
        }
        
        
    ])

    return res.status(200).json(new ApiResponse(200, video, "Video Fetched Successfully."))
})

export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    
    const { title, description } = req.body
    const thumbnailLocalPath = req.file

    if (!(title || thumbnailLocalPath || description))
        throw new ApiError(400, "Atleast one field required to update")

    const isOwner = await isVideoOwner(videoId,req.user._id);
    if(!isOwner)
        throw new ApiError(400,"Not Authenticated")

    let thumbnail = "";

    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath.path)
    }

    const prevVideoDetails = await Video.findById(videoId);
    if (!prevVideoDetails)
        throw new ApiError(404, "Video not found");

    if (thumbnail)
        await deleteFromCloudinary(prevVideoDetails.thumbnail)

   const updatedFields = {
        title: title || prevVideoDetails.title,
        description: description || prevVideoDetails.description,
        thumbnail: thumbnail ? thumbnail.url : prevVideoDetails.thumbnail,
    };

    const newVideoDetails = await Video.findByIdAndUpdate(videoId, updatedFields, { new: true, runValidators: false });

    return res.status(200).json(new ApiResponse(200, newVideoDetails, "Changes Saved"))

})

export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const isOwner = await isVideoOwner(videoId,req.user._id);
    if(!isOwner)
        throw new ApiError(400,"Not Authenticated")

    const deletedVideo = await Video.findByIdAndDelete(videoId)
    if (!deleteVideo)
        throw new ApiError(404, "Video not Found")

    await deleteFromCloudinary(deleteVideo.videoFile)
    await deleteFromCloudinary(deleteVideo.thumbnail)

    return res.status(200).json(new ApiResponse(200, deletedVideo, "Deleted Successfully"))

})

export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const isOwner = await isVideoOwner(videoId,req.user._id);
    if(!isOwner)
        throw new ApiError(400,"Not Authenticated")

    const newVideo = await Video.findByIdAndUpdate(videoId,{
        $set:{ isPublished: {$not: "$isPublished"}}
        },
        {new: true})

    if (!newVideo)
        throw new ApiError(404, "Video Not Found")

  
    return res.status(200).json(new ApiResponse(200, newVideo, "Status Updated"))
})
