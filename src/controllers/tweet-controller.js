import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet-model.js"
import { User } from "../models/user-models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(404, "You need to login to tweet");          
    }

    if (!content.trim()) {     
        throw new ApiError(400, "Content is required")
    }


    const tweet = new Tweet({
        content,
        owner: userId
    });

    await tweet.save();

    return res
        .status(201)
        .json(new ApiResponse(201, "Tweet created successfully", tweet));

    
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    //aggregating
    const userTweet = await Tweet.aggregate(
        [
            {
                $match:{
                    owner: new mongoose.Types.ObjectId(`${userId}`)
                }
            },
            {
                //taking out owner and content field 
                $project: {
                    owner: 1,
                    content: 1,
                }
            },
        ]
    )

    if(userTweet.length === 0){
        throw new ApiError(404, "No tweets found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, userTweet, "Tweets fetched successfully"));

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id");
    }

    if(!content.trim() === ""){
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content,
            }
        }, 
        {new: true}
    )

    if(!tweet){
        throw new ApiError(404, "Something went Wrong while updating Tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully"));

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id");
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId);

    if(!tweet){
        throw new ApiError(404, "Something went Wrong while deleting Tweet");
    }

    return res
        .status(200)    
        .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}