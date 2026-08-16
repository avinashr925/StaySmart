import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { Readable } from "stream";
import multer from "multer";
import path from "path";
import fs from "fs";

const isProd = process.env.NODE_ENV === "production";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

const hasCloudinary = !!(cloudName && apiKey && apiSecret);

if (isProd && !hasCloudinary) {
  throw new Error(
    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET before starting StaySmart."
  );
}

let storage: any;
let isConfigured = false;

const uploadDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

class FallbackStorage implements multer.StorageEngine {
  private cloudinaryStorage: any;
  private diskStorage: any;

  constructor(cloudinaryStorage: any, diskStorage: any) {
    this.cloudinaryStorage = cloudinaryStorage;
    this.diskStorage = diskStorage;
  }

  _handleFile(req: any, file: any, cb: any) {
    const chunks: any[] = [];
    file.stream.on("data", (chunk: any) => chunks.push(chunk));
    file.stream.on("error", (err: any) => cb(err));
    file.stream.on("end", () => {
      const buffer = Buffer.concat(chunks);

      // Re-create stream for Cloudinary
      const fileForCloudinary = {
        ...file,
        stream: Readable.from(buffer),
      };

      this.cloudinaryStorage._handleFile(req, fileForCloudinary, (err: any, info: any) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.warn("[WARN] Cloudinary upload failed. Falling back to local disk storage:", err.message || err);

          // Re-create stream for DiskStorage
          const fileForDisk = {
            ...file,
            stream: Readable.from(buffer),
          };
          this.diskStorage._handleFile(req, fileForDisk, cb);
        } else {
          cb(null, info);
        }
      });
    });
  }

  _removeFile(req: any, file: any, cb: any) {
    this.cloudinaryStorage._removeFile(req, file, (err: any) => {
      this.diskStorage._removeFile(req, file, cb);
    });
  }
}

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder: "staysmart",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    }),
  });

  storage = new FallbackStorage(cloudinaryStorage, localDiskStorage);
  isConfigured = true;
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] Cloudinary is not configured. Image uploads will fall back to local disk storage in development."
  );

  storage = localDiskStorage;
}

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    const filetypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Only images (jpeg, jpg, png, gif, webp) and documents (pdf, doc, docx, txt) are allowed."));
  }
});

export { cloudinary };
export const isCloudinaryConfigured = isConfigured;
