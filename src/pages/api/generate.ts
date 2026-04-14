import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { PinataSDK } from "pinata";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});

type Data = {
  success: boolean;
  metadataUri?: string;
  imageUrl?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid prompt" });
  }

  try {
    // 1. Generate image using OpenAI
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64Json = response.data?.[0]?.b64_json;
    if (!b64Json) {
      throw new Error("No image data returned from OpenAI");
    }

    // 2. Convert base64 to File object for Pinata
    const buffer = Buffer.from(b64Json, "base64");
    const file = new File([buffer], "art.png", { type: "image/png" });

    // 3. Upload Image to Pinata IPFS
    const uploadImageRes = await pinata.upload.public.file(file);
    const imageUri = `ipfs://${uploadImageRes.cid}`;

    // 4. Create Metadata JSON
    const metadata = {
      name: "MetaArt AI Generation",
      description: prompt,
      image: imageUri,
    };

    // 5. Upload Metadata to Pinata IPFS
    const uploadMetadataRes = await pinata.upload.public.json(metadata);
    const metadataUri = `ipfs://${uploadMetadataRes.cid}`;

    const imageUrl = `https://gateway.pinata.cloud/ipfs/${uploadImageRes.cid}`;
    return res.status(200).json({ success: true, metadataUri, imageUrl });
  } catch (error: any) {
    console.error("Error generating or pinning NFT:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
}
