import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import jws  from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken

    await user.save({validationBeforeSave: false})

    return {
        accessToken,
        refreshToken
    }
}

const registerUser = asyncHandler(async(req,res) => {
    //get user details from front end
    //check if all the required feild are present
    //check if user already exits
    //upload pic to cloudinary and get url
    //create user object
    //remove password and refresh token feild from response
    //check for user creation
    //return

    const {userName,email,fullName,password} = req.body;

    if (
        [userName,email,fullName,password].some((feild) => feild?.trim() === "")
    ) {
        throw new ApiError(400,"all feilds are required")
    }

    if(!email.includes('@')) {
        throw new ApiError(400,"email not valid")
    }

    const userExists = await User.findOne({
        $or:[{userName},{email}]
    }) 

    if(userExists) {
        throw new ApiError(409,"user or email already exists")
    }
    
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    

    if(!avatarLocalPath) {
        throw new ApiError(400,"avatar is required1");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(500,"avatar is required");
    }

    const user = await User.create({
        fullName,
        userName: userName.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        email,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refershToken"
    )
    if(!createdUser) {
        throw new ApiError(500,"smth went wrong while regestering user")
    }

    return res.status(201).json(
        new ApiResponse(200,"user created successfully", createdUser)
    )
})

const loginUser = asyncHandler(async(req,res) => {
    
    //first get details username and password 
    //check credentials
    //generate acces and refresh token
    //send using secoure cookies

    const {userName,email,password} = req.body;

    if(!userName && !email) {
        throw new ApiErrorError(400,"all feilds are required");
    }

    if(email && !email.includes("@")) {
        throw new ApiError(400,"invalid email")
    }

    const user = await User.findOne({
        $or: [{userName},{email}]
    })

    if(!user) {
        throw new ApiError(400,"user not present plz register first")
    }

    const flagForPasswordValidaton = await user.isPasswordMatch(password)

    if(!flagForPasswordValidaton) {
        throw new ApiError(400,"wrong password")
    }

    const {refreshToken,accessToken} = await generateAccessAndRefreshToken(user._id)

    user.refershToken = refreshToken;

   const loggedInUser = user.toObject();

    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .status(201)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            201,
            "user logged in sucessfully",
            {
                refreshToken,
                accessToken,
                user: loggedInUser
            }
        )
    )

})

const logoutUser = asyncHandler(async(req,res) => {
    /** destroy cookies and remove refersh token from user in mongodb database */
    const userId = req.user?._id

    User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                refershToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200,"user logged out"))

})

const refreshAccessToken = asyncHandler(async(req,res) => {
    //get user refersh token 
    //validate it
    //generate new access and refresh tokens
    //store refresh token in db and send new tokens to user
    const token = req.cookie?.refershToken || req.body.refershToken

    if(!token) {
        throw new ApiError(401,"user not authorized")
    }

    const decodedRefreshToken = jwt.verify(token,process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedRefreshToken._id)

    if(!user) {
        throw new ApiError(401,"invalid refreshToken")
    }

    if(token !== user.refershToken) {
        throw new ApiError(401,"refershToken expired")
    }

    const {refershToken,accessToken} =  await generateAccessAndRefreshToken(user)

    options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)  
    .cookie("refershToken",refreshToken,options)
    .json(
        new ApiError(201,
            "tokens generated successfully",
            {
                accessToken,
                refershToken
            }
        )
    )

})

const changeCurrentPassword = asyncHandler(async(req,res) => {

    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isOldPasswordMatch = await user.isPasswordMatch(oldPassword)

    if (!isOldPasswordMatch) {
        throw new ApiError(401,"user not authorized");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "password updated successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "current user fetched successfully",
            req.user
        )
    )
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {email,fullName} = req.body

    if(!email || !fullName) {
        throw new ApiError(400,"all feilds are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            fullName,
            email
        }
    }).select(
        "-password"
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,
            "account details updated succesfully",
            {
                user
            }
        )
    )

})

const updateAvatar = asyncHandler(async(req,res) => {
    const newAvatar = req.file?.path

    if(!newAvatar) {
        throw ApiError(400, "new avatar is required")
    }

    const newAvatarUrl = await uploadOnCloudinary(newAvatar).url

    if(!newAvatarUrl) {
        throw ApiError(500, "some problem while uploading in cloudinary")
    }

    const oldAvatarUrl = req.user.avatar;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: newAvatarUrl
            }
        },
        {new: true}
    ).select(
        "-password -refreshToken"
    )

    if (oldAvatarUrl) {
        await deleteFromCloudinary(oldAvatarUrl);
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "avatar updated successfully",
        user
))
    
})

const updateCoverImage = asyncHandler(async(req,res) => {
    const newCoverImage = req.file?.path

    if(!newCoverImage) {
        throw ApiError(400, "new cover image is required")
    }

    const newCoverImageUrl = await uploadOnCloudinary(newCoverImage).url

    if(!newCoverImageUrl) {
        throw ApiError(500, "some problem while uploading in cloudinary")
    }

    const oldCoverImageUrl = req.user.coverImage;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: newCoverImageUrl
            }
        },
        {new: true}
    ).select(
        "-password"
    )

    if (oldCoverImageUrl) {
        await deleteFromCloudinary(oldCoverImageUrl);
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "coverImage updated successfully",
        user
))
    
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage
}