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
                <p><strong>Legitimacy Score:</strong> ${data.legitimacyScore}/100</p>
                <p><strong>HTTPS Status:</strong> ${data.httpsStatus}</p>
                <p><strong>Potential Scam Type:</strong> ${data.scamType}</p>
                
                <h4>Risk Factors:</h4>
                <ul>${data.riskFactors.map(factor => `<li>${factor}</li>`).join("")}</ul>
                
                <h4>Key Indicators:</h4>
                <ul>${data.keyIndicators.map(indicator => `<li>${indicator}</li>`).join("")}</ul>

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
    let reportMessage = document.getElementById("reportMessage");
    let reportForm = document.getElementById("reportForm");
    let loadingScreen = document.getElementById("loadingScreen");
    let loadingText = document.getElementById("loadingText");

    if (!reportInput || !scamType || (scamType === "other" && !otherScamType)) {
        reportMessage.style.backgroundColor = "#e84118";
        reportMessage.style.color = "#fff";
        reportMessage.innerHTML = "⚠️ Please fill in all required fields!";
        reportMessage.classList.remove("hidden");
        return;
    }

    // Hide form and show loading screen
    reportForm.classList.add("hidden");
    loadingScreen.classList.remove("hidden");

    let messages = [
        "🔍 Checking...",
        "🔄 Processing...",
        "🛡️ Validating...",
        "✅ Report Validated! You have earned 100 points! 🎉"
    ];

    let index = 0;
    let interval = setInterval(() => {
        if (index < messages.length) {
            loadingText.innerHTML = messages[index];
            index++;
        } else {
            clearInterval(interval);

            // Hide loading and show success message
            loadingScreen.classList.add("hidden");
            reportMessage.classList.remove("hidden");
            reportMessage.style.backgroundColor = "#0048ec";
            reportMessage.style.color = "#fff";
            reportMessage.innerHTML = "✅ Report Successfully Submitted! You earned 100 points! 🎉";

            // Reset fields after 2s
            setTimeout(() => {
                document.getElementById("reportInput").value = "";
                document.getElementById("scamType").value = "";
                document.getElementById("otherScamType").value = "";
                document.getElementById("otherScamType").classList.add("hidden");
                reportMessage.classList.add("hidden");
                reportForm.classList.remove("hidden");
            }, 2000);
        }
    }, 1000);
});


//#endregion Report screen ends