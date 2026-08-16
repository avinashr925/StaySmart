import path from "path";
import { isCloudinaryConfigured } from "../config/cloudinary";

export const getUploadedUrls = (reqFiles: any): string[] => {
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
      return file.path; // Cloudinary URL
    } else {
      // Local disk fallback: absolute host url path
      const filename = file.filename || path.basename(file.path);
      const port = process.env.PORT || "8081";
      const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
      return `${baseUrl}/uploads/${filename}`;
    }
  });
};
