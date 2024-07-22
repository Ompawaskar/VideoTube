import mongoose from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from '../models/user.model.js'
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    if (!content)
        throw new ApiError(400, "Tweet Content not found")

    const createdTweet = await Tweet.create({ owner: req.user?._id, content })

    if (!createTweet)
        throw new ApiError(500, "Error creating tweet. Please Try again Later.")

    return res.status(200).json(new ApiResponse(200, createdTweet, "Tweet Created."))

})

export const getUserTweets = asyncHandler(async(req,res) => {
    const { username } = req.params
    const { page = 1 , limit = 10} = req.query

    if(!username)
        throw new ApiError(400,"Username Required")

    const user = await User.findOne({username})
    if(!user)
        throw new ApiError(500,"User not Found")

    const tweets = await Tweet.find({owner: user._id}).skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit));

    const totalTweets = await Tweet.countDocuments({ owner: user._id });
    console.log(totalTweets);
    const totalPages = Math.ceil(totalTweets/limit)

    res.status(200).json(new ApiResponse(200,{
        tweets,
        currentPage: page,
        totalPages,
        totalTweets
    }, "Tweets fetched Successfully"));

          
})

export const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { content } = req.body
    const { tweetId } = req.params
    if (!content)
        throw new ApiError(400, "Content cannot be empty.")

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {content}
    },{
        new:true
    })

    if (!updatedTweet)
        throw new ApiError(500, "Failed to update tweeet, Please Try again later.")

    return res.status(200).json(new ApiResponse(200, updatedTweet, "Tweet Updated"))
})

export const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deletedTweet)
        throw new ApiError(500, "Failed to delete tweet, Try again later")

    return res.status(200).json(new ApiResponse(200, deleteTweet, "Tweet deleted successfully"))

})