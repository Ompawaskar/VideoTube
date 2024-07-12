import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'

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

    if (!avatarLocalPath)
        throw new ApiError(400, "Avatar Image is Required.")

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
    await User.findByIdAndUpdate(_id, { $set: { refreshToken: undefined } })

    const options = {
        httpOnly: true,
        secured: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User LoggedOut Succesfully"))
})

export const refreshAccessToken = asyncHandler(async (req,res) => {
   
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    console.log(incomingRefreshToken);

    if(!incomingRefreshToken)
        throw new ApiError(401,"Unauthorized Request")

    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)
    console.log(user);

    if(!user)
        throw new ApiError(401, "Invalid refresh token")

    if(incomingRefreshToken !== user.refreshToken)
        throw new ApiError(401,"Refresh Token Expired or already used.")

    const options ={
        httpOnly: true,
        secure: true
    }

    const {accessToken , refreshToken} = await generateAccessandRefreshToken(user)

    res.status(200).
        cookie("accessToken",accessToken,options).
        cookie("refreshToken",refreshToken,options).
        json(new ApiResponse(200 , {accessToken , refreshToken}, "Access Token refreshed"))

})




