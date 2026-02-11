// ========================
// Initialize supabaseClient
// ========================
const supabaseClient = supabase.createClient(
  'https://mkqotuipaxokxvclthjq.supabase.co',
  'sb_publishable_1Pb-i5OnGXkvUnRKWwdqUg_nsEVwFfp'
);

// =======================
// Helper Functions
// =======================

// Generate simple MPG prediction (placeholder)
function predictMPG(data) {
    // Example formula: MPG decreases with weight & engine, increases with cylinders
    let mpg = ((1000 / (data.engine_cc * 0.05 + data.horsepower * 0.03 + data.weight * 0.002 + data.cylinders * 0.5))/2);
    return Math.round(mpg * 10) / 10;
}

// Generate 10 main tips based on vehicle data
function generateTips(vehicle) {
    let tips = [];

    // Weight related
    if(vehicle.weight > 3500) tips.push("Consider reducing weight to improve fuel efficiency.");
    
    // Engine related
    if(vehicle.engine_cc > 2500) tips.push("Large engine may reduce MPG; drive moderately to save fuel.");
    
    // Horsepower related
    if(vehicle.horsepower > 300) tips.push("High horsepower can lead to higher fuel consumption.");
    
    // Cylinders
    if(vehicle.cylinders > 6) tips.push("More cylinders increase fuel use; maintain regular servicing.");
    
    // Transmission
    if(vehicle.transmission === "Manual") tips.push("Manual transmission can save fuel if used efficiently.");
    if(vehicle.transmission === "Automatic") tips.push("Automatic transmission offers comfort but slightly higher fuel consumption.");
    
    // Cooling system
    if(vehicle.cooling_system === "Air") tips.push("Air-cooled engines may overheat on long drives; monitor temperature.");
    if(vehicle.cooling_system === "Liquid") tips.push("Check coolant levels regularly for optimal engine performance.");
    
    // Driving habits
    tips.push("Avoid rapid acceleration and maintain steady speed for better MPG.");
    
    // Tires
    tips.push("Keep tires properly inflated to improve fuel efficiency and handling.");

    return tips;
}


// =======================
// Prediction Form
// =======================
const form = document.getElementById("prediction-form");
const resultDiv = document.getElementById("result");

if(form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        const vehicle = {
            engine_cc: parseFloat(formData.get("engine_cc")),
            horsepower: parseFloat(formData.get("horsepower")),
            weight: parseFloat(formData.get("weight")),
            cylinders: parseInt(formData.get("cylinders")),
            transmission: formData.get("transmission"),
            cooling_system: formData.get("cooling_system")
        };

        const predicted_mpg = predictMPG(vehicle);
        resultDiv.innerText = `Predicted MPG: ${predicted_mpg}`;

        // Insert into supabaseClient
        const { error } = await supabaseClient.from("vehicle_data").insert([{
            ...vehicle,
            predicted_mpg
        }]);

        if(error) console.error("supabaseClient Insert Error:", error);
        else console.log("Vehicle data saved successfully!");
        form.reset();
    });
}

// =======================
// History Page
// =======================
async function loadHistory() {
    const tableBody = document.querySelector("#history-table tbody");
    if(!tableBody) return;

    const { data, error } = await supabaseClient.from("vehicle_data").select("*").order("created_at", {ascending: false});
    if(error) return console.error(error);

    tableBody.innerHTML = "";
    data.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item.engine_cc}</td>
            <td>${item.horsepower}</td>
            <td>${item.weight}</td>
            <td>${item.cylinders}</td>
            <td>${item.transmission}</td>
            <td>${item.cooling_system}</td>
            <td>${item.predicted_mpg}</td>
            <td>${new Date(item.created_at).toLocaleString()}</td>
        `;
        tr.addEventListener("click", () => openPopup(item));
        tableBody.appendChild(tr);
    });
}

// =======================
// Popup Functions
// =======================
const popup = document.getElementById("popup");
const popupDataDiv = document.getElementById("popup-data");
const popupTipsDiv = document.getElementById("popup-tips");
const copyBtn = document.getElementById("copy-btn");
const deleteBtn = document.getElementById("delete-btn");
const closePopupBtn = document.getElementById("close-popup");

let currentVehicle = null;

function openPopup(vehicle) {
    currentVehicle = vehicle;
    if(!popup) return;

    popup.style.display = "flex";

    popupDataDiv.innerHTML = `
        <ul>
            <li>Engine CC: ${vehicle.engine_cc}</li>
            <li>Horsepower: ${vehicle.horsepower}</li>
            <li>Weight: ${vehicle.weight}</li>
            <li>Cylinders: ${vehicle.cylinders}</li>
            <li>Transmission: ${vehicle.transmission}</li>
            <li>Cooling System: ${vehicle.cooling_system}</li>
            <li>Predicted MPG: ${vehicle.predicted_mpg}</li>
        </ul>
    `;

    const tips = generateTips(vehicle);
    popupTipsDiv.innerHTML = `<h3>Tips:</h3><ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul>`;
}

if(closePopupBtn) closePopupBtn.onclick = () => popup.style.display = "none";

if(copyBtn) copyBtn.onclick = () => {
    if(!currentVehicle) return;
    navigator.clipboard.writeText(JSON.stringify(currentVehicle, null, 2));
    alert("Vehicle data copied to clipboard!");
};

if(deleteBtn) deleteBtn.onclick = async () => {
    if(!currentVehicle) return;
    const { error } = await supabaseClient.from("vehicle_data").delete().eq("id", currentVehicle.id);
    if(error) console.error(error);
    else {
        alert("Vehicle data deleted!");
        popup.style.display = "none";
        loadHistory();
    }
};

// Search in history
const searchInput = document.getElementById("search-history");
if(searchInput) {
    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        document.querySelectorAll("#history-table tbody tr").forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(filter) ? "" : "none";
        });
    });
}

// =======================
// Trend Page
// =======================
async function loadTrends() {
    const canvas = document.getElementById("mpgChart");
    if(!canvas) return;

    const { data, error } = await supabaseClient.from("vehicle_data").select("predicted_mpg, created_at").order("created_at", {ascending:true});
    if(error) return console.error(error);

    const labels = data.map(d => new Date(d.created_at).toLocaleDateString());
    const values = data.map(d => d.predicted_mpg);

    // Determine colors for trend
    let bgColors = [];
    for(let i=0;i<values.length;i++){
        if(i===0) bgColors.push("rgba(0,255,153,0.3)");
        else bgColors.push(values[i] >= values[i-1] ? "rgba(0,255,153,0.5)" : "rgba(255,0,0,0.5)");
    }

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: "Predicted MPG",
                data: values,
                fill: false,
                borderColor: "#00ff99",
                backgroundColor: bgColors,
                tension: 0.3,
                pointRadius: 6,
                pointBackgroundColor: bgColors
            }]
        },
        options: {
            responsive:true,
            plugins:{ legend:{ labels:{ color:"#fff" } } },
            scales:{
                x:{ ticks:{ color:"#fff" }, grid:{ color:"rgba(255,255,255,0.1)" } },
                y:{ ticks:{ color:"#fff" }, grid:{ color:"rgba(255,255,255,0.1)" } }
            }
        }
    });
}

// =======================
// 3D Card Tilt (Optional)
// =======================
document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width/2;
        const centerY = rect.height/2;
        const rotateX = (y - centerY)/20;
        const rotateY = (centerX - x)/20;
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener("mouseleave", () => card.style.transform = "rotateX(0deg) rotateY(0deg)");
});

// =======================
// Initialize Pages
// =======================
document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    loadTrends();
});


