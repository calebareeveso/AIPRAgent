import { transformRawData, generateHTMLTable } from "../utils/formatters.js";

// Action 6: Get Analytics and Log Markdown Table
export const getAnalyticsAndLogTable = async (searchResults) => {
  try {
    if (!searchResults || !Array.isArray(searchResults)) {
      console.warn("⚠️ No search results provided for analytics");
      return [];
    }

    console.log(
      "📊 Gathering analytics data for",
      searchResults.length,
      "domains..."
    );

    const analyticsData = [];

    for (const result of searchResults) {
      try {
        if (!result || !result.url) {
          console.warn("⚠️ Skipping invalid result:", result);
          continue;
        }

        const domain = result.url.split("/")[2];
        const response = await fetch(
          `https://data.similarweb.com/api/v1/data?domain=${domain}`,
          { method: "GET" }
        );

        if (!response.ok) {
          console.error(
            `❌ SimilarWeb API error for ${domain}:`,
            response.status
          );
          continue;
        }

        const data = await response.json();
        const transformedData = transformRawData(data);
        analyticsData.push(transformedData);

        console.log(`📊 Analytics gathered for: ${domain}`);
      } catch (error) {
        console.error(
          `❌ Error getting analytics for domain ${domain}:`,
          error
        );
      }
    }

    // Generate and log markdown table
    const markdownTable = generateHTMLTable(analyticsData);
    console.log("\n📊 ANALYTICS SUMMARY TABLE:\n");
    console.log(markdownTable);

    return analyticsData;
  } catch (error) {
    console.error("❌ Error in getAnalyticsAndLogTable:", error);
    throw error;
  }
};
