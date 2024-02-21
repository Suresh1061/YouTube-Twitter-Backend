import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResposnse.js"
import { ApiError } from "../utils/ApiError.js"
import { Tweet } from "../models/tweet.model.js"
import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    // console.log(content);
    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if (!tweet) {
        throw new ApiError(500, "failed to create tweet please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            tweet,
            "Tweet created successfully"
        ))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "invalid userId")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likedTweet",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            },
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likedTweet"
                }
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                likeCount: 1,
                owner: 1,
                content: 1,
                createdAt: 1,
            }
        }
    ])

    if (!tweet) {
        throw new ApiError(500, "failed to get tweet please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            tweet,
            "User Tweet fetched successfully"
        ))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(400, "tweet not found")
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "tweet owner can update their tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: { content }
        },
        {
            new: true
        }
    )

    if (!updatedTweet) {
        throw new ApiError(500, "failed to update tweet, please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedTweet,
            "Tweet updated successfully"
        ))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(400, "tweet not found")
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "tweet owner can update their tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}

