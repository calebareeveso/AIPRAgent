import { OpenAIToolSet } from "composio-core";
import { env } from "../env.js";

const composio_toolset = new OpenAIToolSet({
  apiKey: env.COMPOSIO_API_KEY,
});

// Action 2: Reply to Email
export const replyPRAgentEmail = async (email, threadId) => {
  const tools = await composio_toolset.getTools({
    actions: ["GMAIL_REPLY_TO_THREAD"],
  });

  const action = "GMAIL_REPLY_TO_THREAD";
  const params = {
    user_id: "me",
    recipient_email: email,
    message_body: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Media Coverage Report</title>
  </head>
  <body>
 <div>
  Generating media coverage...
 </div>
  </body>
</html>`,
    thread_id: threadId,
    is_html: true,
  };

  try {
    const response = await composio_toolset.executeAction({
      action,
      params,
    });
    console.log("✅ Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return null;
  }
};

// Action 7: Send Final Email with PDF Attachment
export const sendFinalEmailWithAttachment = async (
  email,
  threadId,
  pdfS3Key,
  pdfFileName,
  htmlTable // Keep parameter for compatibility but won't use it
) => {
  try {
    console.log("📎 Using existing PDF S3 key for attachment:", pdfS3Key);

    console.log("📁 Using Composio S3 Key:", pdfS3Key);

    const tools = await composio_toolset.getTools({
      actions: ["GMAIL_REPLY_TO_THREAD"],
    });

    const action = "GMAIL_REPLY_TO_THREAD";
    const params = {
      user_id: "me",
      recipient_email: email,
      message_body: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Media Coverage Report</title>
  </head>
  <body>
 <div>
  <h3>Generated media coverage report completed!</h3>
  
  <p>Please find the attached PDF report with screenshots and detailed coverage analysis.</p>

  <p>The complete report with screenshots and media coverage analysis is attached as a PDF.</p>
 </div>
  </body>
</html>`,
      thread_id: threadId,
      is_html: true,
      attachment: {
        s3key: pdfS3Key,
        mimetype: "application/pdf",
        name: pdfFileName,
      },
    };

    console.log("📧 Email parameters:", {
      recipient: email,
      threadId: threadId,
      attachment: {
        s3key: pdfS3Key,
        mimetype: "application/pdf",
        name: pdfFileName,
      },
    });

    let response;
    try {
      response = await composio_toolset.executeAction({
        action,
        params,
      });

      console.log("📧 Composio response:", JSON.stringify(response, null, 2));

      console.log(
        "✅ Final email with PDF attachment sent successfully:",
        response
      );
    } catch (composioError) {
      console.error("❌ Composio executeAction error:", composioError);
      console.error("❌ Error details:", composioError.message);

      // Even if there's an error in Composio's response processing,
      // the email might have been sent successfully
      console.log(
        "⚠️ Email may have been sent despite Composio processing error"
      );

      // Return a partial success response
      response = {
        success: false,
        error: composioError.message,
        partialSuccess: true,
        message: "Email likely sent but response processing failed",
      };
    }

    return response;
  } catch (error) {
    console.error("❌ Error sending final email with attachment:", error);
    throw error;
  }
};