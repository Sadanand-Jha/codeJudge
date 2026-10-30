import type { Request, Response } from "express";
import { v2 as cloudinary } from 'cloudinary';

const cloudinarySignature = async (req: Request, res: Response) => {
    try {
        const timestamp = Math.round(Date.now() / 1000);
        const params = { timestamp, folder: "letterheads" };
        const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
        res.json({ ...params, signature, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME });
    } catch (error: any) {
        console.log("Internal server error", error);
    }
}




export { cloudinarySignature };