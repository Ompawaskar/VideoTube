import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

export const uploadOnCloudinary = async (localpath) => {
    try {

        if (!localpath)
            return null;

        const uploadResult = await cloudinary.uploader
            .upload(
                localpath,
                {
                    resource_type: "auto"
                }
            )
        console.log("Cloudinary Response", uploadResult.url);
        return uploadResult;

    } catch (error) {
        fs.unlinkSync(localpath); // Remove locally saved temporary filed
        return null;
    }

}



