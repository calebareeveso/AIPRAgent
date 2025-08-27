import crypto from "crypto";
import { env } from "../env.js";

// Helper function to upload PDF to Composio
export const uploadPDFToComposio = async (pdfBuffer, fileName) => {
  try {
    console.log("📎 Starting Composio upload process...");
    console.log("📎 PDF buffer size:", pdfBuffer?.length || "undefined");
    console.log("📎 File name:", fileName);

    if (!pdfBuffer || !fileName) {
      throw new Error("PDF buffer or filename is missing");
    }

    // Calculate MD5 hash of the PDF buffer
    const md5Hash = crypto.createHash("md5").update(pdfBuffer).digest("hex");
    console.log("📎 MD5 hash calculated:", md5Hash);

    // Request upload URL from Composio
    const uploadResponse = await fetch(
      "https://backend.composio.dev/api/v3/files/upload/request",
      {
        method: "POST",
        headers: {
          "x-api-key": env.COMPOSIO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolkit_slug: "gmail",
          tool_slug: "GMAIL_REPLY_TO_THREAD",
          filename: fileName,
          mimetype: "application/pdf",
          md5: md5Hash,
        }),
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(
        `Composio upload request failed: ${uploadResponse.status}`
      );
    }

    const uploadData = await uploadResponse.json();
    console.log(
      "📎 Composio upload response:",
      JSON.stringify(uploadData, null, 2)
    );

    const s3key = uploadData.key;
    const uploadUrl =
      uploadData.new_presigned_url || uploadData.newPresignedUrl;

    if (!s3key || !uploadUrl) {
      throw new Error(
        `Invalid Composio response - missing key or url: ${JSON.stringify(
          uploadData
        )}`
      );
    }

    console.log("📎 Composio upload URL received:", uploadUrl);
    console.log("📎 Composio S3 key:", s3key);

    // Upload the PDF buffer to the provided URL
    const fileUploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: pdfBuffer,
      headers: {
        "Content-Type": "application/pdf",
      },
    });

    if (!fileUploadResponse.ok) {
      throw new Error(
        `File upload to Composio failed: ${fileUploadResponse.status}`
      );
    }

    console.log("✅ PDF uploaded to Composio successfully");
    return s3key;
  } catch (error) {
    console.error("❌ Error uploading PDF to Composio:", error);
    throw error;
  }
};
