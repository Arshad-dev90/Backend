import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
        },
    ],
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    refreshToken: {
        type: String,
    }
}, {timestamps: true});

userSchema.pre("save", async function(next){
    if (!this.isModified("password")) return next()
        this.password = await bcrypt.hash(this.password, 10);
        next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

//short duration token
userSchema.methods.generateAccessToken = function(){
    const token = jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
    }, 
    process.env.ACCESS_JWT_SECRET,
    {expiresIn: process.env.JWT_ACCESS_EXPIRY});
    return token;
}


userSchema.methods.generateRefreshToken = function(){
    const reftoken = jwt.sign({_id: this._id}, process.env.REFRESH_JWT_SECRET, {expiresIn: process.env.JWT_REFRESH_EXPIRY});
    return reftoken;
}

export const User = mongoose.model("User", userSchema);