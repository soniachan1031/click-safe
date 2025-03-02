document.addEventListener("DOMContentLoaded", function () {
    const scanButton = document.getElementById("scanButton");
    const scanInput = document.getElementById("scanInput");
    const resultContainer = document.getElementById("resultContainer");
    const loadingDiv = document.getElementById("loading");

    // Retrieve stored analysis data when popup opens
    chrome.storage.local.get(["analysisData", "siteUrl"], (result) => {
        if (result.analysisData) {
            scanInput.value = result.siteUrl || ""; // Fill the URL input field
            displayResults(result.analysisData);
            chrome.storage.local.remove(["analysisData", "siteUrl"]); // Clear stored data after displaying
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
                <p><strong>Legitimacy Score:</strong> ${data.legitimacyScore}/100</p>
                <p><strong>HTTPS Status:</strong> ${data.httpsStatus}</p>
                <p><strong>Potential Scam Type:</strong> ${data.scamType}</p>
                
                ${data.riskFactors?.length > 0 ? `<h4>Risk Factors:</h4>
                <ul>${data.riskFactors.map(factor => `<li>${factor}</li>`).join("")}</ul>` : ""}
                
                ${data.keyIndicators?.length > 0 ? `<h4>Key Indicators:</h4>
                <ul>${data.keyIndicators.map(indicator => `<li>${indicator}</li>`).join("")}</ul>` : ""}

                <h4>AI Insights:</h4>
                <p>${data.insights}</p>
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

    // Hide form and show success message
    reportForm.classList.add("hidden");
    successMessage.classList.remove("hidden");

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
// Initialize user points (Can be stored in localStorage later)
let userPoints = 70000;

// Function to update the displayed points balance
function updatePointsDisplay() {
    document.getElementById("pointsBalance").innerHTML = `You have <b>${userPoints} points</b>`;
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

    // Deduct points from user balance
    userPoints -= redeemAmount;
    updatePointsDisplay();

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

