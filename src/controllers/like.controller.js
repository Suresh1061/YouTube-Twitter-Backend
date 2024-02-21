import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResposnse.js"
import { ApiError } from "../utils/ApiError.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { request } from "express"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {}
                // "video unliked successfully"
            ))
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            "video liked successfully"
        ))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid commentId")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "comment not found")
    }

    const likedComment = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })
    // console.log(likedComment)

    if (likedComment) {
        await Like.findByIdAndDelete(likedComment?._id)

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {}
                // "Comment unliked successfully"
            ))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            "comment liked successfully"
        ))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(400, "tweet not found")
    }

    const likedTweet = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    })

    if (likedTweet) {
        await Like.findByIdAndDelete(likedTweet?._id);

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                // "Tweet unliked successfully"
            ))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            "Tweet liked successfully"
        ))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 1,
                likedVideo: {
                    title: 1,
                    description: 1,
                    duration: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    views: 1,
                    ownerDetails: {
                        avatar: 1,
                        fullName: 1,
                        username: 1
                    }
                }
            },
        },
    ]
    )

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            likedVideosAggregate,
            "Liked videos fetched successfully"
        ))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}