import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video-models.js"
import { User } from "../models/user-models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    

})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const userId = req.user?._id;
    const { title, description, duration } = req.body

    if(!userId){
        throw new ApiError(404, "You need to login to publish a video");
    }

    if([title, description, duration].some(field => field.trim() === "")){
        throw new ApiError(400, "Title and description are required");
    }

    //gettig the videoFile and thumbnail path
    const videoFilePath = req.files?.videoFile?.[0]?.path;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if(!videoFilePath || !thumbnailPath){
        throw new ApiError(400, "Video and thumbnail are required");
    }

    //uploading videoFile and thumbnail url to cloudinary
    let videoFile;
    try {
        videoFile = await uploadOnCloudinary(videoFilePath);
    } catch (error) {
        throw new ApiError(500, "Failed to upload videoFile")
    }

    let thumbnail;
    try {
        thumbnail = await uploadOnCloudinary(thumbnailPath);
    } catch (error) {
        throw new ApiError(500, "Failed to upload thumbnail")
    }

    try {
        const video = new Video({
            owner: userId,
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            title,
            description,
            duration
        });
        await video.save();
        const createdVideo = await Video.findById(video._id);
        if(!createdVideo){
            throw new ApiError(500, "Something Went wrong while creating video");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, createdVideo, "Video created successfully"));

    } catch (error) {
        // console.log("error creating video", error);
        if(videoFile){
            await deleteFromCloudinary(videoFile.public_id);
        }
        if(thumbnail){
            await deleteFromCloudinary(thumbnail.public_id);
        }
        throw new ApiError(500, "Failed to create video and videoFile thumbnail were deleted from cloudinary");


    }

})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)    
        .json(new ApiResponse(200, video, "Video fetched successfully"));

})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params
    const { title, description, duration } = req.body
    const thumbnailPath = req.file?.path;
    
    if ([title, description, duration].some(field => field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    if (!thumbnailPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailPath);
    if (!thumbnail.url) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                duration,
                thumbnail: thumbnail.url
            }
        },
        {new: true}
    )

    if(!video){
        throw new ApiError(404, "Something went wrong while updating video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findByIdAndDelete(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(`${videoId}`)
                }
            },
            {
                $set:{
                    isPublished: !"$isPublished"
                }
            }
        ]
    )

    if(!video){
        throw new ApiError(404, "Something went wrong while toggling publish status");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Publish status toggled successfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}