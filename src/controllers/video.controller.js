import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

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
    const video = await Video.findById(videoId)
    if (!video)
        throw new ApiError(400, "Video not Found")

    return res.status(200).json(new ApiResponse(200, video, "Video Fetched Successfully."))
})

export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body
    const thumbnailLocalPath = req.file

    if (!(title || thumbnailLocalPath || description))
        throw new ApiError(400, "Atleast one field required to update")

    let thumbnail = "";

    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath.path)
    }

    const prevVideoDetails = await Video.findById(videoId);
    if (!prevVideoDetails)
        throw new ApiError(404, "Video not found");

    if (thumbnail)
        await deleteFromCloudinary(prevVideoDetails.thumbnail)

    prevVideoDetails.title = title ? title : prevVideoDetails.title;
    prevVideoDetails.description = description ? description : prevVideoDetails.description;
    prevVideoDetails.thumbnail = thumbnail ? thumbnail.url : prevVideoDetails.thumbnail

    const newVideoDetails = await prevVideoDetails.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, newVideoDetails, "Changes Saved"))


})

export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    if (!deleteVideo)
        throw new ApiError(404, "Video not Found")

    await deleteFromCloudinary(deleteVideo.videoFile)
    await deleteFromCloudinary(deleteVideo.thumbnail)

    return res.status(200).json(new ApiResponse(200, deletedVideo, "Deleted Successfully"))

})

export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const oldVideo = await Video.findById(videoId)
    if (!oldVideo)
        throw new ApiError(404, "Video Not Found")

    oldVideo.isPublished = !oldVideo.isPublished

    const newVideo = await oldVideo.save({ validateBeforeSave: false })


    return res.status(200).json(new ApiResponse(200, newVideo, "Status Updated"))
})
