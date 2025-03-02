document.addEventListener("DOMContentLoaded", function () {
    const scanButton = document.getElementById("scanButton");
    const scanInput = document.getElementById("scanInput");
    const resultContainer = document.getElementById("resultContainer");
    const loadingDiv = document.getElementById("loading");

    scanButton.addEventListener("click", async function () {
        const userInput = scanInput.value.trim();
        if (!userInput) {
            resultContainer.innerHTML = "<p class='error'>Please enter a URL to scan.</p>";
            return;
        }

        loadingDiv.classList.remove("hidden");
        resultContainer.innerHTML = "<p>Scanning in progress...</p>";

        try {
            const response = await fetch("http://localhost:5000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: formatURL(userInput) }),
            });

            const data = await response.json();

            if (response.status === 400 && data.error === "Site Not Reachable") {
                displayUnreachableSiteMessage();
            } else {
                displayResults(data);
            }
        } catch (error) {
            console.error("Error getting legitimacy score:", error.message);
            resultContainer.innerHTML = "<p class='error'>Error scanning. Please try again later.</p>";
        } finally {
            loadingDiv.classList.add("hidden");
        }
    });

    function formatURL(input) {
        if (!/^https?:\/\//i.test(input)) {
            return `https://${input}`;
        }
        return input;
    }

    function displayResults(data) {
        resultContainer.innerHTML = `
            <div class="result-box">
                <h3>Website Analysis</h3>
    
                <div class="result-card">
                    <p><strong>Legitimacy Score:</strong> <span class="score">${data.legitimacyScore}/100</span></p>
                    <p><strong>HTTPS Status:</strong> ${data.httpsStatus}</p>
                    ${(data.scamType) ? `<p><strong>Potential Scam Type:</strong> <span class="scam-type">${data.scamType}</span></p>` : ""}
                </div>
    
                ${data.riskFactors?.length > 0 ? `
                <div class="result-card">
                    <h4>🚨 Risk Factors</h4>
                    <ul class="styled-list">
                        ${data.riskFactors.map(factor => `<li>${factor}</li>`).join("")}
                    </ul>
                </div>` : ""}
    
                ${data.keyIndicators?.length > 0 ? `
                <div class="result-card">
                    <h4>🔍 Key Indicators</h4>
                    <ul class="styled-list">
                        ${data.keyIndicators.map(indicator => `<li>${indicator}</li>`).join("")}
                    </ul>
                </div>` : ""}
    
                <div class="result-card">
                    <h4>🧠 AI Insights</h4>
                    <p>${data.insights}</p>
                </div>
            </div>
        `;
    }


    function displayUnreachableSiteMessage() {
        resultContainer.innerHTML = `
            <div class="error-box">
                <h3>Site Not Reachable</h3>
                <p>The website could not be reached. It may be down, fake, or experiencing network issues.</p>
                <p><strong>Possible Reasons:</strong></p>
                <ul>
                    <li>The website does not exist</li>
                    <li>It may be experiencing server issues</li>
                    <li>It could be blocking automated scans</li>
                </ul>
                <p>Please verify the URL and try again.</p>
            </div>
        `;
    }
});

//#region Navigation tabs starts
document.addEventListener("DOMContentLoaded", () => {
    // Set default tab to Home on load
    switchTab('homePage', document.querySelector("[data-tab='homePage']"));

    // Attach event listeners to all tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener("click", function () {
            const tabId = this.getAttribute("data-tab");
            switchTab(tabId, this); // Pass "this" to reference the clicked button
        });
    });
});

function switchTab(tabId, clickedButton) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active state from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show only the selected tab content
    document.getElementById(tabId).classList.add('active');

    // Highlight the clicked tab button (Ensure button exists)
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

//#endregion Navigation tabs ends

//#region Report screen starts
document.getElementById("scamType").addEventListener("change", function () {
    let otherInput = document.getElementById("otherScamType");

    if (this.value === "other") {
        otherInput.classList.remove("hidden");
    } else {
        otherInput.classList.add("hidden");
        otherInput.value = ""; // Clear input if hidden
    }
});

