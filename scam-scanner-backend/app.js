require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const GOOGLE_SAFE_BROWSING_API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
const IPINFO_API_KEY = process.env.IPINFO_API_KEY;
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;

// Load OpenPhish Data from Local File
function loadOpenPhishData() {
    try {
        const filePath = path.join(__dirname, "phishing_list.txt");
        const phishingSites = fs.readFileSync(filePath, "utf-8").split("\n");
        return new Set(phishingSites);
    } catch (error) {
        console.error("Error loading OpenPhish data:", error);
        return new Set();
    }
}

const openPhishList = loadOpenPhishData();

// Check if Query is an IP Address
const isIP = (query) => {
    const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[a-fA-F0-9:]+\]?$/; // IPv4 & IPv6 regex
    return ipRegex.test(query);
};

// Check if URL is in OpenPhish List
async function checkOpenPhish(query) {
    return openPhishList.has(query) ? "OpenPhish: Phishing Site Detected" : null;
}

// Google Safe Browsing Check
async function checkGoogleSafeBrowsing(query) {
    try {
        const response = await axios.post(
            `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`,
            {
                client: { clientId: "scamScanner", clientVersion: "1.0" },
                threatInfo: {
                    threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
                    platformTypes: ["ANY_PLATFORM"],
                    threatEntryTypes: ["URL"],
                    threatEntries: [{ url: query }]
                }
            }
        );
        return response.data.matches ? "Google Safe Browsing: Dangerous" : null;
    } catch (error) {
        console.error("Google Safe Browsing API error:", error);
        return null;
    }
}

// StopForumSpam Check
async function checkStopForumSpam(query) {
    try {
        const response = await axios.get(`https://api.stopforumspam.com/api?email=${query}&json`);
        return response.data.success && response.data.email?.appears ? "StopForumSpam: Spam Email Detected" : null;
    } catch (error) {
        console.error("StopForumSpam API error:", error);
        return null;
    }
}

// IPInfo Check
async function checkIPInfo(query) {
    if (!IPINFO_API_KEY) {
        console.error("❌ IPInfo API Key is missing.");
        return null;
    }

    try {
        const response = await axios.get(`https://ipinfo.io/${query}/json?token=${IPINFO_API_KEY}`);
        return response.data.bogon ? "IPInfo: Suspicious IP Address" : null;
    } catch (error) {
        console.error("❌ IPInfo API error:", error.response?.data || error.message);
        return null;
    }
}

// AbuseIPDB Check
async function checkAbuseIPDB(query) {
    if (!ABUSEIPDB_API_KEY) {
        console.error("❌ AbuseIPDB API Key is missing.");
        return null;
    }

    try {
        const response = await axios.get(`https://api.abuseipdb.com/api/v2/check?ipAddress=${query}`, {
            headers: { "Key": ABUSEIPDB_API_KEY }
        });

        return response.data.data.abuseConfidenceScore > 50 ? "AbuseIPDB: High-risk IP detected" : null;
    } catch (error) {
        console.error("❌ AbuseIPDB API error:", error.response?.data || error.message);
        return null;
    }
}

// Main Scam Detection Function
async function checkScam(query) {
    let riskLevel = "Safe";
    let results = [];

    const isQueryIP = isIP(query);

    const checks = await Promise.all([
        checkGoogleSafeBrowsing(query), // Only for URLs
        checkOpenPhish(query), // Only for URLs
        checkStopForumSpam(query), // Only for Emails
        isQueryIP ? checkIPInfo(query) : null, // Only for IPs
        isQueryIP ? checkAbuseIPDB(query) : null // Only for IPs
    ]);

    checks.forEach(result => {
        if (result) results.push(result);
    });

    console.log(`🔍 Scam Check Results for ${query}:`, results);

    if (results.length > 0) {
        riskLevel = results.includes("Phishing Site Detected") || results.includes("High-risk site detected") ? "High Risk" : "Suspicious";
    }

    return { query, riskLevel, results };
}

// API Endpoint for Scam Detection
app.post("/check", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "No query provided" });
    
    const result = await checkScam(query);
    res.json(result);
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
