document.addEventListener("DOMContentLoaded", function () {
    const scanButton = document.getElementById("scanButton");
    const scanInput = document.getElementById("scanInput");
    const resultContainer = document.getElementById("resultContainer");
    const loadingDiv = document.getElementById("loading");

    // ✅ Retrieve only lastUserInput for input field (not lastScannedDomain)
    chrome.storage.local.get(["siteUrl", "analysisData"], (result) => {
        if (result.siteUrl) {
            scanInput.value = result.siteUrl; // Set input field value
        }
        if (result.analysisData) {
            displayResults(result.analysisData); // ✅ Show results if available
            
            // ✅ Clear siteUrl and analysisData after displaying results
            chrome.storage.local.remove(["siteUrl", "analysisData"], () => {
                console.log("Cleared siteUrl and analysisData after displaying results.");
            });
        }
    });

    scanButton.addEventListener("click", async function () {
        const userInput = scanInput.value.trim();
        if (!userInput) {
            resultContainer.innerHTML = "<p class='error'>Please enter a URL to scan.</p>";
            return;
        }

        loadingDiv.classList.remove("hidden");
        resultContainer.innerHTML = "<p>Scanning in progress...</p>";

        try {
            const formattedURL = formatURL(userInput);
            const response = await fetch("http://localhost:5000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: formattedURL }),
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
function normalizeURL(url) {
    try {
        let parsedUrl = new URL(url.includes("://") ? url : `https://${url}`);
        return parsedUrl.origin; // Returns standardized format (e.g., https://google.com)
    } catch (e) {
        return null; // Invalid URL
    }
}

document.getElementById("reportButton").addEventListener("click", async function () {
    let reportInput = document.getElementById("reportInput").value.trim();
    let normalizedURL = normalizeURL(reportInput);

    if (!normalizedURL) {
        alert("⚠️ Enter a valid URL!");
        return;
    }

    try {
        // Fetch already reported URLs
        chrome.storage.sync.get(["reportedScams"], async (res) => {
            let reportedScams = res.reportedScams || [];

            // Check if the URL has already been reported
            if (reportedScams.includes(normalizedURL)) {
                alert("⚠️ This URL has already been reported. You cannot earn points multiple times.");
                return;
            }

            // Call the /analyze API to get legitimacyScore
            let response = await fetch("http://localhost:5000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: normalizedURL }), // Use normalized URL
            });

            let data = await response.json();

            if (data.legitimacyScore >= 70) {
                // Website is NOT a scam
                alert(`ℹ️ The website has a legitimacy score of ${data.legitimacyScore}/100 and is NOT classified as a scam.`);
            } else {
                // Website is a scam, award 100 points
                chrome.storage.sync.get(["userPoints"], (res) => {
                    let newPoints = (res.userPoints || 10000) + 100;
                    chrome.storage.sync.set({ userPoints: newPoints });

                    // Add the reported URL to storage
                    reportedScams.push(normalizedURL);
                    chrome.storage.sync.set({ reportedScams });

                    alert(`✅ Scam reported! 100 points awarded. Website legitimacy score: ${data.legitimacyScore}/100.`);
                });
            }
        });
    } catch (error) {
        console.error("Error reporting scam:", error);
        alert("⚠️ Failed to analyze the website. Please try again.");
    }
});


//#endregion Report screen ends

//#region  Redeem screen starts 

// Retrieve user points from storage or set to 10,000 if not found
let userPoints;
chrome.storage.sync.get(["userPoints"], function (result) {
    userPoints = result.userPoints !== undefined ? result.userPoints : 10000;
    updatePointsDisplay();
});


// Function to update the displayed points balance
function updatePointsDisplay() {
    document.getElementById("pointsBalance").innerHTML = `You have <b>${userPoints} points</b>`;

        // Store updated points in chrome.storage.sync
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

   // Deduct points & sync storage
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

