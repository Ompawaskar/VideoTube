import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from '../models/user.model.js'
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

const generateAccessandRefreshToken = async (exsistingUser) => {
    try {
        const accessToken = exsistingUser.generateAccessToken();
        const refreshToken = exsistingUser.generateRefreshToken();

        exsistingUser.refreshToken = refreshToken;
        await exsistingUser.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Error Generating access and refresh tokens")
    }
}
export const registerUser = asyncHandler(async (req, res) => {
    const { email, password, fullname, username } = req.body;
    if ([email, password, fullname, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All field are required.");
    }

    const exsistingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (exsistingUser) {
        throw new ApiError(409, "User already exsists");
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath = "";
    let avatarLocalPath = "";

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage[0]) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar[0]) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    if (!avatarLocalPath) {
        console.log("No Avatar Local Path");
        throw new ApiError(400, "Avatar Image is Required.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar)
        throw new ApiError(400, "Avatar Image is Required.")

    const user = await User.create({
        email,
        password,
        fullname,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Error Creating User. Try Again Later")
    }

    console.log("Registered");
    return res.status(200).json(new ApiResponse(200, createdUser, "User Registered Successfully."));

});

export const loginUser = asyncHandler(async (req, res) => {
    //Extract email and password from req
    //Check if email exsists
    //Check if password is correct
    //Return access and refresh token to user.

    const { email, username, password } = req.body;

    if (!(email || username)) {
        throw new ApiError(400, "Fill in all credentials.")
    }

    const exsistingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!exsistingUser) {
        throw new ApiError(400, "User does not exsists");
    }

    const isPasswordValid = await exsistingUser.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Incorrect Password")
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshToken(exsistingUser);

    const options = {
        httpOnly: true,
        secure: true
    }

    const loggedInUser = await User.findById(exsistingUser._id).select("-password -refreshToken");

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, loggedInUser, "Logged In."));

})

export const logoutUser = asyncHandler(async (req, res) => {
    // Find user
    // Clear tokens from cookies
    //Reset refreshTOken in DB
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        })

    const options = {
        httpOnly: true,
        secured: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User LoggedOut Succesfully"))
})

export const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    console.log(incomingRefreshToken);

    if (!incomingRefreshToken)
        throw new ApiError(401, "Unauthorized Request")

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)
    console.log(user);

    if (!user)
        throw new ApiError(401, "Invalid refresh token")

    if (incomingRefreshToken !== user.refreshToken)
        throw new ApiError(401, "Refresh Token Expired or already used.")

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshToken(user)

    res.status(200).
        cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).
        json(new ApiResponse(200, { accessToken, refreshToken }, "Access Token refreshed"))

})

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect)
        throw new ApiError(400, "Old Password is not correct.")

    user.password = newPassword;

    await user.save({ validateBeforeSave: false })

    res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

export const getCurrentUser = asyncHandler(async (req, res) => {

    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"))

})

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body

    if (!(fullname || email))
        throw new ApiError(400, "Fill all fields")

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: { fullname, email }
    },
        { new: true }).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Account Details Updated"))

})

export const updateFiles = asyncHandler(async (req, res) => {
    let avatarLocalPath = "";
    let coverImageLocalPath = "";

    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar[0])
        avatarLocalPath = req.files.avatar[0].path

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage[0])
        coverImageLocalPath = req.files.coverImage[0].path

    if (!(avatarLocalPath || coverImageLocalPath))
        throw new ApiError(400, "Resource not Found")

    const newAvatar = avatarLocalPath && await uploadOnCloudinary(avatarLocalPath)
    const newCoverImage = coverImageLocalPath && await uploadOnCloudinary(coverImageLocalPath)

    const user = req.user
    const oldAvatar = user.avatar
    const oldCoverImage = user.coverImage

    if (newAvatar)
        await deleteFromCloudinary(oldAvatar)

    if (newCoverImage)
        await deleteFromCloudinary(oldCoverImage)

    const newUser = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                avatar: newAvatar ? newAvatar.url : oldAvatar,
                coverImage: newCoverImage ? newCoverImage.url : oldCoverImage
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, { user: newUser }, "Files uploaded successfully"))

})

export const getUserChannelProfile = asyncHandler(async (req, res) => {
    console.log("Hello");
    const { username } = req.params
    if (!username?.trim())
        throw new ApiError(401, "Username Doesnt Exsist.")

    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscriberedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscriberedToCount: 1,
                isSubscribed: 1
            }
        }

    ])

    if (!channel?.length)
        throw new ApiError(404, "Channel Doesnt Exsist")

    return res.status(200).json(
        new ApiResponse(200, channel[0], "User Channel Fetched")
    )
})

export const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user._id) }
        },
        {
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
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched Successfully"))
})


