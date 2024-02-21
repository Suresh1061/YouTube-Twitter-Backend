import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose, { isValidObjectId } from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { Subscription } from '../models/subscription.model.js'
import { ApiResponse } from "../utils/ApiResposnse.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId")
    }

    const userChannel = await User.findById(channelId)

    if (!userChannel) {
        throw new ApiError(400, "Channel not found")
    }

    const alreadySubscribed = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    })

    if (alreadySubscribed) {
        await Subscription.findByIdAndDelete(alreadySubscribed?._id)

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                { subscribed: false },
                "unsubscribed successfully"
            ))
    }

    const subscription = Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    if (!subscription) {
        throw new ApiError(500, "failed to subscribe please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { subscribed: true },
            "Subscribed successfully"
        ))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId")
    }

    const userChannel = await User.findById(channelId)

    if (!userChannel) {
        throw new ApiError(400, "Channel not found")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $project: {
                updatedAt: 1,
                subscriber: {
                    "avatar.url": 1,
                    username: 1,
                    fullName: 1,
                },
            },
        },
        {
            $group: {
                _id: null,
                totalSubscriber: { $sum: 1 },
                details: {
                    $push: "$subscriber"
                }
            }
        }
    ]);

    if (!subscribers) {
        throw new ApiError(500, "failed to fetch your subscriber please try again");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers,
                "subscribers fetched successfully"
            )
        );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid channelId")
    }

    const user = await User.findById(subscriberId)

    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const subscribedChannel = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscriber",
                        },
                    },
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            subscribers: {
                                $size: "$subscriber",
                            },
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$channel",
        },
        {
            $project: {
                channel: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribers: 1,
                    latestVideo: {
                        title: 1,
                        description: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        duration: 1,
                        views: 1,
                        updatedAt: 1,
                        owner: 1,
                    },
                },
            },
        },
    ]);

    if (!subscribedChannel) {
        throw new ApiError(500, "failed to fetch your subscribed channel please try again");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannel,
                "subscribers fetched successfully"
            )
        );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}