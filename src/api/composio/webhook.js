import express from "express";
import { env } from "../../env.js";
import { replyPRAgentEmail, sendFinalEmailWithAttachment } from "../../actions/emailActions.js";
import { searchMediaSources } from "../../actions/searchActions.js";
import { takeScreenshotsAndGeneratePDF } from "../../actions/screenshotActions.js";

const router = express.Router();

// Main webhook handler
router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    console.log("🎯 Webhook received:", payload.type);

    // Extract report data from webhook payload
    const reportData = {
      attachmentList: payload.data.attachment_list || [],
      labelIds: payload.data.label_ids || [],
      messageId: payload.data.message_id,
      messageText: payload.data.message_text,
      messageTimestamp: payload.data.message_timestamp,
      payload: payload.data.payload || null,
      preview: {
        body: payload.data.preview?.body || "",
        subject: payload.data.preview?.subject || payload.data.subject || "",
      },
      sender: payload.data.sender,
      subject: payload.data.subject,
      threadId: payload.data.thread_id,
      to: payload.data.to,
    };

    // Check if this is a media coverage report request (case-insensitive)
    const expectedSubject = "media coverage report request";
    const actualSubject = (reportData.subject || "").toLowerCase();

    if (!actualSubject.includes(expectedSubject)) {
      console.log(
        "⏭️ Skipping - Not a media coverage report request. Subject:",
        reportData.subject
      );
      return res.json({
        status: "skipped",
        message:
          "Email subject does not contain 'Media Coverage Report Request'",
        subject: reportData.subject,
      });
    }

    // Parse dynamic parameters from subject
    let daysCount = 30; // default
    let resultCount = 5; // default

    // Extract daysCount: look for number after "media coverage report request"
    const daysMatch = actualSubject.match(
      /media coverage report request[:\s]*(\d+)/i
    );
    if (daysMatch) {
      daysCount = parseInt(daysMatch[1]);
      console.log(`📅 Extracted daysCount: ${daysCount}`);
    }

    // Extract resultCount: look for number after comma
    const resultMatch = actualSubject.match(/,\s*(\d+)/);
    if (resultMatch) {
      resultCount = parseInt(resultMatch[1]);
      console.log(`🔢 Extracted resultCount: ${resultCount}`);
    }

    console.log(
      `⚙️ Using parameters - Days: ${daysCount}, Max Results: ${resultCount}`
    );

    // Extract sender email and check it's not the same as recipient
    const senderEmail =
      reportData.sender?.match(/<([^>]+)>/)?.[1] || reportData.sender;
    const recipientEmail = reportData.to;

    if (senderEmail === recipientEmail) {
      console.log(
        "⏭️ Skipping - Self-sent email detected. Sender:",
        senderEmail,
        "Recipient:",
        recipientEmail
      );
      return res.json({
        status: "skipped",
        message: "Self-sent emails are not processed",
        sender: senderEmail,
        recipient: recipientEmail,
      });
    }

    console.log("📧 Processing report request for:", reportData.subject);
    console.log("📝 Query:", reportData.messageText);

    // Action 2: Reply to Request
    console.log("\n🚀 Step 1: Sending acknowledgment email...");
    let emailFrom = reportData.sender;
    let extractedEmail = emailFrom;
    const emailMatch = emailFrom && emailFrom.match(/<([^>]+)>/);
    if (emailMatch) {
      extractedEmail = emailMatch[1];
    }

    console.log("Extracted email:", extractedEmail);
    
    // Check if the extracted email matches the AI agent email
    if (env.AI_AGENT_EMAIL && extractedEmail === env.AI_AGENT_EMAIL) {
      console.log(
        "⏭️ Skipping - AI agent email detected. Email:",
        extractedEmail
      );
      return res.json({
        status: "skipped",
        message: "AI agent emails are not processed",
        email: extractedEmail,
      });
    }
    
    const emailResponse = await replyPRAgentEmail(
      extractedEmail,
      reportData.threadId
    );
    if (!emailResponse) {
      throw new Error("Failed to send acknowledgment email");
    }

    // Action 3: Search for Media Sources
    console.log("\n🔍 Step 2: Searching for media sources...");
    const searchData = await searchMediaSources(
      reportData.messageText,
      daysCount,
      resultCount
    );

    if (!searchData.searchResults || searchData.searchResults.length === 0) {
      throw new Error("No search results found");
    }

    // Action 5: Take Screenshots and Generate PDF
    console.log("\n📸 Step 3: Taking screenshots and generating PDF...");
    const screenshotData = await takeScreenshotsAndGeneratePDF(
      searchData.searchResults,
      searchData.generatedReport
    );

    // Action 7: Send Final Email with PDF Attachment (no analytics table)
    console.log("\n📧 Step 4: Sending final email with PDF attachment...");
    const finalEmailResponse = await sendFinalEmailWithAttachment(
      extractedEmail,
      reportData.threadId,
      screenshotData.pdfS3Key,
      screenshotData.pdfFileName,
      "" // Empty HTML table since we removed analytics
    );

    if (!finalEmailResponse || finalEmailResponse.partialSuccess) {
      console.warn(
        "⚠️ Email sending completed but with Composio processing issues"
      );
      if (finalEmailResponse?.partialSuccess) {
        console.log(
          "✅ Email likely sent successfully despite processing error"
        );
      }
    }

    // Final summary
    console.log("\n✅ PROCESSING COMPLETE!");
    console.log("📊 Results Summary:");
    console.log(`   • Search results: ${searchData.searchResults.length}`);
    console.log(
      `   • Screenshots taken: ${screenshotData.screenshotUrls.length}`
    );
    console.log(`   • PDF saved: ${screenshotData.pdfFileName}`);
    console.log(
      `   • Final email sent: ${
        finalEmailResponse ? "✅ Success" : "❌ Failed"
      }`
    );

    return res.json({
      status: "success",
      message: "Media coverage report processed successfully",
      data: {
        reportData: reportData || {},
        searchResultsCount: searchData?.searchResults?.length || 0,
        screenshotsCount: screenshotData?.screenshotUrls?.length || 0,
        pdfGenerated: screenshotData?.pdfFileName || "Not generated",
        finalEmailSent:
          !!finalEmailResponse || finalEmailResponse?.partialSuccess,
      },
    });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({
      status: "error",
      message: "Internal server error while processing webhook",
      error: error?.message || "Unknown error occurred",
      stack:
        process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
  }
});

router.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Webhook endpoint is active",
  });
});

export default router;