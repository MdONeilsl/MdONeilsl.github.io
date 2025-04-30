const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const starfieldParticles = [];
const numStars = 700;
let time = 0;

// Initialize starfield particles
for (let i = 0; i < numStars; i++) {
    starfieldParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        color: 'rgba(255, 255, 255, 0.2)', // Pale White
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
    });
}

function drawStarfield() {
    for (let i = 0; i < numStars; i++) {
        const star = starfieldParticles[i];
        star.brightness += star.twinkleSpeed;
        if (star.brightness > 1) {
            star.brightness = 1;
            star.twinkleSpeed *= -1;
        } else if (star.brightness < 0.3) {
            star.brightness = 0.3;
            star.twinkleSpeed *= -1;
        }
        const drawColor = star.color.replace(/, \d\.\d+\)$/, `, ${star.brightness * 0.7})`); // Adjust alpha

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = drawColor;
        ctx.fill();
        ctx.closePath();
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStarfield();

    time += 0.01;
    requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});