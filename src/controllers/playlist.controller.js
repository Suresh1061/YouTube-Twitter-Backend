import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResposnse.js"
import { ApiError } from "../utils/ApiError.js"
import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name || !description) {
        throw new ApiError(400, "name and description are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            playlist,
            "Playlist created successfully"
        ))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    if (!name || !description) {
        throw new ApiError(400, "name or description are required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "playlist owner can update their playlists")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "failed to update playlist please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated successfully"
        ))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "playlist owner can delete their playlists")
    }

    await Playlist.findByIdAndDelete(playlist?._id)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        ))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    console.log(playlistId, videoId)

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlistId or videoId")
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "failed to update playlist please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedPlaylist,
            "video added successfully"
        ))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid playlistId and videoId")
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "playlist owner can delete their playlists")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull: {
                videos: videoId,
            }
        },
        { new: true }
    )

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedPlaylist,
            "remove video from the playlist successfully"
        ))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // console.log(playlistId)

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: playlist?._id
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {
                "videos.isPublished": true
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
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            playlistVideos[0],
            "playlist fetched successfully"
        ))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const userPlaylist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$vides.views"
                }
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1,
            }
        }
    ])

    if (!userPlaylist) {
        throw new ApiError(500, "failed to fetch user playlist please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            userPlaylist[0],
            "Playlist fetch successfully"
        ))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
