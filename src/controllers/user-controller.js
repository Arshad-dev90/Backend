import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user-models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        //checking for user
        if(!user){
            throw new ApiError(404, "User not found");
        }
    
        //generating token for user
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Failed to generate access and refresh token");
    }
}


const registerUser = asyncHandler(async(req, res) => {
    const {fullname, email, password, username} = req.body;

    //validation
    if([fullname, email, password, username].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    //check if user already exists
    const existingUser = await User.findOne({
        $or:[{username}, {email}]
    });
    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    //upload avatar
    console.warn(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    console.log (avatarLocalPath);
    const coverLocalPath = req.files?.coverImage?.[0]?.path;
    console.log(coverLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar or cover image is required");
        
    }

    /*this is not the proper way to upload to cloudinary*/

    //upload to cloudinary
    // const avatar = await uploadOnCloudinary(avatarLocalPath);

    //coverimage is optional
    // let coverImage="";
    // if(coverLocalPath){
    //     coverImage = await uploadOnCloudinary(coverLocalPath);
    // }


    //proper way to upload to cloudinary
    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log("Avatar uploaded to cloudinary", avatar);
        
    } catch (error) {
        console.log("Error uploading avatar", error);
        throw new ApiError(500, "Failed to upload avatar");
    }

    //for coverimage
    let coverImage; 
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath);
        console.log("Cover image uploaded to cloudinary", coverImage);
    } catch (error) {
        console.log("Error uploading coverImage", error);
        throw new ApiError(500, "Failed to upload cover image");
    }

   try {
     //creating user document
     const user = await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
     });
 
     //quering user from db
     const createdUser = await User.findById(user._id).select("-password -refreshToken");
 
     if(!createdUser){
         throw new ApiError(500, "Something went wrong while registering the user");
     }
 
     //sending response
     return res.status(201)
     .json(new ApiResponse(201, createdUser, "User registered successfully"));
   } catch (error) {
    console.log("user creation failed", error);

    if(avatar){
        await deleteFromCloudinary(avatar.public_id);
    }

    if(coverImage){
        await deleteFromCloudinary(coverImage.public_id);
    }

    throw new ApiError(500, "something went wrong while registering the user and images were deleted from cloudinary");
   }

});

const loginUser = asyncHandler(async(req, res) => {
    //get data from body
    console.log(req.body);
    const {email, username, password} = req.body;
    console.log(email, username, password);

    //validation
    if([email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }
    
    //querying user from db
    const user = await User.findOne({
        $or: [{email},{username}]
    })
    if(!user){
        throw new ApiError(404, "User not found");
    }

    //validate for password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials");
    }

    //generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    
    //querying loggedin user
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if(!loggedInUser){
        throw new ApiError(500, "Something went wrong while logging in");
    }

    //setting cookies for access and refresh token
    const options ={
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };

    //sending response
    res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200,
        {user: loggedInUser, accessToken, refreshToken} ,
        "User logged in successfully"));
});

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: "",
            }
        },
        {new:true}
    )

    const options ={
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };

    //sending response
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    //check for refresh token
    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required");
    }
    //validate refresh token
    try {
        const decodedToken =jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_JWT_SECRET
        )
        const user = await User.findById(decodedToken?._id);

        //checking for user
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }

        //validating refresh token from user with database refresh token
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Invalid refresh token");
        }

        //cookie options
        const options ={
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        };

        //generate new access and refresh token
        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id);

        //sending response
         return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(
            200, 
            {accessToken, 
            refreshToken: newRefreshToken},
            "Access token refreshed successfully"));
        

    } catch (error) {
        throw new ApiError(500, "Failed to refresh access token");
    }

});

const changeCurrentUserPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;

    //grabbing current user from request using middleware
    const user = await User.findById(req.user?._id);
    
    //validating old password
    const isPasswordvalid = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordvalid){
        throw new ApiError(401, "Invalid old password");
    }
    //updating password
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    //sending response
    return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async(req, res) => {
    //the user is already attached to request by middleware

    //sending response
    return res.status(200).json(new ApiResponse(200, req.user, "User fetched successfully"));
    
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname,email} = req.body;
     if(!fullname || !email){
        throw new ApiError(400, "Fullname and email are required");
     }

     //updating user details
     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email: email,
            }
        },
        {new: true}
     ).select("-password -refreshToken");

     if(!user){
        throw new ApiError(500, "Something went wrong while updating the user details");
     }

     return res.status(200).json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    //upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(500, "Failed to upload avatar");
    }

    //update user document
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    //sending response
    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
    
    
});


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is required");
    }

    //upload to cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(500, "Failed to upload cover image");
    }

    //update user document
    const user = await User.findByIdAndUpdate(
        req.user._id,           
        {
            $set:{
                coverImage: coverImage.url,
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    //sending response
    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
    
    
    
});

//getting complex data from database using aggregation pipeline
const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params;

    if(!username.trim()){
        throw new ApiError(400, "Username is required");
    }

    //aggregation pipeline to get channel details
    const channel = await User.aggregate(
        [
            {
                $match:{
                    username: username?.toLowerCase()
                }
            },
            {
                //finding all subscribers that subscribed to this user's channel
                $lookup:{
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                //finding all channels that this user has subscribed to
                $lookup:{
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                //adding fields to the output
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false,
                        }
                    }
                }
            },
            {
                //project only necessary data
                $project: {
                    fullname: 1,
                    username: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscribersCount: 1,
                    channelSubscribedToCount: 1,
                    isSubscribed: 1,
                    
                }
            }
        ]
    )
    console.log(channel);

    if(!channel){
        throw new ApiError(404, "Channel not found");
    }

    //sending response
    return res.status(200).json(new ApiResponse(200, channel[0], "Channel details fetched successfully"));
});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(`${req.user._id}`),
                }
            },
            {
                //finding videos that user has watched
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                               from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                           fullname: 1,
                                           username: 1,
                                           avatar: 1,
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]

                }
            }
        ]
    )

    if(!user){
        throw new ApiError(404, "User not found");
    }

    //sending response
    return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully"));
});



export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}