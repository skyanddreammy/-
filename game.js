class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = 0;
        this.speed = isPlayer ? 5 : 3;
        this.bullets = [];
        this.isPlayer = isPlayer;
        this.health = 100;
        this.maxHealth = 100;
        this.moveDirection = { up: false, down: false, left: false, right: false };
        this.radius = 15;
        this.healthBarWidth = 40;
        this.healthBarHeight = 4;
        this.lastHit = 0; // 记录上次受伤时间
        this.invincibleTime = 500; // 受伤后的无敌时间（毫秒）
        this.maxSpeed = isPlayer ? 6 : 3;
        this.acceleration = 0.8;
        this.deceleration = 0.2;
        this.currentSpeed = 0;
        this.rotationSpeed = isPlayer ? 0.15 : 0.08;
        this.reloadTime = isPlayer ? 250 : 1000;
        this.lastShootTime = 0;
        this.lastDamageDirection = null; // 记录上次受伤方向
        this.lastPathChangeTime = 0; // 记录上次改变路径的时间
        this.targetPoint = null; // 目标移动点
        this.state = 'patrol'; // 状态机：patrol, attack, retreat, search
        this.stateTimer = 0;
        this.fleeThreshold = 30; // 血量低于此值时逃跑
        this.aggressiveThreshold = 70; // 血量高于此值时主动进攻
        
        // 添加移动相关属性
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.92;
        this.bulletSpeed = isPlayer ? 15 : 10;
        this.bulletDamage = isPlayer ? 25 : 15;
        this.accuracy = isPlayer ? 1 : 0.85; // 射击精度
        this.moveSpeed = isPlayer ? 5 : 3;
        this.bulletSize = isPlayer ? 4 : 3;    // 增加子弹大小
        this.bulletColor = isPlayer ? '#FFA500' : '#FF4444'; // 区分子弹颜色
        this.collisionCooldown = 0;
        this.collisionCooldownTime = 500; // 碰撞冷却时间（毫秒）
        this.turretAngle = 0; // 炮塔角度，独立于坦克方向
        this.turretRotationSpeed = isPlayer ? 0.2 : 0.1; // 炮塔旋转速度
        this.targetAngle = 0; // 目标角度
        this.detectionRange = isPlayer ? 300 : 250; // 探测范围
        this.preferredRange = isPlayer ? 200 : 150; // 理想作战距离
        
        // 增加NPC的智能属性
        this.dodgeTimer = 0;
        this.dodgeInterval = 1000; // 躲避间隔
        this.dodgeDirection = 1;   // 躲避方向
        this.lastBulletAvoidance = 0;
        this.avoidanceRadius = 100; // 子弹躲避半径
        this.reactionTime = isPlayer ? 0 : Math.random() * 200 + 100; // NPC反应时间
    }

    draw(ctx) {
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // 坦克阴影
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // 坦克底座
        ctx.fillStyle = this.color;
        this.drawTankBody(ctx);

        // 炮塔
        ctx.rotate(this.turretAngle - this.angle); // 相对于底座的旋转
        this.drawTurret(ctx);

        // 履带效果
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
            this.drawTracks(ctx);
        }

        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.restore();

        // 绘制血量条
        this.drawHealthBar(ctx);
    }

    drawTankBody(ctx) {
        ctx.beginPath();
        ctx.roundRect(-15, -15, 30, 30, 5);
        ctx.fill();
        
        // 添加装甲纹理
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -15);
        ctx.lineTo(-10, 15);
        ctx.moveTo(10, -15);
        ctx.lineTo(10, 15);
        ctx.stroke();
    }

    drawTurret(ctx) {
        // 炮管
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -3, 25, 6);
        
        // 炮塔圆形基座
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();
    }

    drawTracks(ctx) {
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            const time = Date.now() / (200 / speed);
            
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 3;
            
            [-18, 18].forEach(x => {
                for(let y = -15; y <= 15; y += 5) {
                    const offset = Math.sin(time + y / 5) * 2;
                    ctx.beginPath();
                    ctx.moveTo(x + offset, y - 2);
                    ctx.lineTo(x + offset, y + 2);
                    ctx.stroke();
                }
            });
        }
    }

    drawHealthBar(ctx) {
        const barX = this.x - this.healthBarWidth / 2;
        const barY = this.y - 25;
        
        // 血条背景
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);
        
        // 血条
        const healthPercent = this.health / 100;
        const healthColor = this.getHealthColor(healthPercent);
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, this.healthBarWidth * healthPercent, this.healthBarHeight);
    }

    getHealthColor(percent) {
        if (percent > 0.6) return '#4CAF50';
        if (percent > 0.3) return '#FFC107';
        return '#F44336';
    }

    takeDamage(damage) {
        const now = Date.now();
        // 只在碰撞冷却结束后才受到伤害
        if (now - this.lastHit >= this.invincibleTime && 
            now - this.collisionCooldown >= this.collisionCooldownTime) {
            this.health = Math.max(0, this.health - damage);
            this.lastHit = now;
            return true;
        }
        return false;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShootTime >= this.reloadTime) {
            const spread = this.isPlayer ? 0.05 : 0.1;
            const randomSpread = (Math.random() - 0.5) * spread;
            const finalAngle = this.turretAngle + randomSpread; // 使用炮塔角度

            const bulletOffset = 25;
            const bullet = {
                x: this.x + Math.cos(finalAngle) * bulletOffset,
                y: this.y + Math.sin(finalAngle) * bulletOffset,
                angle: finalAngle,
                speed: this.bulletSpeed,
                damage: this.bulletDamage,
                size: this.bulletSize,
                color: this.bulletColor
            };
            
            this.bullets.push(bullet);
            this.lastShootTime = now;

            // 减小后坐力影响
            if (this.isPlayer) {
                this.velocity.x -= Math.cos(this.angle) * 0.5;
                this.velocity.y -= Math.sin(this.angle) * 0.5;
            }

            return true;
        }
        return false;
    }

    move() {
        // 计算目标速度
        let targetVelX = 0;
        let targetVelY = 0;

        if (this.moveDirection.up) targetVelY -= this.maxSpeed;
        if (this.moveDirection.down) targetVelY += this.maxSpeed;
        if (this.moveDirection.left) targetVelX -= this.maxSpeed;
        if (this.moveDirection.right) targetVelX += this.maxSpeed;

        // 对角线移动速度标准化
        if (targetVelX !== 0 && targetVelY !== 0) {
            const factor = 1 / Math.sqrt(2);
            targetVelX *= factor;
            targetVelY *= factor;
        }

        // 分别应用X和Y方向的移动，以实现滑动效果
        const originalX = this.x;
        const originalY = this.y;

        // 先尝试X方向移动
        this.velocity.x += (targetVelX - this.velocity.x) * this.acceleration;
        this.x += this.velocity.x;

        // 如果X方向发生碰撞，回退并减少X方向速度
        if (this.game && this.game.rocks) {
            if (this.checkWallCollision(this.game.rocks)) {
                this.x = originalX;
                this.velocity.x *= -0.5;
            }
        }

        // 再尝试Y方向移动
        this.velocity.y += (targetVelY - this.velocity.y) * this.acceleration;
        this.y += this.velocity.y;

        // 如果Y方向发生碰撞，回退并减少Y方向速度
        if (this.game && this.game.rocks) {
            if (this.checkWallCollision(this.game.rocks)) {
                this.y = originalY;
                this.velocity.y *= -0.5;
            }
        }

        // 应用摩擦力
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // 边界检测
        this.x = Math.max(this.radius, Math.min(this.x, 800 - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, 600 - this.radius));
    }

    checkWallCollision(rocks) {
        if (!rocks || !Array.isArray(rocks)) return false;
        
        return rocks.some(rock => {
            if (!rock) return false;
            
            const dx = this.x - Math.max(rock.x, Math.min(this.x, rock.x + rock.width));
            const dy = this.y - Math.max(rock.y, Math.min(this.y, rock.y + rock.height));
            return (dx * dx + dy * dy) < (this.radius * this.radius);
        });
    }

    // 添加坦克轨迹效果
    drawTrail(ctx) {
        if (this.currentSpeed > 0.5) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100,100,100,0.3)`;
            ctx.fill();
        }
    }

    handleCollision(otherTank) {
        // 设置碰撞冷却
        this.collisionCooldown = Date.now();
        
        // 减少速度但不完全停止
        this.velocity.x *= 0.5;
        this.velocity.y *= 0.5;
    }

    update(target) {
        // 更新炮塔角度
        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            this.targetAngle = Math.atan2(dy, dx);

            // 平滑旋转炮塔
            let angleDiff = this.targetAngle - this.turretAngle;
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.turretAngle += angleDiff * this.turretRotationSpeed;
        }
    }
}

class Rock {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    checkCollision(obj) {
        return obj.x + 15 > this.x && 
               obj.x - 15 < this.x + this.width &&
               obj.y + 15 > this.y && 
               obj.y - 15 < this.y + this.height;
    }

    checkPoint(x, y) {
        return x > this.x && x < this.x + this.width &&
               y > this.y && y < this.y + this.height;
    }

    checkLine(x1, y1, x2, y2) {
        // 简化的线段碰撞检测
        const points = [
            {x: x1, y: y1},
            {x: x2, y: y2}
        ];
        
        for(let point of points) {
            if(this.checkPoint(point.x, point.y)) {
                return true;
            }
        }
        return false;
    }
}

class Game {
    constructor(level) {
        if (!level) {
            console.error('No level configuration provided!');
            return;
        }

        // 获取画布
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        // 设置画布尺寸
        this.canvas.width = 800;
        this.canvas.height = 600;

        // 初始化游戏状态 - 移到最前面
        this.gameState = {
            isOver: false,
            isVictory: false,
            endTime: 0,
            fadeOut: 0
        };

        // 初始化游戏数据
        this.level = level;
        this.targetKills = level.targetKills;
        this.difficulty = level.difficulty;
        this.score = 0;
        this.npcsDefeated = 0;

        // 初始化统计信息
        this.stats = {
            shots: 0,
            hits: 0,
            accuracy: 0,
            killStreak: 0,
            maxKillStreak: 0
        };

        // 初始化游戏元素
        this.rocks = [];
        this.particles = [];
        this.scorePopups = [];
        
        // 初始化分数相关
        this.displayScore = 0;
        this.lastScoreUpdate = Date.now();

        // 创建玩家和NPC
        this.player = new Tank(100, 300, '#4CAF50', true);
        this.player.game = this;  // 添加对game的引用
        this.npcs = [];

        // 创建地图和生成NPC
        this.createMap(level.map);
        this.initialSpawn(level.npcCount, level.npcConfig);

        // 初始化输入状态 - 添加在构造函数的开始部分
        this.inputState = {
            keys: new Set(),
            mouse: {
                x: 0,
                y: 0,
                down: false
            },
            lastMoveTime: Date.now()
        };

        // 初始化控制状态
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;

        // 设置事件监听
        this.setupEventListeners();

        // 启动游戏循环
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(() => this.gameLoop());

        console.log("Game initialized with state:", this.gameState);
    }

    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            
            const key = e.key.toLowerCase();
            this.inputState.keys.add(key);
            this.inputState.lastMoveTime = Date.now();
            
            switch(key) {
                case 'w': this.player.moveDirection.up = true; break;
                case 's': this.player.moveDirection.down = true; break;
                case 'a': this.player.moveDirection.left = true; break;
                case 'd': this.player.moveDirection.right = true; break;
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.inputState.keys.delete(key);
            
            switch(key) {
                case 'w': this.player.moveDirection.up = false; break;
                case 's': this.player.moveDirection.down = false; break;
                case 'a': this.player.moveDirection.left = false; break;
                case 'd': this.player.moveDirection.right = false; break;
            }
        });

        // 鼠标事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            // 同时更新 inputState
            this.inputState.mouse.x = this.mouseX;
            this.inputState.mouse.y = this.mouseY;
        });

        this.canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
            this.inputState.mouse.down = true;
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
            this.inputState.mouse.down = false;
        });

        // 防止右键菜单
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // 失去焦点时重置所有输入状态
        window.addEventListener('blur', () => {
            this.resetInputState();
        });

        // 添加空格键重试功能
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState.isOver && !this.gameState.isVictory) {
                window.location.reload();
            }
        });
    }

    gameLoop() {
        if (!this.isRunning) return;

        // 清除画布
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新游戏状态
        this.update();

        // 绘制游戏元素
        this.draw();

        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // 检查gameState是否存在
        if (!this.gameState) {
            this.gameState = {
                isOver: false,
                isVictory: false,
                endTime: 0,
                fadeOut: 0
            };
        }

        if (this.gameState.isOver) {
            const timeSinceEnd = Date.now() - this.gameState.endTime;
            if (timeSinceEnd > 2000) {
                this.endGame();
                return;
            }
            this.gameState.fadeOut = Math.min(1, timeSinceEnd / 1000);
        }

        // 更新玩家
        if (this.player) {
            const originalX = this.player.x;
            const originalY = this.player.y;
            this.player.move();

            // 检查碰撞
            if (this.rocks.some(rock => this.checkCollision(this.player, rock).colliding)) {
                this.player.x = originalX;
                this.player.y = originalY;
                this.player.velocity.x *= 0.8;
                this.player.velocity.y *= 0.8;
            }

            // 处理射击
            if (this.mouseDown) {
                this.player.shoot();
            }
        }

        // 更新NPC
        this.npcs.forEach(npc => {
            if (!npc) return;
            
            const originalX = npc.x;
            const originalY = npc.y;
            
            this.updateNPCBehavior(npc);
            
            let totalPushX = 0;
            let totalPushY = 0;
            let hasCollision = false;

            this.rocks.forEach(rock => {
                const collision = this.checkCollision(npc, rock);
                if (collision.colliding) {
                    hasCollision = true;
                    totalPushX += collision.pushX;
                    totalPushY += collision.pushY;
                }
            });

            if (hasCollision) {
                npc.x += totalPushX;
                npc.y += totalPushY;
                npc.velocity.x *= 0.8;
                npc.velocity.y *= 0.8;
            }
        });

        // 更新子弹
        this.updateBullets();

        // 在更新位置后检查坦克之间的碰撞
        this.checkTankCollisions();

        // 更新玩家炮塔方向
        if (this.player) {
            this.player.update({
                x: this.mouseX,
                y: this.mouseY
            });
        }
    }

    draw() {
        // 绘制地图
        this.drawMap();

        // 绘制玩家
        if (this.player) {
            this.player.draw(this.ctx);
        }

        // 绘制NPC
        this.npcs.forEach(npc => {
            if (npc) npc.draw(this.ctx);
        });

        // 绘制UI
        this.drawGameInfo();

        // 检查gameState是否存在
        if (this.gameState && this.gameState.isOver) {
            this.drawEndScreen();
        }

        // 绘制分数弹出效果
        if (this.scorePopups && this.scorePopups.length > 0) {
            this.scorePopups.forEach((popup, index) => {
                if (!popup) return;
                
                popup.y += popup.velocity;
                popup.life--;
                
                const alpha = popup.life / 60;
                this.ctx.fillStyle = popup.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
                this.ctx.font = 'bold 20px Arial';
                this.ctx.fillText(`+${popup.score}`, popup.x, popup.y);
                
                if (popup.life <= 0) {
                    this.scorePopups.splice(index, 1);
                }
            });
        }
    }

    initialSpawn(count, config) {
        console.log("Spawning initial NPCs:", count);
        for (let i = 0; i < count; i++) {
            const spawnPoint = this.getValidSpawnPoint();
            if (spawnPoint) {
                const npc = new Tank(spawnPoint.x, spawnPoint.y, '#FF4444');
                npc.game = this;  // 添加对game的引用
                npc.speed = config.speed;
                npc.health = config.health;
                npc.reloadTime = config.shootInterval;
                this.npcs.push(npc);
                console.log("NPC spawned at:", spawnPoint);
            }
        }
    }

    getValidSpawnPoint() {
        const margin = 50;
        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts) {
            const x = margin + Math.random() * (this.canvas.width - 2 * margin);
            const y = margin + Math.random() * (this.canvas.height - 2 * margin);

            if (!this.isPositionBlocked(x, y) && 
                !this.isNearPlayer(x, y, 200) && 
                !this.isNearOtherNPCs(x, y, 150)) {
                return {x, y};
            }
            attempts++;
        }
        return null;
    }

    createMap(mapData) {
        // 清空现有的rocks数组
        this.rocks = [];

        // 创建外墙
        const wallThickness = 20;
        this.addWall(0, 0, 800, wallThickness); // 上墙
        this.addWall(0, 600 - wallThickness, 800, wallThickness); // 下墙
        this.addWall(0, 0, wallThickness, 600); // 左墙
        this.addWall(800 - wallThickness, 0, wallThickness, 600); // 右墙

        // 创建地图装饰
        this.createMapDecorations();

        // 添加关卡特定的墙体
        if (Array.isArray(mapData)) {
            mapData.forEach(({ x, y, width, height }) => {
                this.addWall(x, y, width, height);
            });
        }

        console.log('Map walls created:', this.rocks.length);
    }

    createMapDecorations() {
        // 添加随机的装饰性障碍物
        const decorationCount = 5;
        for (let i = 0; i < decorationCount; i++) {
            const size = 20 + Math.random() * 30;
            let x, y;
            let attempts = 0;
            const maxAttempts = 50;

            do {
                x = 40 + Math.random() * (this.canvas.width - 80 - size);
                y = 40 + Math.random() * (this.canvas.height - 80 - size);
                attempts++;
            } while (
                attempts < maxAttempts && 
                (this.isPositionBlocked(x, y) || this.isNearPlayer(x, y, 100))
            );

            if (attempts < maxAttempts) {
                this.addDecoration(x, y, size, size);
            }
        }
    }

    addDecoration(x, y, width, height) {
        const decoration = new Rock(x, y, width, height);
        decoration.isDecoration = true;
        this.rocks.push(decoration);
    }

    drawMap() {
        // 绘制背景网格
        this.drawGrid();

        // 绘制岩石和装饰物
        this.rocks.forEach(rock => {
            this.ctx.save();
            
            // 设置阴影
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;

            // 为装饰物使用特殊的渲染
            if (rock.isDecoration) {
                this.drawDecoration(rock);
            } else {
                this.drawWall(rock);
            }

            this.ctx.restore();
        });
    }

    drawGrid() {
        const gridSize = 40;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.lineWidth = 1;

        // 绘制垂直线
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // 绘制水平线
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawWall(rock) {
        // 创建渐变
        const gradient = this.ctx.createLinearGradient(
            rock.x, rock.y,
            rock.x + rock.width, rock.y + rock.height
        );
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(0.5, '#666');
        gradient.addColorStop(1, '#4a4a4a');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(rock.x, rock.y, rock.width, rock.height);

        // 添加高光效果
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.ctx.fillRect(rock.x, rock.y, rock.width, 2);
        this.ctx.fillRect(rock.x, rock.y, 2, rock.height);
    }

    drawDecoration(rock) {
        // 使用圆角矩形绘制装饰物
        this.ctx.fillStyle = '#555';
        this.roundRect(
            this.ctx,
            rock.x, rock.y,
            rock.width, rock.height,
            5
        );
        this.ctx.fill();

        // 添加纹理
        this.addRockTexture(rock);
    }

    addRockTexture(rock) {
        // 添加随机的点和线条作为纹理
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 10; i++) {
            const x = rock.x + Math.random() * rock.width;
            const y = rock.y + Math.random() * rock.height;
            const size = Math.random() * 3 + 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    addWall(x, y, width, height) {
        this.rocks.push(new Rock(x, y, width, height));
    }

    checkObstacleOverlap(x, y, width, height) {
        // 检查新障碍物是否与现有障碍物重叠
        for(let rock of this.rocks) {
            if(x < rock.x + rock.width + 20 &&
               x + width + 20 > rock.x &&
               y < rock.y + rock.height + 20 &&
               y + height + 20 > rock.y) {
                return true;
            }
        }
        return false;
    }

    isNearPlayer(x, y, minDistance = 150) {
        const dx = this.player.x - x;
        const dy = this.player.y - y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
    }

    isNearOtherNPCs(x, y, minDistance = 100) {
        return this.npcs.some(npc => {
            const dx = npc.x - x;
            const dy = npc.y - y;
            return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });
    }

    createFireworks(x, y) {
        for(let i = 0; i < 50; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 100,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        }
    }

    drawHeart(x, y) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.bezierCurveTo(x-30, y-30, x-40, y, x, y+35);
        this.ctx.bezierCurveTo(x+40, y, x+30, y-30, x, y);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
    }

    updateNPCBehavior(npc) {
        if (!npc || !this.player) return;

        const distanceToPlayer = this.getDistanceToPlayer(npc);
        const canSeePlayer = this.hasLineOfSight(npc, this.player);
        
        // 检测附近的子弹并躲避
        this.avoidBullets(npc);
        
        // 更新NPC的目标
        npc.update(canSeePlayer ? this.player : null);

        switch(npc.state) {
            case 'patrol':
                if (canSeePlayer && distanceToPlayer < npc.detectionRange) {
                    npc.state = 'attack';
                } else {
                    this.npcPatrolBehavior(npc);
                }
                break;

            case 'attack':
                if (!canSeePlayer) {
                    npc.state = 'search';
                    npc.lastKnownPlayerPos = {x: this.player.x, y: this.player.y};
                } else {
                    this.npcCombatBehavior(npc, distanceToPlayer);
                }
                break;

            case 'search':
                if (canSeePlayer) {
                    npc.state = 'attack';
                } else {
                    this.npcSearchBehavior(npc);
                }
                break;
        }

        // 应用智能移动
        this.applySmartMovement(npc);
    }

    avoidBullets(npc) {
        const now = Date.now();
        if (now - npc.lastBulletAvoidance < npc.reactionTime) return;

        this.player.bullets.forEach(bullet => {
            const dx = bullet.x - npc.x;
            const dy = bullet.y - npc.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < npc.avoidanceRadius) {
                // 计算子弹的预期路径
                const futureX = bullet.x + Math.cos(bullet.angle) * bullet.speed * 5;
                const futureY = bullet.y + Math.sin(bullet.angle) * bullet.speed * 5;
                
                // 计算躲避方向
                const avoidanceAngle = Math.atan2(npc.y - futureY, npc.x - futureX) + Math.PI/2;
                
                // 应用躲避移动
                npc.velocity.x += Math.cos(avoidanceAngle) * npc.acceleration * 2;
                npc.velocity.y += Math.sin(avoidanceAngle) * npc.acceleration * 2;
                
                npc.lastBulletAvoidance = now;
            }
        });
    }

    npcCombatBehavior(npc, distanceToPlayer) {
        const now = Date.now();
        const dx = this.player.x - npc.x;
        const dy = this.player.y - npc.y;
        const angleToPlayer = Math.atan2(dy, dx);

        // 更智能的战斗行为
        if (npc.health < npc.maxHealth * 0.4) {
            // 血量低时寻找掩体并保持距离
            const cover = this.findNearestCover(npc);
            if (cover) {
                this.moveTowardsCover(npc, cover);
            } else {
                this.evasiveManeuvers(npc, angleToPlayer);
            }
        } else if (distanceToPlayer < npc.preferredRange * 0.7) {
            // 太近时后退并寻找更好的位置
            this.tacticalRetreat(npc, angleToPlayer);
        } else if (distanceToPlayer > npc.preferredRange * 1.3) {
            // 太远时智能接近
            this.advanceTactically(npc);
        } else {
            // 在理想范围内时进行战术机动
            this.combatManeuvers(npc, now, angleToPlayer);
        }

        // 智能射击
        if (this.canShootPlayer(npc)) {
            this.tacticalShoot(npc);
        }
    }

    findNearestCover(npc) {
        let nearestCover = null;
        let minDistance = Infinity;

        // 检查所有岩石作为潜在掩体
        for (const rock of this.rocks) {
            // 检查岩石的四个角和中心点
            const coverPoints = [
                { x: rock.x, y: rock.y },
                { x: rock.x + rock.width, y: rock.y },
                { x: rock.x, y: rock.y + rock.height },
                { x: rock.x + rock.width, y: rock.y + rock.height },
                { x: rock.x + rock.width/2, y: rock.y + rock.height/2 }
            ];

            for (const point of coverPoints) {
                // 检查这个点是否能阻挡玩家的视线
                if (!this.hasLineOfSight(this.player, point)) {
                    const dx = point.x - npc.x;
                    const dy = point.y - npc.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // 确保掩体点可达且距离合适
                    if (distance < minDistance && 
                        distance > 30 && // 不要太近
                        this.isPathClear(npc, point)) {
                        minDistance = distance;
                        nearestCover = point;
                    }
                }
            }
        }

        return nearestCover;
    }

    isPathClear(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / 10);

        for (let i = 1; i <= steps; i++) {
            const x = from.x + (dx * i) / steps;
            const y = from.y + (dy * i) / steps;
            if (!this.isSafePosition(x, y, 20)) {
                return false;
            }
        }
        return true;
    }

    moveTowardsCover(npc, cover) {
        const dx = cover.x - npc.x;
        const dy = cover.y - npc.y;
        const angle = Math.atan2(dy, dx);
        
        npc.velocity.x += Math.cos(angle) * npc.acceleration * 1.5;
        npc.velocity.y += Math.sin(angle) * npc.acceleration * 1.5;
    }

    evasiveManeuvers(npc, angleToPlayer) {
        // 随机选择躲避方向
        const evasionAngle = angleToPlayer + Math.PI + (Math.random() - 0.5);
        npc.velocity.x += Math.cos(evasionAngle) * npc.acceleration * 2;
        npc.velocity.y += Math.sin(evasionAngle) * npc.acceleration * 2;
    }

    tacticalRetreat(npc, angleToPlayer) {
        // 后退的同时进行横向移动
        const retreatAngle = angleToPlayer + Math.PI;
        const strafeDir = Math.sin(Date.now() / 500) * Math.PI / 2;
        
        npc.velocity.x += Math.cos(retreatAngle + strafeDir) * npc.acceleration;
        npc.velocity.y += Math.sin(retreatAngle + strafeDir) * npc.acceleration;
    }

    advanceTactically(npc) {
        const path = this.findSafePath(npc, this.player);
        if (path) {
            const angle = Math.atan2(path.y - npc.y, path.x - npc.x);
            npc.velocity.x += Math.cos(angle) * npc.acceleration;
            npc.velocity.y += Math.sin(angle) * npc.acceleration;
        }
    }

    combatManeuvers(npc, now, angleToPlayer) {
        // 复杂的战斗机动
        if (now - npc.dodgeTimer > npc.dodgeInterval) {
            npc.dodgeDirection *= -1;
            npc.dodgeTimer = now;
        }

        const strafeAngle = angleToPlayer + (Math.PI/2 * npc.dodgeDirection);
        npc.velocity.x += Math.cos(strafeAngle) * npc.acceleration;
        npc.velocity.y += Math.sin(strafeAngle) * npc.acceleration;

        // 添加随机的小幅度移动
        npc.velocity.x += (Math.random() - 0.5) * npc.acceleration * 0.5;
        npc.velocity.y += (Math.random() - 0.5) * npc.acceleration * 0.5;
    }

    canShootPlayer(npc) {
        const distanceToPlayer = this.getDistanceToPlayer(npc);
        return distanceToPlayer < npc.detectionRange && 
               this.hasLineOfSight(npc, this.player);
    }

    tacticalShoot(npc) {
        // 预判玩家移动
        const predictedX = this.player.x + this.player.velocity.x * 15;
        const predictedY = this.player.y + this.player.velocity.y * 15;
        
        // 计算提前量
        const bulletTime = this.getDistanceToPlayer(npc) / npc.bulletSpeed;
        const aimX = predictedX + this.player.velocity.x * bulletTime;
        const aimY = predictedY + this.player.velocity.y * bulletTime;
        
        npc.targetAngle = Math.atan2(aimY - npc.y, aimX - npc.x);
        npc.shoot();
    }

    updateBullets() {
        [this.player, ...this.npcs].forEach(tank => {
            if (!tank || !tank.bullets) return;

            tank.bullets.forEach((bullet, bulletIndex) => {
                // 保存旧位置用于轨迹
                const oldX = bullet.x;
                const oldY = bullet.y;

                // 更新子弹位置
                bullet.x += Math.cos(bullet.angle) * bullet.speed;
                bullet.y += Math.sin(bullet.angle) * bullet.speed;

                // 绘制子弹轨迹
                this.ctx.beginPath();
                this.ctx.moveTo(oldX, oldY);
                this.ctx.lineTo(bullet.x, bullet.y);
                this.ctx.strokeStyle = bullet.color;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // 绘制子弹
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
                this.ctx.fillStyle = bullet.color;
                this.ctx.fill();

                // 添加发光效果
                this.ctx.shadowColor = bullet.color;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;

                // 检查碰撞
                let hitWall = false;
                for (let rock of this.rocks) {
                    if (rock.checkLine(oldX, oldY, bullet.x, bullet.y)) {
                        hitWall = true;
                        // 创建击中效果
                        this.createHitEffect(bullet.x, bullet.y, bullet.color);
                        break;
                    }
                }

                if (hitWall) {
                    tank.bullets.splice(bulletIndex, 1);
                    return;
                }

                // 检测击中目标
                const targets = tank === this.player ? this.npcs : [this.player];
                for (let target of targets) {
                    if (!target) continue;

                    const dx = bullet.x - target.x;
                    const dy = bullet.y - target.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < target.radius) {
                        if (target.takeDamage(bullet.damage)) {
                            this.createHitEffect(bullet.x, bullet.y, '#FF0000');
                            
                            if (target === this.player) {
                                // 玩家被击中时不直接结束游戏
                                if (target.health <= 0) {
                                    this.gameState.isOver = true;
                                }
                            } else {
                                if (target.health <= 0) {
                                    this.handleNPCDefeat(target);
                                }
                            }
                        }
                        tank.bullets.splice(bulletIndex, 1);
                        break;
                    }
                }

                // 移除出界的子弹
                if (bullet.x < 0 || bullet.x > this.canvas.width ||
                    bullet.y < 0 || bullet.y > this.canvas.height) {
                    tank.bullets.splice(bulletIndex, 1);
                }
            });
        });
    }

    createHitEffect(x, y, color) {
        // 创建击中特效
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 20,
                color: color
            });
        }
    }

    handleNPCDefeat(npc) {
        if (!npc) return;

        this.npcs = this.npcs.filter(n => n !== npc);
        this.npcsDefeated++;
        this.createFireworks(npc.x, npc.y);
        
        const baseScore = 100;
        const streakBonus = Math.min(this.stats.killStreak * 10, 50);
        const difficultyBonus = Math.floor(this.difficulty * 20);
        const totalScore = baseScore + streakBonus + difficultyBonus;
        
        this.score += totalScore;

        // 添加安全检查
        try {
            this.addScorePopup(npc.x, npc.y - 30, totalScore, 
                this.stats.killStreak >= 3 ? 'streak' : 'normal');
        } catch (error) {
            console.error('Error adding score popup:', error);
        }
        
        this.updateStats(true);
        
        if (this.npcsDefeated >= this.targetKills) {
            // 确保gameState存在
            if (!this.gameState) {
                this.gameState = {
                    isOver: false,
                    isVictory: false,
                    endTime: 0,
                    fadeOut: 0
                };
            }
            this.gameState.isOver = true;
            this.gameState.isVictory = true;
            this.gameState.endTime = Date.now();
        } else if (this.npcs.length < 3) {
            this.initialSpawn(1, this.level.npcConfig);
        }
    }

    addScorePopup(x, y, score, type = 'normal') {
        if (!this.scorePopups) {
            this.scorePopups = [];
        }

        const colors = {
            normal: '#fff',
            headshot: '#ff0',
            streak: '#f0f'
        };
        
        this.scorePopups.push({
            x: x,
            y: y,
            score: score,
            color: colors[type] || colors.normal,
            life: 60,
            velocity: -2
        });
    }

    updateStats(hit = false) {
        if (!this.stats) {
            this.stats = {
                shots: 0,
                hits: 0,
                accuracy: 0,
                killStreak: 0,
                maxKillStreak: 0
            };
        }

        if (hit) {
            this.stats.hits++;
            this.stats.killStreak++;
            this.stats.maxKillStreak = Math.max(this.stats.maxKillStreak, this.stats.killStreak);
        } else {
            this.stats.shots++;
            // 未命中时重置连杀
            this.stats.killStreak = 0;
        }
        
        // 计算命中率
        this.stats.accuracy = this.stats.shots > 0 
            ? Math.round((this.stats.hits / this.stats.shots) * 100) 
            : 0;
    }

    drawGameInfo() {
        // 确保stats对象存在
        if (!this.stats) {
            this.stats = {
                shots: 0,
                hits: 0,
                accuracy: 0,
                killStreak: 0,
                maxKillStreak: 0
            };
        }

        // 主信息面板背景
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(5, 5, 250, 140);
        
        // 面板边框
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(5, 5, 250, 140);

        // 确保displayScore已初始化
        if (typeof this.displayScore === 'undefined') {
            this.displayScore = 0;
        }

        // 分数动画
        this.displayScore += (this.score - this.displayScore) * 0.1;
        
        // 主要信息
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(`分数: ${Math.round(this.displayScore)}`, 15, 35);
        
        // 进度信息
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillText(`击败: ${this.npcsDefeated}/${this.targetKills}`, 15, 65);
        
        // 难度星级
        this.ctx.fillStyle = '#FFA500';
        this.ctx.font = '20px Arial';
        const stars = '★'.repeat(Math.min(5, Math.ceil(this.difficulty))) + 
                     '☆'.repeat(Math.max(0, 5 - Math.ceil(this.difficulty)));
        this.ctx.fillText(`难度: ${stars}`, 15, 95);

        // 统计信息
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText(`命中率: ${this.stats.accuracy}%`, 15, 120);
        this.ctx.fillText(`连杀: ${this.stats.killStreak}`, 130, 120);
        this.ctx.fillText(`最高连杀: ${this.stats.maxKillStreak}`, 15, 140);
    }

    drawReloadIndicator() {
        // 绘制射击冷却指示器
        const reloadProgress = Math.min(
            1,
            (Date.now() - this.player.lastShootTime) / this.player.reloadTime
        );
        
        if (reloadProgress < 1) {
            const radius = 25;
            const centerX = this.player.x;
            const centerY = this.player.y - 40;
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2 * reloadProgress);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    // 添加缺失的方法
    isPositionBlocked(x, y) {
        return this.rocks.some(rock => {
            const distance = Math.sqrt(
                Math.pow(x - (rock.x + rock.width/2), 2) +
                Math.pow(y - (rock.y + rock.height/2), 2)
            );
            return distance < 30;
        });
    }

    getDistanceToPlayer(npc) {
        return Math.sqrt(
            Math.pow(this.player.x - npc.x, 2) +
            Math.pow(this.player.y - npc.y, 2)
        );
    }

    hasLineOfSight(entity1, entity2) {
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / 10);

        for (let i = 1; i < steps; i++) {
            const x = entity1.x + (dx * i) / steps;
            const y = entity1.y + (dy * i) / steps;
            
            if (this.isPositionBlocked(x, y)) {
                return false;
            }
        }
        return true;
    }

    checkCollision(entity, rock) {
        // 改进的碰撞检测
        const closestX = Math.max(rock.x, Math.min(entity.x, rock.x + rock.width));
        const closestY = Math.max(rock.y, Math.min(entity.y, rock.y + rock.height));
        
        const distanceX = entity.x - closestX;
        const distanceY = entity.y - closestY;
        
        const squaredDistance = (distanceX * distanceX) + (distanceY * distanceY);
        const colliding = squaredDistance < (entity.radius * entity.radius);

        if (colliding) {
            // 计算推出向量
            const overlap = entity.radius - Math.sqrt(squaredDistance);
            if (overlap > 0 && squaredDistance > 0) {
                const pushX = (distanceX / Math.sqrt(squaredDistance)) * overlap;
                const pushY = (distanceY / Math.sqrt(squaredDistance)) * overlap;
                return { colliding: true, pushX, pushY };
            }
        }
        
        return { colliding: false, pushX: 0, pushY: 0 };
    }

    // 添加辅助方法来检查位置是否安全
    isSafePosition(x, y, radius) {
        // 检查是否在画布范围内
        if (x < radius || x > this.canvas.width - radius ||
            y < radius || y > this.canvas.height - radius) {
            return false;
        }

        // 检查是否与墙体碰撞
        const entity = { x, y, radius };
        return !this.rocks.some(rock => this.checkCollision(entity, rock));
    }

    resetInputState() {
        if (this.player) {
            this.player.moveDirection = { up: false, down: false, left: false, right: false };
        }
        this.inputState.keys.clear();
        this.inputState.mouse.down = false;
        this.mouseDown = false;
    }

    reloadWeapon() {
        // Implementation of reloadWeapon method
    }

    drawEndScreen() {
        // 绘制半透明背景
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.gameState.fadeOut * 0.7})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制结果文本
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.gameState.fadeOut})`;
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (this.gameState.isVictory) {
            this.ctx.fillText('胜利！', centerX, centerY - 40);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`得分: ${Math.round(this.score)}`, centerX, centerY + 20);
            this.ctx.fillText('正在保存成绩...', centerX, centerY + 60);
        } else {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.gameState.fadeOut})`;
            this.ctx.fillText('游戏结束', centerX, centerY - 40);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按空格键重试', centerX, centerY + 20);
        }
    }

    endGame() {
        if (this.gameState.isVictory) {
            // 构建统计数据
            const statsUrl = new URLSearchParams({
                score: Math.round(this.score),
                defeated: this.npcsDefeated,
                accuracy: this.stats.accuracy,
                maxStreak: this.stats.maxKillStreak
            }).toString();

            // 跳转到结算页面
            window.location.href = `celebration.html?${statsUrl}`;
        } else {
            // 重新加载当前关卡
            window.location.reload();
        }
    }

    npcPatrolBehavior(npc) {
        // 如果没有巡逻点或已到达巡逻点，生成新的巡逻点
        if (!npc.patrolPoint || 
            Math.abs(npc.x - npc.patrolPoint.x) < 20 && 
            Math.abs(npc.y - npc.patrolPoint.y) < 20) {
            
            npc.patrolPoint = {
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (this.canvas.height - 100) + 50
            };
        }

        if (npc.patrolPoint) {
            const dx = npc.patrolPoint.x - npc.x;
            const dy = npc.patrolPoint.y - npc.y;
            const angle = Math.atan2(dy, dx);
            
            // 缓慢移动到巡逻点
            npc.velocity.x += Math.cos(angle) * (npc.acceleration * 0.5);
            npc.velocity.y += Math.sin(angle) * (npc.acceleration * 0.5);
        }

        // 随机改变方向
        if (Math.random() < 0.02) {
            npc.angle += (Math.random() - 0.5) * Math.PI * 0.25;
        }
    }

    // 添加坦克之间的碰撞检测
    checkTankCollisions() {
        // 检查玩家和NPC之间的碰撞
        this.npcs.forEach(npc => {
            if (!npc) return;

            const dx = this.player.x - npc.x;
            const dy = this.player.y - npc.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.player.radius + npc.radius;

            if (distance < minDistance) {
                // 计算碰撞响应
                const angle = Math.atan2(dy, dx);
                const overlap = minDistance - distance;
                
                // 将坦克分开
                const moveX = Math.cos(angle) * overlap * 0.5;
                const moveY = Math.sin(angle) * overlap * 0.5;
                
                // 移动双方
                this.player.x += moveX;
                this.player.y += moveY;
                npc.x -= moveX;
                npc.y -= moveY;
                
                // 减少速度而不是完全停止
                this.player.velocity.x *= 0.8;
                this.player.velocity.y *= 0.8;
                npc.velocity.x *= 0.8;
                npc.velocity.y *= 0.8;
            }
        });

        // 检查NPC之间的碰撞
        for (let i = 0; i < this.npcs.length; i++) {
            for (let j = i + 1; j < this.npcs.length; j++) {
                const npc1 = this.npcs[i];
                const npc2 = this.npcs[j];
                if (!npc1 || !npc2) continue;

                const dx = npc1.x - npc2.x;
                const dy = npc1.y - npc2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = npc1.radius + npc2.radius;

                if (distance < minDistance) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    
                    const moveX = Math.cos(angle) * overlap * 0.5;
                    const moveY = Math.sin(angle) * overlap * 0.5;
                    
                    npc1.x += moveX;
                    npc1.y += moveY;
                    npc2.x -= moveX;
                    npc2.y -= moveY;
                    
                    npc1.velocity.x *= 0.8;
                    npc1.velocity.y *= 0.8;
                    npc2.velocity.x *= 0.8;
                    npc2.velocity.y *= 0.8;
                }
            }
        }
    }

    applySmartMovement(npc) {
        // 应用智能移动限制
        const maxSpeed = 5;
        const speed = Math.sqrt(npc.velocity.x * npc.velocity.x + npc.velocity.y * npc.velocity.y);
        
        // 限制最大速度
        if (speed > maxSpeed) {
            const factor = maxSpeed / speed;
            npc.velocity.x *= factor;
            npc.velocity.y *= factor;
        }

        // 预测下一个位置
        const nextX = npc.x + npc.velocity.x;
        const nextY = npc.y + npc.velocity.y;

        // 检查是否安全
        if (this.isSafePosition(nextX, nextY, npc.radius)) {
            // 如果下一个位置安全，直接移动
            npc.x = nextX;
            npc.y = nextY;
        } else {
            // 如果不安全，尝试分别在X和Y方向移动
            if (this.isSafePosition(nextX, npc.y, npc.radius)) {
                // 只在X方向移动
                npc.x = nextX;
                npc.velocity.y *= 0.5; // 减少Y方向速度
            } else if (this.isSafePosition(npc.x, nextY, npc.radius)) {
                // 只在Y方向移动
                npc.y = nextY;
                npc.velocity.x *= 0.5; // 减少X方向速度
            } else {
                // 如果都不安全，减少速度并尝试找到新的方向
                npc.velocity.x *= -0.5;
                npc.velocity.y *= -0.5;
                
                // 尝试找到一个安全的方向
                this.findSafeDirection(npc);
            }
        }

        // 应用摩擦力
        npc.velocity.x *= npc.friction;
        npc.velocity.y *= npc.friction;

        // 确保NPC在边界内
        npc.x = Math.max(npc.radius, Math.min(npc.x, this.canvas.width - npc.radius));
        npc.y = Math.max(npc.radius, Math.min(npc.y, this.canvas.height - npc.radius));
    }

    findSafeDirection(npc) {
        const checkAngles = 8; // 检查8个方向
        const checkDistance = 30; // 检查距离

        for (let i = 0; i < checkAngles; i++) {
            const angle = (Math.PI * 2 * i) / checkAngles;
            const testX = npc.x + Math.cos(angle) * checkDistance;
            const testY = npc.y + Math.sin(angle) * checkDistance;

            if (this.isSafePosition(testX, testY, npc.radius)) {
                // 找到安全方向，给予一个轻微的推力
                npc.velocity.x += Math.cos(angle) * npc.acceleration;
                npc.velocity.y += Math.sin(angle) * npc.acceleration;
                return;
            }
        }
    }

    findSafePath(npc, target) {
        const points = [];
        const angleStep = Math.PI / 8;
        const checkDistance = 100;

        // 生成周围的点
        for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
            const x = npc.x + Math.cos(angle) * checkDistance;
            const y = npc.y + Math.sin(angle) * checkDistance;
            
            if (this.isSafePosition(x, y, npc.radius) && 
                this.hasLineOfSight({x, y}, target)) {
                points.push({
                    x, y,
                    distance: Math.sqrt(
                        Math.pow(target.x - x, 2) + 
                        Math.pow(target.y - y, 2)
                    )
                });
            }
        }

        // 返回最佳点
        return points.sort((a, b) => a.distance - b.distance)[0];
    }
}

// 在index.html中确保正确初始化游戏
function startLevel(level) {
    document.getElementById('levelSelect').style.display = 'none';
    document.querySelector('.game-container').style.display = 'block';
    document.getElementById('levelObjective').textContent = 
        `目标：击败${level.targetKills}个敌人`;
    
    // 清理之前的游戏实例
    if (window.currentGame) {
        window.currentGame.isRunning = false;
    }
    
    // 创建新游戏实例
    window.currentGame = new Game(level);
} 