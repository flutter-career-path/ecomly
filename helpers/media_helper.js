const multer = require('multer');
const util = require('util');
const { unlink } = require('node:fs');

const ALLOWED_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    const filename = file.originalname
      .replace(' ', '-')
      .replace('.png', '')
      .replace('.jpg', '')
      .replace('.jpeg', '');
    const extension = ALLOWED_EXTENSIONS[file.mimetype];
    cb(null, `${filename}-${Date.now()}.${extension}`);
  },
});

exports.upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: (req, file, cb) => {
    const isValid = ALLOWED_EXTENSIONS[file.mimetype];
    let uploadError = new Error(
      `Invalid image type\n${file.mimetype} is not allowed`
    );
    if (isValid) return cb(null, true);

    return cb(uploadError);
  },
});

exports.deleteImages = async function deleteImages(imageUrls) {
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const imagePath = path.join(
        __dirname,
        'public',
        'uploads',
        path.basename(imageUrl)
      );
      try {
        const unlinkOperation = util.promisify(unlink(imagePath));
        await unlinkOperation();
      } catch (error) {
        console.error(`Error deleting image: ${error.message}`);
        throw error;
      }
    })
  );
};
