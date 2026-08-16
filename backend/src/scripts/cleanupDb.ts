import mongoose from "mongoose";
import Listing from "../models/listing";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

async function runCleanup() {
  console.log(`Connecting to MongoDB at: ${MONGO_URL}`);
  await mongoose.connect(MONGO_URL);

  try {
    const listings = await Listing.find({});
    console.log(`Found ${listings.length} listings in database.`);

    let updatedCount = 0;
    for (const listing of listings) {
      const originalImagesCount = listing.images ? listing.images.length : 0;
      const originalDetailsCount = listing.imageDetails ? listing.imageDetails.length : 0;

      // Filter out Unsplash or placeholder images
      const cleanImages = (listing.images || []).filter(
        (img: string) => !img.includes("unsplash.com") && !img.includes("source.unsplash.com")
      );
      
      const cleanDetails = (listing.imageDetails || []).filter(
        (detail: any) => !detail.url.includes("unsplash.com") && !detail.url.includes("source.unsplash.com")
      );

      // Verify if changes are needed
      if (cleanImages.length !== originalImagesCount || cleanDetails.length !== originalDetailsCount) {
        // Recalculate cover images
        if (cleanDetails.length > 0) {
          const hasCover = cleanDetails.some((d: any) => d.isCover);
          if (!hasCover) {
            cleanDetails[0].isCover = true;
          }
        }
        
        listing.images = cleanImages;
        listing.imageDetails = cleanDetails;
        await listing.save();
        
        console.log(`Updated listing "${listing.title}" (${listing._id}):`);
        console.log(`  - Images: ${originalImagesCount} -> ${cleanImages.length}`);
        console.log(`  - Details: ${originalDetailsCount} -> ${cleanDetails.length}`);
        updatedCount++;
      }
    }
    console.log(`Cleanup complete. Updated ${updatedCount} listings.`);
  } catch (err: any) {
    console.error("Error during cleanup execution:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runCleanup();
