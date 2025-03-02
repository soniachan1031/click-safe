chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ extensionActivated: true, lastScannedDomain: "" });
});

// ✅ Remove `analysisData` & `lastUserInput` when the extension is closed, but keep `lastScannedDomain`
chrome.runtime.onSuspend.addListener(() => {
    chrome.storage.local.remove(["analysisData", "lastUserInput"], () => {
        console.log("Cleared analysis data and last user input on extension close, but kept lastScannedDomain.");
    });
});
 
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        chrome.storage.local.get(["extensionActivated", "lastScannedDomain"], (result) => {
            if (result.extensionActivated) {
                const currentDomain = new URL(tab.url).hostname;
                if (currentDomain !== result.lastScannedDomain) {
                    analyzeWebsite(tab.url, tabId, currentDomain);
                }
            }
        });
    }
});

async function analyzeWebsite(url, tabId, domain) {
    try {
        const response = await fetch("http://localhost:5000/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();
        console.log("Analysis Result:", data);

        if (data.legitimacyScore < 70) {
            chrome.storage.local.set({ lastScannedDomain: domain });
            notifyUser(data, url, tabId);
            showPopup(tabId, data, url);
        }
    } catch (error) {
        console.error("Error analyzing website:", error);
    }
}

function notifyUser(data, url, tabId) {
    const message = `⚠️ Website Analysis Alert!
    
URL: ${url}
Legitimacy Score: ${data.legitimacyScore}/100
Scam Type: ${data.scamType}

Risk Factors:
${data.riskFactors.join("\n")}\n\nClick to learn more.`;

    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Website Analysis Result",
        message: message,
        priority: 2,
    });

    chrome.action.setBadgeText({ text: "!", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#FF9900", tabId });
}

function showPopup(tabId, data, url) {
    chrome.scripting.executeScript({
        target: { tabId },
        func: (analysisData, siteUrl) => {
            let overlay = document.getElementById("website-analysis-overlay");
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.id = "website-analysis-overlay";
                overlay.style.position = "fixed";
                overlay.style.top = "0";
                overlay.style.left = "0";
                overlay.style.width = "100vw";
                overlay.style.height = "100vh";
                overlay.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
                overlay.style.backdropFilter = "blur(10px)";
                overlay.style.zIndex = "99999";
                document.body.appendChild(overlay);
            }

            let popup = document.getElementById("website-analysis-popup");
            if (!popup) {
                popup = document.createElement("div");
                popup.id = "website-analysis-popup";
                popup.style.position = "fixed";
                popup.style.top = "50%";
                popup.style.left = "50%";
                popup.style.transform = "translate(-50%, -50%)";
                popup.style.width = "360px";
                popup.style.backgroundColor = "#181818";
                popup.style.color = "#ffffff";
                popup.style.border = "1px solid #333";
                popup.style.padding = "20px";
                popup.style.zIndex = "100000";
                popup.style.display = "flex";
                popup.style.flexDirection = "column";
                popup.style.alignItems = "center";
                popup.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.6)";
                popup.style.borderRadius = "12px";
                popup.innerHTML = `
                    <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Website Analysis</h3>
                    <p style="font-size: 14px; color: #b0b0b0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;" title="${siteUrl}">URL: ${siteUrl}</p>
                    <p><strong>Legitimacy Score:</strong> ${analysisData.legitimacyScore}/100</p>
                    <p><strong>Scam Type:</strong> ${analysisData.scamType}</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button id='close-popup' style="background: #e84118; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Close</button>
                        <button id='more-details' style="background: #0048ec; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">More Details</button>
                    </div>
                `;
                document.body.appendChild(popup);
                document.getElementById("close-popup").addEventListener("click", () => {
                    popup.remove();
                    overlay.remove();
                });
                document.getElementById("more-details").addEventListener("click", () => {
                    chrome.storage.local.set({ analysisData: analysisData, siteUrl: siteUrl }, () => {
                        chrome.runtime.sendMessage({ action: "open_popup" });
                    });
                });                
            }
        },
        args: [data, url]
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "open_popup") {
        chrome.action.openPopup();
    }
});
