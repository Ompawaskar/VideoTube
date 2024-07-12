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

        console.log("localpath",localpath);

        const uploadResult = await cloudinary.uploader
            .upload(
                localpath,
                {
                    resource_type: "auto"
                }
            )
        console.log("Cloudinary Response", uploadResult.url);
        fs.unlinkSync(localpath);
        return uploadResult;

    } catch (error) {
        fs.unlinkSync(localpath); // Remove locally saved temporary filed
        return null;
    }

}

export const deleteFromCloudinary = async (url) => {
    try {
        const public_id = url.split('/').pop().split('.')[0];
        if (!public_id) {
            console.log("No URL provided for deletion.");
            return null;
        }

        const deleteResult = await cloudinary.uploader.destroy(public_id);

        if (deleteResult.result !== 'ok') {
            console.log("Could not delete resource:", deleteResult);
            return deleteResult;
        }

        console.log("Resource deleted successfully:", deleteResult);
        return deleteResult;

    } catch (error) {
        console.error("Error deleting resource from Cloudinary:", error);
        throw error;
    }
}





