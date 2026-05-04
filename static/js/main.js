/* ─── Floating DNA / Protein Structure Canvas ─── */
class DNACanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.helixes = [];
        this.proteins = [];
        this.time = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.init();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        // DNA double helixes — higher alpha so they read on light backgrounds
        for (let i = 0; i < 4; i++) {
            this.helixes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                phase: Math.random() * Math.PI * 2,
                length: 120 + Math.random() * 80,
                opacity: 0.22 + Math.random() * 0.12,
            });
        }

        // Floating protein-like blobs
        for (let i = 0; i < 6; i++) {
            this.proteins.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: 20 + Math.random() * 30,
                lobes: 3 + Math.floor(Math.random() * 4),
                phase: Math.random() * Math.PI * 2,
                opacity: 0.1 + Math.random() * 0.08,
                rotationSpeed: (Math.random() - 0.5) * 0.005,
            });
        }

        // Small floating nucleotide particles
        for (let i = 0; i < 48; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: 1.5 + Math.random() * 2.5,
                opacity: 0.22 + Math.random() * 0.12,
                pulse: Math.random() * Math.PI * 2,
            });
        }
    }

    drawHelix(helix) {
        const ctx = this.ctx;
        const steps = 30;
        const amplitude = 18;
        const wavelength = helix.length / 3;

        for (let strand = 0; strand < 2; strand++) {
            ctx.beginPath();
            const strandOffset = strand * Math.PI;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const yOff = t * helix.length - helix.length / 2;
                const xOff = Math.sin((t * Math.PI * 6) + helix.phase + this.time * 0.8 + strandOffset) * amplitude;
                const px = helix.x + xOff;
                const py = helix.y + yOff;

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }

            ctx.strokeStyle = `rgba(124, 179, 66, ${helix.opacity})`;
            ctx.lineWidth = 2.25;
            ctx.stroke();
        }

        // Base pair rungs
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const yOff = t * helix.length - helix.length / 2;
            const x1 = Math.sin((t * Math.PI * 6) + helix.phase + this.time * 0.8) * amplitude;
            const x2 = Math.sin((t * Math.PI * 6) + helix.phase + this.time * 0.8 + Math.PI) * amplitude;

            ctx.beginPath();
            ctx.moveTo(helix.x + x1, helix.y + yOff);
            ctx.lineTo(helix.x + x2, helix.y + yOff);
            ctx.strokeStyle = `rgba(120, 113, 108, ${helix.opacity * 0.55})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Nucleotide dots at ends
            ctx.beginPath();
            ctx.arc(helix.x + x1, helix.y + yOff, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 160, 40, ${Math.min(0.95, helix.opacity * 1.1)})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(helix.x + x2, helix.y + yOff, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(109, 76, 65, ${Math.min(0.85, helix.opacity * 1.0)})`;
            ctx.fill();
        }
    }

    drawProtein(protein) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(protein.x, protein.y);
        ctx.rotate(protein.phase + this.time * protein.rotationSpeed * 20);

        // Protein tertiary structure (lumpy blob)
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
            const angle = (i / 60) * Math.PI * 2;
            let r = protein.radius;
            for (let l = 0; l < protein.lobes; l++) {
                r += Math.sin(angle * protein.lobes + l + this.time * 0.5) * (protein.radius * 0.3);
            }
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, protein.radius * 1.5);
        gradient.addColorStop(0, `rgba(124, 179, 66, ${protein.opacity * 1.6})`);
        gradient.addColorStop(0.7, `rgba(104, 159, 56, ${protein.opacity * 0.9})`);
        gradient.addColorStop(1, `rgba(109, 76, 65, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `rgba(88, 139, 38, ${protein.opacity * 0.9})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Alpha helix ribbons inside
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
            const t = i / 20;
            const x = Math.sin(t * Math.PI * 4 + this.time) * protein.radius * 0.5;
            const y = (t - 0.5) * protein.radius * 1.5;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(156, 200, 90, ${protein.opacity * 0.65})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }

    update() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        [...this.helixes, ...this.proteins, ...this.particles].forEach(obj => {
            obj.x += obj.vx;
            obj.y += obj.vy;

            const margin = 150;
            if (obj.x < -margin) obj.x = w + margin;
            if (obj.x > w + margin) obj.x = -margin;
            if (obj.y < -margin) obj.y = h + margin;
            if (obj.y > h + margin) obj.y = -margin;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.helixes.forEach(h => this.drawHelix(h));
        this.proteins.forEach(p => this.drawProtein(p));

        this.particles.forEach(p => {
            const pulseR = p.radius + Math.sin(p.pulse + this.time * 2) * 0.8;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(104, 159, 56, ${p.opacity + Math.sin(p.pulse + this.time) * 0.06})`;
            this.ctx.fill();
        });
    }

    animate() {
        this.time += 0.016;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

/* ─── Navbar scroll effect & mobile toggle ─── */
document.addEventListener('DOMContentLoaded', () => {
    new DNACanvas('dna-canvas');

    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            toggle.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
        });
    }

    function initToolCardRails() {
        document.querySelectorAll('.tool-cards-rail').forEach((rail) => {
            const track = rail.querySelector('.tool-cards-rail__track');
            const prev = rail.querySelector('.tool-cards-rail__nav--prev');
            const next = rail.querySelector('.tool-cards-rail__nav--next');
            if (!track || !prev || !next) return;

            const getStep = () => {
                const card = track.querySelector('.tool-card');
                const row = track.querySelector('.tool-cards-rail__row');
                if (!card || !row) return Math.max(220, track.clientWidth * 0.85);
                const cardW = card.getBoundingClientRect().width;
                const gap = parseFloat(getComputedStyle(row).gap) || 0;
                return Math.min(cardW + gap, track.clientWidth * 0.9);
            };

            const updateNav = () => {
                const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
                const overflow = maxScroll > 8;
                const left = track.scrollLeft;
                prev.disabled = !overflow || left <= 2;
                next.disabled = !overflow || left >= maxScroll - 2;
            };

            prev.addEventListener('click', () => {
                track.scrollBy({ left: -getStep(), behavior: 'smooth' });
            });
            next.addEventListener('click', () => {
                track.scrollBy({ left: getStep(), behavior: 'smooth' });
            });
            track.addEventListener('scroll', updateNav, { passive: true });
            window.addEventListener('resize', updateNav);
            track.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    track.scrollBy({ left: -getStep(), behavior: 'smooth' });
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    track.scrollBy({ left: getStep(), behavior: 'smooth' });
                }
            });
            updateNav();
        });
    }

    initToolCardRails();

    // Animate elements when they scroll into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .highlight-box, .figure').forEach(el => {
        observer.observe(el);
    });
});
