document.addEventListener("DOMContentLoaded", function () {
    console.log("Checking if Leaflet Heatmap plugin is loaded...");

    // Ensure Leaflet Heatmap plugin is loaded
    if (typeof L.heatLayer !== "function") {
        console.error("Leaflet heatmap plugin not loaded! Check if leaflet-heat.js is included.");
        return;
    }

    console.log("Leaflet heatmap plugin loaded successfully!");

    // Initialize map centered in Kitchener, Canada
    var map = L.map('map').setView([43.4516, -80.4925], 15); // Kitchener coordinates

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Demo data: Random locations within Kitchener-Waterloo
    var heatData = [
        [43.4516, -80.4925, 0.8],  // Downtown Kitchener
        [43.4643, -80.5204, 0.7],  // Waterloo City Center
        [43.4791, -80.5263, 0.6],  // University of Waterloo area
        [43.4502, -80.5132, 0.5],  // Victoria Park
        [43.4054, -80.5620, 0.9],  // Huron Park
        [43.4723, -80.5449, 0.7],  // Bridgeport neighborhood
        [43.3862, -80.4049, 0.6],  // Doon South area
        [43.4300, -80.4910, 0.8],  // Fairview Park Mall area
        [43.4650, -80.5471, 0.7],  // Conestoga Mall area
        [43.4592, -80.5075, 0.5]   // Charles Street Terminal
    ];

    // Add heatmap layer
    L.heatLayer(heatData, {
        radius: 25, blur: 20, maxZoom: 15, gradient: {
            0.2: 'yellow',  // Low intensity
            0.5: 'orange',  // Medium intensity
            0.8: 'red'      // High intensity
        }
    }).addTo(map);
});
