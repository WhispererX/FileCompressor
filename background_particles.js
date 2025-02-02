// Customizable Variables
const PARTICLE_SIZE_MIN = 1;
const PARTICLE_SIZE_MAX = 2;
const PARTICLE_COLOR_HUE_MIN = 180;
const PARTICLE_COLOR_HUE_MAX = 240;
const PARTICLE_OPACITY = 0.6;
const PARTICLE_SPEED_MIN = 0.1;
const PARTICLE_SPEED_MAX = 1;
const PARTICLE_LIFESPAN_MIN = 2;
const PARTICLE_LIFESPAN_MAX = 10;
const PARTICLE_CREATION_INTERVAL = 100; // milliseconds
const ATTRACT_RADIUS = 50; // Distance at which particles start to move towards the mouse
const ATTRACT_SPEED = 0.5; // Speed at which particles are attracted to the mouse

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouseX = null;
let mouseY = null;

// function resizeCanvas() {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
// }
//window.addEventListener('resize', resizeCanvas);
//resizeCanvas();

function createParticle() {
    const size = Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN;
    const color = `hsla(${Math.random() * (PARTICLE_COLOR_HUE_MAX - PARTICLE_COLOR_HUE_MIN) + PARTICLE_COLOR_HUE_MIN}, 50%, 80%, ${PARTICLE_OPACITY})`;
    const speed = Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN) + PARTICLE_SPEED_MIN;
    const angle = Math.random() * 2 * Math.PI;

    particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height, // Always start at the bottom of the viewport
        size: size,
        color: color,
        speedX: Math.cos(angle) * speed,
        speedY: -Math.sin(angle) * speed,
        life: Math.random() * (PARTICLE_LIFESPAN_MAX - PARTICLE_LIFESPAN_MIN) + PARTICLE_LIFESPAN_MIN
    });
}

function updateParticles() {
    particles.forEach(particle => {
        // Move particles towards the mouse if within the attract radius
        if (mouseX !== null && mouseY !== null) {
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ATTRACT_RADIUS) {
                // Normalize the direction vector
                const angle = Math.atan2(dy, dx);
                const attractX = Math.cos(angle) * ATTRACT_SPEED;
                const attractY = Math.sin(angle) * ATTRACT_SPEED;

                // Update particle speed to move towards the mouse
                particle.speedX += attractX;
                particle.speedY += attractY;
            }
        }

        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life -= 0.02;

        // Fade out the particle by adjusting its opacity based on its remaining life
        const fadeOpacity = Math.max(0, PARTICLE_OPACITY * (particle.life / (PARTICLE_LIFESPAN_MAX - PARTICLE_LIFESPAN_MIN)));
        particle.color = `hsla(${parseInt(particle.color.match(/\d+/)[0])}, 50%, 80%, ${fadeOpacity})`;
    });

    particles = particles.filter(particle => particle.life > 0);
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
    });
}

function animate() {
    updateParticles();
    drawParticles();
    requestAnimationFrame(animate);
}

// Create particles continuously at the bottom
setInterval(createParticle, PARTICLE_CREATION_INTERVAL);

// Track mouse position
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Reset mouse position when leaving canvas
canvas.addEventListener('mouseleave', () => {
    mouseX = null;
    mouseY = null;
});

animate();