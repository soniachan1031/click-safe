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
