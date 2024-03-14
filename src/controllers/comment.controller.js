import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { User } from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResposnse.js"
import { ApiError } from "../utils/ApiError.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoId")
    }

    const video = Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likeCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                isLiked: 1
            }
        }
    ])

    console.log(commentAggregate)

    const option = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comment = await Comment.aggregatePaginate(commentAggregate, option)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            comment,
            "Comment fetched successfully"
        ))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body;
    console.log(content)
    const { videoId } = req.params;

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "No video found")
    }

    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId,
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            comment,
            "Comment added successfully"
        ))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "new content required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only comment owner can edit their comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: { content }
        },
        { new: true }
    )

    if (!updatedComment) {
        throw new ApiError(500, "failed to edit comment please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        ))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only comment owner can delete their comment")
    }

    const commentToDelete = await Comment.findByIdAndDelete(commentId)

    if (!commentToDelete) {
        throw new ApiError(500, "failed to delete comment please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        ))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
