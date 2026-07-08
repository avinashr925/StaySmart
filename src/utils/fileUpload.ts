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
    if (isCloudinaryConfigured) {
      return file.path; // Cloudinary URL
    } else {
      // Local disk fallback: absolute url path
      return `/uploads/${file.filename}`;
    }
  });
};
