// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.type === "scan") {
//         fetch("https://your-backend-api.com/check", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ query: message.data })
//         })
//         .then(response => response.json())
//         .then(data => {
//             if (data.riskLevel !== "Safe") {
//                 chrome.notifications.create({
//                     type: "basic",
//                     iconUrl: "icons/icon128.png",
//                     title: "Scam Scanner Alert",
//                     message: `Warning! The scanned item is marked as ${data.riskLevel}.`
//                 });
//             }
//             sendResponse(data);
//         })
//         .catch(error => sendResponse({ error: "Error scanning data." }));
//         return true;
//     }
// });
