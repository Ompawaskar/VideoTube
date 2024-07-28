import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    console.log(videoId);
    const {page = 1, limit = 10} = req.query

    const commentsPipeline = Comment.aggregate([
        {
            $match:{
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:'users',
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {
                        $project:{
                            username:1,
                            avatar:1
                        }
                    }
                ]

            }
        },
        {
            $unwind: "$userDetails"
        },
        {
            $lookup:{
                from: "likes",
                let : {comment_id : "$_id" },
                pipeline:[
                    {
                        $match: {
                            $expr:{
                            $eq: ["$comment","$$comment_id"]
                        }
                        }
                    },
                    {
                        $addFields:{
                            likeCount : {
                                $sum : 1
                            }
                        }
                    },
                    {
                        $project:{
                            likeCount : 1,
                            _id: 0

                        }
                    },
                    
                ],
                as: "likes"
            }
        },    
        {
            $unwind: {
                path:"$likes",
                preserveNullAndEmptyArrays: true
            }
            
        },
        {
            $addFields:{
                likes: {
                    $ifNull: ["$likes.likeCount", 0]
                }
            }
        },
        {
            $project: {
                content : 1,
                userDetails: 1,
                likes: 1,
                updatedAt: 1,
            }
        }
    ])

    const comments = await Comment.aggregatePaginate(commentsPipeline, {page: parseInt(page),limit: parseInt(limit)})

    return res.status(200).json(new ApiResponse(200,comments,"Comments fetched"))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body;
    const { videoId } = req.params;

    if(!content)
        throw new ApiError(404,"Empty content.")

    if(!videoId)
        throw new ApiError(400, "Video Id not found")

    const newComment = await Comment.create({content,video : videoId,owner:req.user._id})

    if(!newComment)
        throw new ApiError(500,"Error creating comment. Try again later");

    return res.status(200).json(new ApiResponse(200,newComment,"Comment added"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { content , commentId} = req.body;

    if(!content)
        throw new ApiError(404,"Empty content.")

    if(!commentId)
        throw new ApiError(400, "commentId not found")

    const updatedComment = await Comment.findByIdAndUpdate(commentId,{content}, {new :true})
    if(!updatedComment)
        throw new ApiError(500,"Error updating comment")

    return res.status(200).json(new ApiResponse(200,updatedComment,"Updated comment"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.body;

    if(!commentId)
        throw new ApiError(400, "commentId not found")

    const deletedComment = await Comment.findByIdAndDelete(commentId)
    if(!deletedComment)
        throw new ApiError(500,"Error deleting comment")

    return res.status(200).json(new ApiResponse(200,deletedComment,"Deleted comment"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }