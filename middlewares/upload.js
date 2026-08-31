const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const userStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "users",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const uploadProduct = multer({ storage: productStorage });
const uploadUser = multer({ storage: userStorage });

module.exports = { upload: uploadProduct, uploadUser };