document.getElementById("reportButton").addEventListener("click", function () {
    let reportInput = document.getElementById("reportInput").value.trim();
    let scamType = document.getElementById("scamType").value;
    let otherScamType = document.getElementById("otherScamType").value.trim();
    let reportForm = document.getElementById("reportForm");
    let successMessage = document.getElementById("successMessage");

    if (!reportInput || !scamType || (scamType === "other" && !otherScamType)) {
        alert("⚠️ Please fill in all required fields!"); // Simple validation
        return;
    }

    // Show processing message
successMessage.innerHTML = "🔄 Checking URL legitimacy...";
successMessage.classList.remove("hidden");

// Simulate API call to ChatGPT to get legitimacy score
fetchChatGPTAnalysis(reportInput).then((legitimacyScore) => {
    if (legitimacyScore < 70) {
        // Award points
        chrome.storage.sync.get(["userPoints"], function (result) {
            let currentPoints = result.userPoints || 10000;
            let newPoints = currentPoints + 100;
            chrome.storage.sync.set({ userPoints: newPoints });

            // Show success message
            successMessage.innerHTML = `✅ Report Successfully Submitted! You earned <b>100 points</b>!`;
        });
    } else {
        // Show alert for non-scam URLs
        alert(`⚠️ This URL has a legitimacy score of ${legitimacyScore}/100. Reporting rejected.`);
        successMessage.classList.add("hidden");
        reportForm.classList.remove("hidden");
    }
});


    // Reset fields after 2 seconds
    setTimeout(() => {
        document.getElementById("reportInput").value = "";
        document.getElementById("scamType").value = "";
        document.getElementById("otherScamType").value = "";
        document.getElementById("otherScamType").classList.add("hidden");

        successMessage.classList.add("hidden");
        reportForm.classList.remove("hidden");
    }, 10000);
});

//#endregion Report screen ends

//#region  Redeem screen starts 
// Initialize user points 
// Retrieve user points from storage or set to 10,000 if not found
let userPoints;
chrome.storage.sync.get(["userPoints"], function (result) {
    userPoints = result.userPoints !== undefined ? result.userPoints : 10000;
    updatePointsDisplay();
});


// Function to update the displayed points balance
function updatePointsDisplay() {
    document.getElementById("pointsBalance").innerHTML = `You have <b>${userPoints} points</b>`;

    // Store updated points in chrome.storage.local
    chrome.storage.sync.set({ userPoints: userPoints });
}

// Update display on load
document.addEventListener("DOMContentLoaded", updatePointsDisplay);

document.getElementById("redeemButton").addEventListener("click", function () {
    let redeemEmail = document.getElementById("redeemEmail").value.trim();
    let redeemAmount = parseInt(document.getElementById("redeemAmount").value.trim());
    let redeemForm = document.getElementById("redeemForm");
    let redeemSuccessMessage = document.getElementById("redeemSuccessMessage");

    // Validation: Ensure valid input
    if (!redeemEmail || isNaN(redeemAmount) || redeemAmount <= 0) {
        alert("⚠️ Please enter a valid email and amount!");
        return;
    }

    // Validation: Ensure minimum 10,000 points for withdrawal
    if (redeemAmount < 10000) {
        alert("⚠️ Minimum withdrawal is 10,000 points!");
        return;
    }

    // Validation: Ensure user has enough points
    if (redeemAmount > userPoints) {
        alert("⚠️ Insufficient points to redeem!");
        return;
    }

    // Deduct points & save to storage
    userPoints -= redeemAmount;
    chrome.storage.sync.set({ userPoints: userPoints }, function () {
        updatePointsDisplay();
    });


    // Hide form and show success message
    redeemForm.classList.add("hidden");
    redeemSuccessMessage.classList.remove("hidden");

    // Reset fields and hide success message after 2 seconds
    setTimeout(() => {
        document.getElementById("redeemEmail").value = "";
        document.getElementById("redeemAmount").value = "";

        redeemSuccessMessage.classList.add("hidden");
        redeemForm.classList.remove("hidden");
    }, 10000);
});

//#endregion Redeem screen ends

//#region  Analytics screen starts
// Initialize analytics data
let totalScams = 1230;
let scamsPrevented = 950;
let aiDetectedScams = 870;
let userReportedScams = 360;

// Function to update the analytics display
function updateAnalyticsDisplay() {
    document.getElementById("totalScams").innerText = totalScams;
    document.getElementById("scamsPrevented").innerText = scamsPrevented;
    document.getElementById("aiDetectedScams").innerText = aiDetectedScams;
    document.getElementById("userReportedScams").innerText = userReportedScams;
    document.getElementById("viewHeatmapButton").addEventListener("click", function () {
        window.open("heatmap.html", "_blank");
    });

}

// Update display on load
document.addEventListener("DOMContentLoaded", updateAnalyticsDisplay);



//#endregion Analytics screen ends


async function fetchChatGPTAnalysis(url) {
    let prompt = `Analyze the legitimacy of the following URL and return a score from 0 to 100, where 0 is a confirmed scam and 100 is a fully safe website. Only return the number without extra text. URL: ${url}`;

    let apiKey; // Declare variable for API key

    // Retrieve API key from secure storage (Chrome Storage or Backend)
    await chrome.storage.local.get(["openai_api_key"], function (result) {
        apiKey = result.openai_api_key;
    });

    if (!apiKey) {
        console.error("API Key not found! Store it securely in Chrome storage or backend.");
        return 50; // Default to 50 if API key is missing
    }

    let response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            prompt: prompt,
            max_tokens: 10
        })
    });

    let data = await response.json();
    let score = parseInt(data.choices[0].text.trim(), 10);
    return isNaN(score) ? 50 : score; // Default to 50 if parsing fails
}
