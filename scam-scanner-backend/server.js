import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

// Load environment variables
dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI });

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Function to check if a site needs Puppeteer
async function needsPuppeteer(url) {
    const jsHeavySites = ["instagram.com", "twitter.com", "linkedin.com", "facebook.com", "bluemoonshop.cc"];
    return jsHeavySites.some((site) => url.includes(site));
}

// Function to scrape website
async function scrapeWebsite(url) {
    try {
        console.log(`Scraping website: ${url}`);

        if (await needsPuppeteer(url)) {
            console.log("Using Puppeteer for JavaScript-heavy website...");
            return await scrapeWithPuppeteer(url);
        }

        // Default to Axios for normal sites
        const { data } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 10000,
        });

        const $ = cheerio.load(data);
        const visibleText = $("body").text().replace(/\s+/g, " ").trim();
        return visibleText.substring(0, 3000); // Increase limit for better AI accuracy

    } catch (error) {
        console.error("Error scraping website:", error.message);

        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
            throw new Error("Site Not Reachable");
        }

        return "Scraping failed";
    }
}

// Function to scrape JavaScript-heavy websites with Puppeteer
async function scrapeWithPuppeteer(url) {
    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

        const visibleText = await page.evaluate(() => document.body.innerText);
        await browser.close();

        return visibleText.substring(0, 3000);
    } catch (error) {
        console.error("Puppeteer failed:", error.message);
        return "Scraping failed";
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

### **⚠️ IMPORTANT RULES:**
1. **STRICT JSON FORMAT**: Output **must be a valid JSON object**.
2. **LEGITIMACY SCORE (1-100):**
   - 90-100: **Trusted & Recognized** (e.g., Google, Instagram, Microsoft)
   - 70-89: **Likely Legitimate**, minor concerns (e.g., missing company info)
   - 40-69: **Suspicious**, potential risks detected (e.g., misleading content, low transparency)
   - 1-39: **High Risk**, strong scam indicators
3. **SCAM TYPE:** If a scam is detected, **identify the type** (e.g., phishing, counterfeit, data harvesting). If no scam, return "Not detected."
4. **RISK FACTORS:** Provide at least **one specific reason** for scores below 90.
5. **KEY INDICATORS:** Highlight both **positive and negative signals** (e.g., "HTTPS secured," "Fake reviews detected").
6. **INSIGHTS:** Ensure insights are factual, avoiding assumptions. **If scraping fails, state 'Insufficient data for full assessment'.**

### **Website Data:**
- **HTTPS Security:** ${isHttps ? "Yes" : "No"}
- **Scraped Content:** ${scrapedData}

### **🔍 Expected JSON Output:**
\`\`\`json
{
    "legitimacyScore": (integer between 1-100),
    "scamType": (string or "Not detected"),
    "riskFactors": (array of strings, at least one if score <90),
    "keyIndicators": (array of strings, mix of pros/cons),
    "insights": (string, factual & objective)
}
\`\`\`

Respond **ONLY** with JSON—no extra text.`
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
