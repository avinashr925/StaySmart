import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { Readable } from "stream";
import multer from "multer";
import path from "path";
import fs from "fs";
import https from "https";
import { logger } from "../utils/logger";
import { AppError } from "../utils/AppError";

const originalRequest = https.request;

(https as any).request = function (...args: any[]) {
  let callbackIndex = -1;
  let options: any = null;

  for (let i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === "function") {
      callbackIndex = i;
      break;
    }
  }

  if (callbackIndex > 0) {
    options = args[callbackIndex - 1];
  } else if (args.length > 0 && typeof args[0] !== "function") {
    options = args[0];
  }

  let isCloudinaryRequest = false;
  if (options) {
    if (typeof options === "string") {
      isCloudinaryRequest = options.includes("api.cloudinary.com");
    } else if (typeof options === "object") {
      isCloudinaryRequest = !!(
        options.host === "api.cloudinary.com" ||
        options.hostname === "api.cloudinary.com" ||
        (options.href && options.href.includes("api.cloudinary.com"))
      );
    }
  }

  if (isCloudinaryRequest && callbackIndex !== -1) {
    const originalCallback = args[callbackIndex];
    args[callbackIndex] = function (res: any) {
      if (res && res.statusCode === 403) {
        let body = "";
        res.on("data", (chunk: any) => {
          body += chunk;
        });
        res.on("end", () => {
          let safeMsg = "N/A";
          try {
            const parsed = JSON.parse(body);
            if (parsed && parsed.error && parsed.error.message) {
              safeMsg = parsed.error.message;
            }
          } catch (e) {
            // Body is not JSON
          }

          // eslint-disable-next-line no-console
          console.error(
            `[Cloudinary Diagnostics]\n` +
            `HTTP status: 403\n` +
            `Cloudinary error message: ${safeMsg !== "N/A" ? safeMsg : (res.headers["x-cld-error"] || "N/A")}\n` +
            `X-Cld-Error: ${res.headers["x-cld-error"] || "N/A"}\n` +
            `Cloud name present: ${!!cloudName ? "yes" : "no"}\n` +
            `API key present: ${!!apiKey ? "yes" : "no"}\n` +
            `API secret present: ${!!apiSecret ? "yes" : "no"}`
          );
        });
      } else if (res && res.headers["x-cld-error"]) {
        // eslint-disable-next-line no-console
        console.error(`[Cloudinary Diagnostics] X-Cld-Error: ${res.headers["x-cld-error"]}`);
      }

      return originalCallback(res);
    };
  }

  return originalRequest.apply(https, args as any);
};

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
          const safeDiagnostics: any = {
            message: err.message,
            http_code: err.http_code,
            name: err.name,
          };
          if (err.error) {
            safeDiagnostics.innerError = {
              message: err.error.message,
              http_code: err.error.http_code,
            };
          }
          if (err.description) {
            safeDiagnostics.description = err.description;
          }

          logger.error("[Cloudinary Diagnostics Log] Detailed upload error:", safeDiagnostics);
          // eslint-disable-next-line no-console
          console.error("[Cloudinary Diagnostics Log] Detailed upload error:", JSON.stringify(safeDiagnostics, null, 2));

          // eslint-disable-next-line no-console
          console.warn("[WARN] Cloudinary upload failed. Falling back to local disk storage:", err.message || err);

          if (isProd) {
            const errorMsg = `Cloudinary upload failed: ${err.message || "Unknown error"}`;
            const errorInstance = new AppError(errorMsg, err.http_code || 500);
            return cb(errorInstance);
          }

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
    secure: true,
  });

  const configCheck = cloudinary.config();
  const isCloudinaryConfiguredSuccessfully = !!(
    configCheck.cloud_name &&
    configCheck.api_key &&
    configCheck.api_secret
  );
  // eslint-disable-next-line no-console
  console.log(`[Cloudinary Diagnostics Log] configured: ${isCloudinaryConfiguredSuccessfully ? "yes" : "no"}`);

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
