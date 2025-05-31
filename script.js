// Function to set the theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme); // Save theme preference
}

// Toggle dark mode
document.getElementById('toggle-dark-mode').addEventListener('click', function () {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

// On page load, apply the saved theme or default to light mode
document.addEventListener('DOMContentLoaded', function () {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
});

// Draw holding pattern
function drawHoldingPattern(entryMethod) {
    const canvas = document.getElementById('holding-pattern');
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set stroke color based on theme
    const strokeColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#bb86fc' : '#007bff';
    ctx.strokeStyle = strokeColor;

    // Draw holding pattern
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, 2 * Math.PI);
    ctx.stroke();

    // Highlight entry method
    if (entryMethod === 'Direct Entry') {
        ctx.fillStyle = strokeColor;
        ctx.fillText('Direct Entry', 150, 300);
    } else if (entryMethod === 'Parallel Entry') {
        ctx.fillStyle = strokeColor;
        ctx.fillText('Parallel Entry', 100, 150);
    } else if (entryMethod === 'Teardrop Entry') {
        ctx.fillStyle = strokeColor;
        ctx.fillText('Teardrop Entry', 250, 150);
    }
}

// Calculate entry method
document.getElementById('calculate').addEventListener('click', function () {
    const inboundCourse = parseInt(document.getElementById('course').value);
    const turnDirection = document.getElementById('turn').value;
    const aircraftBearing = parseInt(document.getElementById('bearing').value);

    // Normalize bearings to 0-360
    const normalize = (angle) => (angle + 360) % 360;

    // Define sector boundaries
    const directSectorStart = normalize(inboundCourse - 70);
    const directSectorEnd = normalize(inboundCourse + 70);
    const parallelSectorStart = normalize(inboundCourse + 110);
    const parallelSectorEnd = normalize(inboundCourse - 110);

    // Determine method of entry
    let entryMethod = '';
    if (aircraftBearing >= directSectorStart && aircraftBearing <= directSectorEnd) {
        entryMethod = 'Direct Entry';
    } else if (aircraftBearing >= parallelSectorStart || aircraftBearing <= parallelSectorEnd) {
        entryMethod = 'Parallel Entry';
    } else {
        entryMethod = 'Teardrop Entry';
    }

    // Display result
    document.getElementById('result').textContent = `Method of Entry: ${entryMethod}`;

    // Draw holding pattern
    drawHoldingPattern(entryMethod);
});