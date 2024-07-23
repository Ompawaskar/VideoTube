import mongoose from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"

export const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    const subscriberId = req.user?._id

    const subsctiptionDoc = await Subscription.findOne({ channel: channelId, subscriber: subscriberId })
    console.log(subsctiptionDoc);

    if (subsctiptionDoc) {
        await Subscription.findByIdAndDelete(subsctiptionDoc._id)
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed"))
    }

    else {
        await Subscription.create({ channel: channelId, subscriber: subscriberId })
        return res.status(200).json(new ApiResponse(200, {}, "Subscribed"))
    }
})

// controller to return subscriber list of a channel
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const { page = 1, limit = 10 } = req.query

    const subscribers = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'subscriber',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ],
                as: 'subscriberDetails'
            }
        },
        {
            $project: {
                subscriberDetails: 1,
            }
        }
    ])

    const paginatedSubscribers = await Subscription.aggregatePaginate(subscribers, { page, limit })

    return res.status(200).json(new ApiResponse(200, { subscribers: paginatedSubscribers }, "Subscribers fetched"))

})

// controller to return channel list to which user has subscribed
export const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
   
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                pipeline: [
                    {
                        $lookup:{
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subsList"
                        }
                    },
                    {
                        $addFields:{
                            subsCount: {$size : "$subsList"}
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subsCount: 1
                        }
                    }
                ],
                as: "subscribedChannelDetails",
            }
        },
        {
            $project: {
                subscribedChannelDetails: 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribed Channels fetched"))

})