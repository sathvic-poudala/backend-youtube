import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from 'fs';
import "../config/cloudinary.js"



const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(
            localFilePath, {
              resource_type: 'auto'
           }
        )

        fs.unlinkSync(localFilePath);
        
        return response;
        
    } catch (error) {
        console.log("Cloudinary upload error:", error);
        fs.unlinkSync(localFilePath);
        return null;
    }
}

const deleteFromCloudinary = async (publicURL) => {
    try {
        if(!publicURL) return null;
    
        const urlParts = cloudinaryUrl.split("/");
        const fileName = urlParts[urlParts.length - 1]; 
        const publicId = fileName.split(".")[0];
    
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
        
    } catch (error) {
        console.log("cloudinary deletion error: ", error)
        return null;
    }
}


export { 
        uploadOnCloudinary,
        deleteFromCloudinary
    }