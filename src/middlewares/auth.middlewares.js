import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';

const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!token)
            throw new ApiError(500, "Access Token is required")
    
        const { _id } = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(_id).select('-password -refreshToken');
    
        if(!user){
            throw new ApiError(400,"Invalid Access Token")
        }
        
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error)
    }

})

export {verifyJWT}

