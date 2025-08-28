import puppeteer from "puppeteer";
import { uploadPDFToComposio } from "../utils/composio.js";

// Action 5: Take Screenshots and Generate PDF
export const takeScreenshotsAndGeneratePDF = async (
  searchResults,
  generatedReport
) => {
  // Simple configuration that works with Render.com
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox", 
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
    headless: true,
    executablePath: puppeteer.executablePath(), 
  });

  try {
    // Extract URLs for screenshots
    const urls = searchResults.map((result) => result.url);
    const screenshotBase64Array = [];

    console.log("📸 Taking screenshots for", urls.length, "URLs...");

    // Take screenshots
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const page = await browser.newPage();

      try {
        await page.setJavaScriptEnabled(false);
        await page.setViewport({ width: 1440, height: 1000 });
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

        const buffer = await page.screenshot({ fullPage: false, type: "png" });
        console.log(`📸 Screenshot ${i + 1}/${urls.length} taken for ${url}`);

        // Convert buffer to base64 data URL
        const base64 = buffer.toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;
        screenshotBase64Array.push(dataUrl);

        await page.close();
      } catch (error) {
        console.error(`❌ Error taking screenshot for ${url}:`, error);
        await page.close();
        // Push empty string to maintain array index alignment
        screenshotBase64Array.push("");
      }
    }

    // Generate PDF Report
    console.log("📄 Generating PDF report...");

    // Create HTML content for PDF
    const screenshotsHtml = searchResults
      .map((result, idx) => {
        if (!screenshotBase64Array[idx] || !result) return "";
        return `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <img src="${
            screenshotBase64Array[idx]
          }" style="width: 100%; max-width: 600px; border: 1px solid #ddd; border-radius: 4px;" />
          <p style="font-size: 12px; color: #666; margin-top: 5px;">${
            result.url.split("/")[2]
          } - ${result.title}</p>
        </div>
      `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Media Coverage Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1, h2, h3, h4 { color: #333; }
          .report-coverage { text-align: center; }
          .screenshots-section { margin-top: 30px; }
          .screenshots-section h3 { font-weight: 600; color: #374151; margin-bottom: 15px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="report-coverage">
          ${generatedReport}
        </div>
        
        <div class="screenshots-section">
          <h3>Coverage Screenshots</h3>
          <div>
            ${screenshotsHtml}
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const pdfPage = await browser.newPage();

    await pdfPage.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 60000, // Increased timeout to 60 seconds
    });

    const pdfBuffer = await pdfPage.pdf({
      format: "A4",
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
      printBackground: true,
    });

    await pdfPage.close();

    // Upload PDF to Composio
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pdfFileName = `pr-report-${timestamp}.pdf`;

    console.log("📎 Uploading PDF to Composio...");
    const composioS3Key = await uploadPDFToComposio(pdfBuffer, pdfFileName);

    return {
      screenshotUrls: screenshotBase64Array,
      pdfS3Key: composioS3Key, // Return Composio S3 key
      pdfFileName,
    };
  } catch (error) {
    console.error("❌ Error in takeScreenshotsAndGeneratePDF:", error);
    throw error;
  } finally {
    await browser.close();
  }
};