import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResposnse.js"
import { ApiError } from "../utils/ApiError.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    console.log(userId)
    const pipeline = []
    //TODO: get all videos based on query, sort, pagination
    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'

    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"]  //search only on title and description
                }
            }
        })
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }
    }

    pipeline.push({
        $match: {
            owner: new mongoose.Types.ObjectId(userId)
        }
    })

    // fetch videos only that are set isPublished as true
    pipeline.push({
        $match: { isPublished: true }
    })

    // sortBy can be views, createAt, duration
    // sortBy can be ascending(-1) or decreasing(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType == "asc" ? 1 : -1
            }
        })
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline)
    console.log(videoAggregate)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const video = await Video.aggregatePaginate(videoAggregate, options)
    console.log(video)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            video,
            "videos are fetched successfully"
        ))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    if (!(title || description)) {
        throw new ApiError(400, "All fields are required")
    }
    // TODO: get video, upload to cloudinary, create video
    //check for videoFile and thumbnail
    // upload them on cloudinary
    // create video object
    // check for video creation
    // return res
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoFileLocalPath && !thumbnailLocalPath) {
        throw new ApiError(400, "videoFile and thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(400, "video file not found")
    }
    if (!thumbnail) {
        throw new ApiError(400, "thumbnail not found")
    }

    const video = await Video.create({
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        duration: videoFile.duration,
        title,
        description,
        owner: req.user?._id,
        isPublished: true
    })

    if (!video) {
        throw new ApiError(500, "something went wrong")
    }

    const videoUpload = await Video.findById(video.id)
    if (!videoUpload) {
        throw new ApiError(500, "video uploaded failed please try again !!!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video uploaded successfully"
            ))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id")
    }

    const videoData = await Video.findById(videoId)
    if (!videoData) {
        throw new ApiError(400, "video not found")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "subscriber",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                LikeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                LikeCount: 1,
                // commentCount: 1,
                // commentOwner: 1,
                owner: 1,
                isLiked: 1
            }
        }
    ])

    if (!video) {
        throw new ApiError(500, "failed to fetch video")
    }

    await Video.findByIdAndUpdate(
        req.user?._id,
        {
            $inc: {
                views: 1
            }
        }
    )

    await Video.findByIdAndUpdate(
        videoId,
        {
            $addToSet: {
                watchHistory: videoId
            }
        }
    )

    // console.log(video)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            video[0],
            "video details fetched successfully"
        ))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    if (!title || !description) {
        throw new ApiError(400, "all fields are required");
    }

    const video = await Video.findById(videoId)
    console.log(video)

    if (!video) {
        throw new ApiError(404, "No video found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't edit this video as you are not the owner")
    }

    //delete old thumbnail and updating with new thumbnail
    const thumbnailToDelete = video.thumbnail.public_id;

    const thumbnailLocalpath = req.file?.path;
    if (!thumbnailLocalpath) {
        throw new ApiError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalpath)

    if (!thumbnail) {
        throw new ApiError(500, "something went wrong while uploading thumbnail on cloudinary")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    url: thumbnail.url,
                    public_id: thumbnail.public_id
                }
            }
        },
        { new: true }
    )

    if (!updateVideo) {
        throw new ApiError(500, "Failed to update video details, please try again")
    }

    //delete old thumbnail after updating new thumbnail
    await deleteOnCloudinary(thumbnailToDelete);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedVideo,
            "Video details updated successfully"
        ))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "No video found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't delete this video as you are not the owner")
    }

    const videoToDelete = await Video.findByIdAndDelete(video?._id)

    if (!videoToDelete) {
        throw new ApiError(500, "Failed to delete video please try again")
    }

    await deleteOnCloudinary(video.thumbnail.public_id)
    await deleteOnCloudinary(video.videoFile.public_id, "video");

    return res
        .status(200)
        .json(new ApiError(200, {}, "video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "No video found")
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't toggle publish status as you are not owner")
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    )

    if (!toggledVideoPublish) {
        throw new ApiError(500, "Failed to toggle video publish status")
    }

    // console.log(toggledVideoPublish)
    return res
        .status(200)
        .json(new ApiResponse(200, { isPublished: toggledVideoPublish.isPublished }, "video published toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
