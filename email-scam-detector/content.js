// function scanLinks() {
//     const links = document.querySelectorAll("a");
//     links.forEach(link => {
//         fetch("https://your-backend-api.com/check", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ query: link.href })
//         })
//         .then(response => response.json())
//         .then(data => {
//             if (data.riskLevel !== "Safe") {
//                 link.style.color = "red";
//                 link.style.fontWeight = "bold";
//                 link.title = "Warning: This link may be unsafe!";
//             }
//         })
//         .catch(error => console.error("Error scanning link:", error));
//     });
// }

// document.addEventListener("DOMContentLoaded", scanLinks);
