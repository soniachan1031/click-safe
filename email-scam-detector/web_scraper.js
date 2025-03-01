const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeWebsite(url) {
    try {
        // Ensure URL has correct format
        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
        }

        // Fetch the page content
        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        // Load the HTML into Cheerio
        const $ = cheerio.load(data);

        // Extract all links from the page
        const links = [];
        $("a").each((index, element) => {
            const link = $(element).attr("href");
            if (link && link.startsWith("http")) {
                links.push(link);
            }
        });

        // Extract page title
        const pageTitle = $("title").text().trim();

        console.log("Page Title:", pageTitle);
        console.log("Links Found:", links);
    } catch (error) {
        console.error("Error scraping website:", error.message);
    }
}

// // Example usage
// const targetURL = "example.com";
// scrapeWebsite(targetURL);

module.exports = scrapeWebsite;
