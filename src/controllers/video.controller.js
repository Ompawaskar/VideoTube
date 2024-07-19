import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

export const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    let videoLocalPath = ""
    let thumbnailLocalPath = ""

    if(req.files && Array.isArray(req.files.video) && req.files.video[0]){
        videoLocalPath = req.files.video[0];
    }

    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail[0]){
        thumbnailLocalPath = req.files.thumbnail[0];
    }
    
    if(!videoLocalPath){
        throw new ApiError(400,"Video File Missing")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail File Missing")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath.path);
    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath.path);

    console.log("VideoFile",videoFile);

    if(!videoFile)
        throw new ApiError(500,"Could not upload video. Please Try again later.");

    if(!thumbnailFile)
        throw new ApiError(500,"Could not upload thumbnail. Please Try again later.");

    const video = {
        title,
        description,
        owner: req.user._id,
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        duration: videoFile.duration / 60
    }

    const createdVideo = await Video.create(video);

    console.log("Video",createdVideo);

    return res.status(200).json(new ApiResponse(200,createdVideo,"Video Published Successfully!"))

})

export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
     const video = await Video.findById(videoId)
     if(!video)
        throw new ApiError(400,"Video not Found")

     return res.status(200).json(new ApiResponse(200,video,"Video Fetched Successfully."))
})

export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title , description} = req.body
    const thumbnailLocalPath = req.file.path

    if(!title || !thumbnailLocalPath || !description )
        throw new ApiError(400,"Atleast one field required to update")

    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId,{
        $set:{
            title,
            description,
            thumbnail: thumbnailLocalPath 
        }
    })
    


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    if(!deleteVideo)
        throw new ApiError(404,"Video not Found")

    await deleteFromCloudinary(deleteVideo.videoFile)
    await deleteFromCloudinary(deleteVideo.thumbnail)

    return res.status(200).json(new ApiResponse(200,deletedVideo,"Deleted Successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})
