import path from "path";
import { isCloudinaryConfigured } from "../config/cloudinary";

export const getUploadedUrls = (reqFiles: any, req?: any): string[] => {
  if (!reqFiles) return [];
  
  let files: Express.Multer.File[] = [];
  
  if (Array.isArray(reqFiles)) {
    files = reqFiles as Express.Multer.File[];
  } else if (reqFiles && typeof reqFiles === "object") {
    // Handle cases where files is a dictionary field
    const fieldValues = Object.values(reqFiles);
    files = fieldValues.flat() as Express.Multer.File[];
  }

  return files.map((file: any) => {
    if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
      return file.path.replace(/^http:\/\//i, "https://"); // Force https on Cloudinary URLs
    } else {
      // Local disk fallback: absolute host url path
      const filename = file.filename || path.basename(file.path);
      let baseUrl = process.env.APP_URL;
      if (!baseUrl && req) {
        baseUrl = `${req.protocol}://${req.get("host")}`;
      }
      if (!baseUrl) {
        const port = process.env.PORT || "8081";
        baseUrl = `http://localhost:${port}`;
      }
      return `${baseUrl}/uploads/${filename}`;
    }
  });
};
