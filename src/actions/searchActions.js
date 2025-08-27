import { env } from "../env.js";

// Action 3: Search for Media Sources
export const searchMediaSources = async (query, daysCount = 30, resultCount = 5) => {
  try {
    const requestBody = {
      query: query,
      topic: "news",
      search_depth: "basic",
      chunks_per_source: 3,
      max_results: resultCount,
      time_range: null,
      days: daysCount,
      include_raw_content: false,
      include_images: false,
      include_image_descriptions: false,
      include_domains: [],
      exclude_domains: [],
      country: "united kingdom",
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    const response = await fetch("https://api.tavily.com/search", options);
    const data = await response.json();

    const prompt = `
    Generate a PR coverage report from the following JSON data.
    Each item in the data contains fields like 'url', 'title', 'published_date', and a 'content' field.
    
    **IMPORTANT INSTRUCTIONS:**
    
    0.  **FIRST**: Start with an HTML <h1> tag containing the report title. Extract the main subject/person from the query "${query}" and create a title like "[Subject Name] PR Coverage Report". For example: "Ed Sheeran PR Coverage Report" or "Taylor Swift PR Coverage Report". The <h1> should be the very first element in your output.
    1.  **DO NOT** wrap the entire output in markdown code blocks (e.g., \`\`\`html).
    2.  **DO NOT** use Unicode escape sequences (e.g., \\u003C) for HTML tags. Output raw HTML tags directly (e.g., <div>, <h3>).
    3.  Each individual coverage item **MUST** be wrapped in an **HTML <div> tag**.
    4.  Inside each **<div>**:
        * The 'title' field should be used to derive the source and headline.
            * The **source** (e.g., "HuffPost", "Billboard") should be extracted from the end of the 'title' field (after the last ' - ') and wrapped in an **HTML <h3> tag**.
            * The **headline** (the main part of the 'title' before the source) should be wrapped in an **HTML <h4> tag**.
            * **IMPORTANT:** Inside each <h4>, the headline text MUST be wrapped in an anchor tag (<a>) whose href is the "url" field for that item.
        * For the **description**:
            * **Analyze and synthesize** the content to create a well-written, coherent summary.
            * Focus on the key points and newsworthy elements.
            * Maintain journalistic style and tone.
            * Keep descriptions concise but informative (2-3 sentences).
            * Avoid direct copying - instead, compose a fresh summary that captures the essence.
            * The summary **MUST** be wrapped in an **HTML <p> tag**.
    
    Here is the JSON data to process:
    ${JSON.stringify(data)}
    `;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GOOGLE_API_KEY ?? "",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log(
      "✅ Search completed, found",
      data.results?.length || 0,
      "results"
    );

    return {
      searchResults: data.results || [],
      generatedReport: generatedText,
    };
  } catch (error) {
    console.error("❌ Error in searchMediaSources:", error);
    throw error;
  }
};
