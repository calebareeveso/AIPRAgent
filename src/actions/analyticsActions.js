import { transformRawData, generateHTMLTable } from "../utils/formatters.js";

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// List of CORS proxy services to bypass IP blocking
const PROXY_SERVICES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// Helper function to fetch with proxy rotation
const fetchWithProxy = async (url, maxRetries = 3) => {
  // First try direct request
  try {
    console.log(`🔄 Trying direct request to: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 10000,
    });

    if (response.ok) {
      console.log(`✅ Direct request successful`);
      return await response.json();
    } else if (response.status === 403) {
      console.log(`🚫 Direct request blocked (403), trying proxy services...`);
    } else {
      console.log(`⚠️ Direct request failed with status: ${response.status}`);
    }
  } catch (error) {
    console.log(`⚠️ Direct request error: ${error.message}`);
  }

  // Try proxy services if direct request fails
  for (let i = 0; i < PROXY_SERVICES.length && i < maxRetries; i++) {
    const proxyUrl = PROXY_SERVICES[i];
    
    try {
      console.log(`🔄 Trying proxy ${i + 1}/${PROXY_SERVICES.length}: ${proxyUrl.split('?')[0]}...`);
      
      const proxiedUrl = proxyUrl + encodeURIComponent(url);
      const response = await fetch(proxiedUrl, {
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://dawbellaipragent.onrender.com',
          'Referer': 'https://dawbellaipragent.onrender.com/',
        },
        timeout: 15000, // Longer timeout for proxy requests
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Proxy request successful via: ${proxyUrl.split('?')[0]}`);
        return data;
      } else {
        console.log(`❌ Proxy ${i + 1} failed with status: ${response.status}`);
      }
    } catch (proxyError) {
      console.log(`❌ Proxy ${i + 1} error: ${proxyError.message}`);
    }

    // Add delay between proxy attempts
    if (i < PROXY_SERVICES.length - 1) {
      await delay(100);
    }
  }

  console.log(`❌ All proxy attempts failed for: ${url}`);
  return null;
};

// Helper function to make analytics request with proxy support
const fetchAnalyticsWithProxy = async (domain) => {
  try {
    const url = `https://data.similarweb.com/api/v1/data?domain=${domain}`;
    console.log(`📊 Fetching analytics for ${domain}...`);
    
    const data = await fetchWithProxy(url);
    
    if (data) {
      console.log(`✅ Successfully fetched analytics for: ${domain}`);
      return data;
    } else {
      console.log(`⚠️ Failed to fetch analytics for: ${domain}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching analytics for ${domain}:`, error.message);
    return null;
  }
};

// Fallback function to generate mock analytics data when API fails
const generateFallbackAnalytics = (domain) => {
  return {
    siteName: domain,
    globalRank: null,
    engagements: {
      bounceRate: "N/A",
      monthlyVisits: "N/A",
      timeOnSite: "N/A",
      pagePerVisit: "N/A",
    },
    trafficSources: {
      social: 0,
      search: 0,
      direct: 0,
    },
  };
};

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
      "domains using proxy services..."
    );

    const analyticsData = [];
    let successCount = 0;

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      
      try {
        if (!result || !result.url) {
          console.warn("⚠️ Skipping invalid result:", result);
          continue;
        }

        const domain = result.url.split("/")[2];
        console.log(`📊 Processing ${domain} (${i + 1}/${searchResults.length})...`);

        // Add delay between requests to be respectful to proxy services
        if (i > 0) {
          await delay(100); // 2 second delay between requests
        }

        const data = await fetchAnalyticsWithProxy(domain);
        
        if (data) {
          const transformedData = transformRawData(data);
          analyticsData.push(transformedData);
          successCount++;
          console.log(`✅ Analytics processed for: ${domain}`);
        } else {
          // Use fallback data when all proxy attempts fail
          console.log(`⚠️ Using fallback data for: ${domain}`);
          const fallbackData = generateFallbackAnalytics(domain);
          analyticsData.push(fallbackData);
        }
      } catch (error) {
        console.error(`❌ Error processing analytics for domain:`, error.message);
        
        // Add fallback data even on error
        const domain = result?.url?.split("/")[2] || "unknown";
        const fallbackData = generateFallbackAnalytics(domain);
        analyticsData.push(fallbackData);
      }
    }

    console.log(`📊 Analytics summary: ${successCount}/${searchResults.length} successful via proxy, ${analyticsData.length} total entries`);

    // Generate and log HTML table
    const htmlTable = generateHTMLTable(analyticsData);
    console.log("\n📊 ANALYTICS SUMMARY TABLE:\n");
    console.log(htmlTable);

    return analyticsData;
  } catch (error) {
    console.error("❌ Error in getAnalyticsAndLogTable:", error);
    
    // Return empty array instead of throwing to prevent webhook failure
    console.log("⚠️ Returning empty analytics data due to error");
    return [];
  }
};