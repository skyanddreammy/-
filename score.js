// 在score.html中添加新的效果

// 添加粒子效果
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
    }

    createParticle(x, y) {
        return {
            x,
            y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 100,
            color: `hsl(${Math.random() * 360}, 50%, 50%)`
        };
    }

    update() {
        this.particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(index, 1);
            }
        });

        if (Math.random() < 0.3) {
            this.particles.push(
                this.createParticle(
                    Math.random() * this.canvas.width,
                    Math.random() * this.canvas.height
                )
            );
        }
    }

    draw() {
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });
    }
}

// 在score.html中初始化和使用
const canvas = document.createElement('canvas');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '-1';
document.body.prepend(canvas);

const particles = new ParticleSystem(canvas);

function animate() {
    particles.update();
    particles.draw();
    requestAnimationFrame(animate);
}

animate(); 