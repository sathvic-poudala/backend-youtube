import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields(
        [{
            name: "avatar",
            maxCount: 1
        },
        {
             name: "coverImage",
            maxCount: 1
        }]
    ),
    registerUser
)
router.route("/login").post(loginUser)

//secure routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refersh-token").post(refreshAccessToken)
router.route("/changeCurrentPassword").post(verifyJWT,changeCurrentPassword)
router.route("/getCurrentUser").post(getCurrentUser)
router.route("/updateAccountDetails").post(verifyJWT,updateAccountDetails)
router.route("/updateAvatar").post(
    upload.single("avatar"),
    verifyJWT,
    updateAccountDetails
)
router.route("/updateCoverImage").post(
    upload.single("coverImage"),
    verifyJWT,
    updateCoverImage
)

export default router