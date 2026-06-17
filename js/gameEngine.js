/**
 * ============================================
 * 像素肉鸽游戏 - 游戏引擎核心
 * 包含：游戏循环、渲染、碰撞检测、实体管理
 * ============================================
 */

const GameEngine = {
    canvas: null,
    ctx: null,
    running: false,
    paused: false,
    lastTime: 0,
    deltaTime: 0,
    
    // 游戏状态
    gameTime: 0,
    score: 0,
    killCount: 0,
    
    // 实体列表
    entities: {
        player: null,
        enemies: [],
        projectiles: [],
        effects: [],
        pickups: [],
    },
    
    // 相机
    camera: {
        x: 0,
        y: 0,
    },
    
    // 输入状态
    input: {
        keys: {},
        mouse: { x: 0, y: 0, down: false },
    },
    
    /**
     * 初始化游戏引擎
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 绑定输入事件
        this.bindInputEvents();
        
        console.log('✅ 游戏引擎初始化完成');
    },
    
    /**
     * 调整画布大小（响应式）
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 保持竖屏比例
        const targetRatio = CONFIG.GAME.CANVAS_WIDTH / CONFIG.GAME.CANVAS_HEIGHT;
        let width = containerWidth;
        let height = containerWidth / targetRatio;
        
        if (height > containerHeight) {
            height = containerHeight;
            width = height * targetRatio;
        }
        
        this.canvas.width = CONFIG.GAME.CANVAS_WIDTH;
        this.canvas.height = CONFIG.GAME.CANVAS_HEIGHT;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    },
    
    /**
     * 绑定输入事件
     */
    bindInputEvents() {
        // 键盘事件
        window.addEventListener('keydown', (e) => {
            this.input.keys[e.key.toLowerCase()] = true;
            // 技能快捷键
            if (e.key === '1') Skills.cast(0);
            if (e.key === '2') Skills.cast(1);
            if (e.key === '3') Skills.cast(2);
            if (e.key === '4') Skills.cast(3);
            if (e.key === ' ') Skills.cast(0); // 空格释放第一个技能
            if (e.key === 'Escape') Game.togglePause();
        });
        
        window.addEventListener('keyup', (e) => {
            this.input.keys[e.key.toLowerCase()] = false;
        });
    },
    
    /**
     * 开始游戏
     */
    start() {
        this.running = true;
        this.paused = false;
        this.gameTime = 0;
        this.score = 0;
        this.killCount = 0;
        
        // 清空实体
        this.entities.enemies = [];
        this.entities.projectiles = [];
        this.entities.effects = [];
        this.entities.pickups = [];
        
        // 创建玩家
        this.entities.player = new Player();
        
        // 开始敌人生成
        Enemy.startSpawning();
        
        // 开始游戏循环
        this.lastTime = performance.now();
        this.gameLoop();
    },
    
    /**
     * 游戏主循环
     */
    gameLoop() {
        if (!this.running) return;
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (!this.paused) {
            this.gameTime += this.deltaTime;
            this.update();
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    },
    
    /**
     * 更新游戏状态
     */
    update() {
        // 更新玩家
        if (this.entities.player) {
            this.entities.player.update(this.deltaTime);
        }
        
        // 更新敌人
        for (let i = this.entities.enemies.length - 1; i >= 0; i--) {
            const enemy = this.entities.enemies[i];
            enemy.update(this.deltaTime);
            
            // 移除死亡敌人
            if (enemy.dead) {
                this.entities.enemies.splice(i, 1);
            }
        }
        
        // 更新投射物
        for (let i = this.entities.projectiles.length - 1; i >= 0; i--) {
            const proj = this.entities.projectiles[i];
            proj.update(this.deltaTime);
            
            if (proj.dead) {
                this.entities.projectiles.splice(i, 1);
            }
        }
        
        // 更新特效
        for (let i = this.entities.effects.length - 1; i >= 0; i--) {
            const effect = this.entities.effects[i];
            effect.update(this.deltaTime);
            
            if (effect.dead) {
                this.entities.effects.splice(i, 1);
            }
        }
        
        // 更新拾取物
        for (let i = this.entities.pickups.length - 1; i >= 0; i--) {
            const pickup = this.entities.pickups[i];
            pickup.update(this.deltaTime);
            
            if (pickup.dead) {
                this.entities.pickups.splice(i, 1);
            }
        }
        
        // 更新相机跟随玩家
        this.updateCamera();
        
        // 更新UI
        UI.updateHUD();
    },
    
    /**
     * 更新相机位置
     */
    updateCamera() {
        if (!this.entities.player) return;
        
        const targetX = this.entities.player.x - CONFIG.GAME.CANVAS_WIDTH / 2;
        const targetY = this.entities.player.y - CONFIG.GAME.CANVAS_HEIGHT / 2;
        
        // 平滑跟随
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
    },
    
    /**
     * 渲染游戏
     */
    render() {
        const ctx = this.ctx;
        
        // 清空画布
        ctx.fillStyle = CONFIG.LEVELS[Database.saveData.currentLevel]?.background || '#1a2a1a';
        ctx.fillRect(0, 0, CONFIG.GAME.CANVAS_WIDTH, CONFIG.GAME.CANVAS_HEIGHT);
        
        // 绘制背景网格
        this.drawGrid();
        
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // 渲染拾取物
        this.entities.pickups.forEach(p => p.render(ctx));
        
        // 渲染敌人
        this.entities.enemies.forEach(e => e.render(ctx));
        
        // 渲染玩家
        if (this.entities.player) {
            this.entities.player.render(ctx);
        }
        
        // 渲染投射物
        this.entities.projectiles.forEach(p => p.render(ctx));
        
        // 渲染特效
        this.entities.effects.forEach(e => e.render(ctx));
        
        ctx.restore();
        
        // 调试模式：显示碰撞盒
        if (CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.SHOW_HITBOX) {
            this.drawHitboxes();
        }
    },
    
    /**
     * 绘制背景网格
     */
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        const gridSize = CONFIG.GAME.TILE_SIZE;
        const offsetX = -this.camera.x % gridSize;
        const offsetY = -this.camera.y % gridSize;
        
        for (let x = offsetX; x < CONFIG.GAME.CANVAS_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.GAME.CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        for (let y = offsetY; y < CONFIG.GAME.CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONFIG.GAME.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    },
    
    /**
     * 绘制碰撞盒（调试用）
     */
    drawHitboxes() {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        
        if (this.entities.player) {
            ctx.strokeRect(
                this.entities.player.x - this.entities.player.size / 2,
                this.entities.player.y - this.entities.player.size / 2,
                this.entities.player.size,
                this.entities.player.size
            );
        }
        
        this.entities.enemies.forEach(e => {
            ctx.strokeRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
        });
        
        ctx.restore();
    },
    
    /**
     * 暂停游戏
     */
    pause() {
        this.paused = true;
    },
    
    /**
     * 继续游戏
     */
    resume() {
        this.paused = false;
        this.lastTime = performance.now();
    },
    
    /**
     * 结束游戏
     */
    stop() {
        this.running = false;
        Enemy.stopSpawning();
    },
    
    /**
     * 添加敌人
     */
    addEnemy(enemy) {
        this.entities.enemies.push(enemy);
    },
    
    /**
     * 添加投射物
     */
    addProjectile(proj) {
        this.entities.projectiles.push(proj);
    },
    
    /**
     * 添加特效
     */
    addEffect(effect) {
        this.entities.effects.push(effect);
    },
    
    /**
     * 添加拾取物
     */
    addPickup(pickup) {
        this.entities.pickups.push(pickup);
    },
    
    /**
     * 碰撞检测
     */
    checkCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (a.size + b.size) / 2;
    },
    
    /**
     * 获取范围内敌人
     */
    getEnemiesInRange(x, y, range) {
        return this.entities.enemies.filter(e => {
            const dx = e.x - x;
            const dy = e.y - y;
            return Math.sqrt(dx * dx + dy * dy) <= range;
        });
    },
    
    /**
     * 获取最近敌人
     */
    getNearestEnemy(x, y) {
        let nearest = null;
        let minDist = Infinity;
        
        this.entities.enemies.forEach(e => {
            const dx = e.x - x;
            const dy = e.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = e;
            }
        });
        
        return nearest;
    },
    
    /**
     * 增加积分
     */
    addScore(amount) {
        this.score += amount;
    },
    
    /**
     * 增加击杀数
     */
    addKill() {
        this.killCount++;
    }
};
