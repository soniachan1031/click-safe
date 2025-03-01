import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";

// Load environment variables
dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI });

// Increase payload limit to handle large scraped data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Function to scrape website
async function scrapeWebsite(url) {
    try {
        console.log(`Scraping website: ${url}`);

        // Attempt with axios (set timeout)
        const { data } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 10000, // 10 seconds timeout
        });

        const $ = cheerio.load(data);
        const visibleText = $("body").text().replace(/\s+/g, " ").trim();
        return visibleText.substring(0, 2000); // Limit to 2000 chars

    } catch (error) {
        console.error("Error scraping website:", error.message);

        // Handle different types of unreachable errors
        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
            throw new Error("Site Not Reachable"); // Mark as unreachable
        }

        return "Scraping failed"; // Generic failure
    }
}

// API Endpoint to analyze website legitimacy
app.post("/analyze", async (req, res) => {
    try {
        const { url } = req.body;
        console.log(`Processing request for: ${url}`);

        const isHttps = url.startsWith("https");

        let scrapedData;
        try {
            scrapedData = await scrapeWebsite(url);
        } catch (error) {
            // Handle site not reachable errors
            return res.status(400).json({
                error: "Site Not Reachable",
                legitimacyScore: 0,
                scamType: "Unreachable",
                riskFactors: ["Website is unreachable", "Could be down or fake"],
                httpsStatus: isHttps ? "Yes" : "No",
                keyIndicators: ["Unable to retrieve content"],
                insights: "The website could not be reached, which may indicate it is inactive, fake, or experiencing network issues."
            });
        }

        // Send data to OpenAI for further analysis
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: `Analyze the following website data and return a structured JSON response.
                    Ensure the output is a **valid JSON object** with these keys:
                    {
                        "legitimacyScore": (integer between 1-100),
                        "scamType": (string or "Not detected"),
                        "riskFactors": (array of strings),
                        "keyIndicators": (array of strings),
                        "insights": (string)
                    }

                    Website Data:
                    HTTPS: ${isHttps ? "Yes" : "No"}
                    Scraped Content: ${scrapedData}

                    Respond only with JSON and nothing else.`
                }
            ],
            response_format: { type: "json_object" }
        });

        console.log(`AI Raw Response:`, completion.choices[0].message.content);
        const parsedResponse = JSON.parse(completion.choices[0].message.content);

        res.json({
            legitimacyScore: parsedResponse.legitimacyScore,
            scamType: parsedResponse.scamType || "Not detected",
            riskFactors: parsedResponse.riskFactors || [],
            httpsStatus: isHttps ? "Yes" : "No",
            keyIndicators: parsedResponse.keyIndicators || [],
            insights: parsedResponse.insights || "No additional insights."
        });

    } catch (error) {
        console.error("Error processing AI response:", error);
        res.status(500).json({ error: "Failed to analyze data", details: error.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
