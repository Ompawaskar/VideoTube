import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const registerUser = asyncHandler(async (req,res) => {
    const { email, password , fullname, username} = req.body;

    if([email, password , fullname, username].some((field) => field?.trim() === "")){
        throw new ApiError(400,"All field are required.");
    }

    const exsistingUser = await User.findOne({ $or: [{email} , {username}]})
    if(exsistingUser){
        throw new ApiError(409,"User already exsists");
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath = "";
    let avatarLocalPath = "";

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage[0]){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar[0]){
        avatarLocalPath = req.files.avatar[0].path;
    }

    if(!avatarLocalPath)
        return res.status(400).json(new ApiError(400,"Avatar Image is Required."))

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar)
        throw new ApiError(400,"Avatar Image is Required.")

    const user = await User.create({
        email,
        password,
        fullname,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500 , "Error Creating User. Try Again Later")
    }

    return res.status(200).json(new ApiResponse(200,createdUser, "User Registered Successfully."));

})

