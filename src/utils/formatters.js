// Helper function to format numbers
export const formatNumber = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

// Helper function to transform analytics data
export const transformRawData = (raw) => {
  const monthlyVisitsArr = Object.entries(raw.EstimatedMonthlyVisits || {});
  const latestMonth = monthlyVisitsArr.sort((a, b) =>
    b[0].localeCompare(a[0])
  )[0];
  const monthlyVisits = latestMonth ? latestMonth[1] : null;

  return {
    siteName: raw.SiteName,
    globalRank: raw.GlobalRank?.Rank ?? null,
    engagements: {
      bounceRate: Number(raw.Engagments?.BounceRate).toFixed(2),
      monthlyVisits: monthlyVisits ? formatNumber(Number(monthlyVisits)) : null,
      timeOnSite: raw.Engagments?.TimeOnSite
        ? Math.round(Number(raw.Engagments.TimeOnSite)) + "s"
        : null,
      pagePerVisit: Number(raw.Engagments?.PagePerVisit).toFixed(1),
    },
    trafficSources: {
      social: Number(raw.TrafficSources?.Social ?? 0),
      search: Number(raw.TrafficSources?.Search ?? 0),
      direct: Number(raw.TrafficSources?.Direct ?? 0),
    },
  };
};

// Helper function to generate HTML table
export const generateHTMLTable = (analyticsData) => {
  if (!analyticsData || analyticsData.length === 0) {
    return "<p>No analytics data available.</p>";
  }

  let table = `
    <table style="border-collapse: collapse; width: 100%; margin: 10px 0; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Media Source</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Global Rank</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Monthly Visits</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Avg Time (sec)</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Bounce Rate</th>
        </tr>
      </thead>
      <tbody>
  `;

  analyticsData.forEach((site) => {
    if (!site) return;

    table += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            site.siteName || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            site.globalRank ? "#" + site.globalRank : "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            site.engagements?.monthlyVisits || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            site.engagements?.timeOnSite || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            site.engagements?.bounceRate || "N/A"
          }</td>
        </tr>
    `;
  });

  table += `
      </tbody>
    </table>
  `;

  return table;
};
