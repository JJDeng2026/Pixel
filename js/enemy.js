/**
 * ============================================
 * 像素肉鸽游戏 - 敌人模块
 * 包含：敌人类、敌人生成系统
 * ============================================
 */

class Enemy {
    constructor(type, x, y) {
        const config = CONFIG.ENEMY.TYPES[type] || CONFIG.ENEMY.TYPES.slime;
        
        this.type = type;
        this.x = x;
        this.y = y;
        
        // 属性
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.damage = config.damage;
        this.baseSpeed = config.speed;
        this.speed = config.speed;
        this.size = config.size;
        this.color = config.color;
        this.exp = config.exp;
        this.gold = config.gold;
        
        // 状态
        this.dead = false;
        this.slowEndTime = 0;
        this.lastDamageTime = 0;
        
        // 动画
        this.animOffset = Math.random() * Math.PI * 2;
    }
    
    update(deltaTime) {
        if (this.dead) return;
        
        const player = GameEngine.entities.player;
        if (!player) return;
        
        // 减速效果检测
        if (Date.now() < this.slowEndTime) {
            this.speed = this.baseSpeed * CONFIG.SKILLS.iceShard.slowEffect;
        } else {
            this.speed = this.baseSpeed;
        }
        
        // 追踪玩家
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * deltaTime * 60;
            this.y += (dy / dist) * this.speed * deltaTime * 60;
        }
        
        // 调试模式：一击必杀
        if (CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.INSTANT_KILL) {
            this.health = 0;
            this.die();
        }
    }
    
    takeDamage(amount) {
        // 暴击检测
        const player = GameEngine.entities.player;
        let finalDamage = amount;
        
        if (player && Math.random() < player.tempBonuses.critChance) {
            finalDamage *= player.tempBonuses.critDamage;
            GameEngine.addEffect(new Effect({
                x: this.x,
                y: this.y,
                type: 'damage',
                color: '#ff0000',
                duration: 300,
            }));
        }
        
        this.health -= finalDamage;
        this.lastDamageTime = Date.now();
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    applySlow() {
        this.slowEndTime = Date.now() + CONFIG.SKILLS.iceShard.slowDuration;
    }
    
    die() {
        this.dead = true;
        
        // 掉落经验
        GameEngine.addPickup(new Pickup({
            x: this.x + (Math.random() - 0.5) * 20,
            y: this.y + (Math.random() - 0.5) * 20,
            type: 'exp',
            value: this.exp,
        }));
        
        // 掉落金币
        GameEngine.addPickup(new Pickup({
            x: this.x + (Math.random() - 0.5) * 20,
            y: this.y + (Math.random() - 0.5) * 20,
            type: 'gold',
            value: this.gold,
        }));
        
        // 概率掉落血瓶
        if (Math.random() < 0.1) {
            GameEngine.addPickup(new Pickup({
                x: this.x,
                y: this.y,
                type: 'health',
                value: 20,
            }));
        }
        
        // 死亡特效
        GameEngine.addEffect(new Effect({
            x: this.x,
            y: this.y,
            type: 'explosion',
            color: this.color,
            size: this.size,
            duration: 300,
        }));
        
        // 更新统计
        GameEngine.addKill();
        GameEngine.addScore(this.exp);
    }
    
    render(ctx) {
        // 尝试使用精灵图渲染
        const rendered = Sprites.renderSprite(ctx, this.type, this.x, this.y + floatOffset, this.size, this.size, Math.floor(Date.now() / 250) % 2, 2);
        
        if (!rendered) {
            // 降级：原始渲染方式
            // 受伤闪烁
            const isHurt = Date.now() - this.lastDamageTime < 100;
            const hurtColor = isHurt ? '#ffffff' : this.color;
            
            // 浮动动画
            const floatOffset = Math.sin(Date.now() / 200 + this.animOffset) * 2;
            
            // 敌人身体
            ctx.fillStyle = hurtColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y + floatOffset, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 敌人边框
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制眼睛
            this.renderEyes(ctx, floatOffset);
        }
        
        // 血条（始终显示）
        const healthPercent = this.health / this.maxHealth;
        const barWidth = this.size;
        const barHeight = 4;
        const barY = this.y - this.size / 2 - 8;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.3 ? '#4ade80' : '#ff4444';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        // 减速效果指示
        if (Date.now() < this.slowEndTime) {
            Sprites.renderSkillEffect(ctx, 'ice', this.x, this.y, this.size, Date.now() / 500);
        }
    }
    
    renderEyes(ctx, floatOffset) {
        switch (this.type) {
            case 'slime':
                // 史莱姆大眼睛
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(this.x - 4, this.y - 2 + floatOffset, 5, 0, Math.PI * 2);
                ctx.arc(this.x + 4, this.y - 2 + floatOffset, 5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(this.x - 4, this.y - 2 + floatOffset, 2, 0, Math.PI * 2);
                ctx.arc(this.x + 4, this.y - 2 + floatOffset, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'bat':
                // 蝙蝠小眼睛
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.x - 3, this.y - 2 + floatOffset, 2, 0, Math.PI * 2);
                ctx.arc(this.x + 3, this.y - 2 + floatOffset, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'skeleton':
                // 骷髅眼眶
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(this.x - 5, this.y - 3 + floatOffset, 4, 0, Math.PI * 2);
                ctx.arc(this.x + 5, this.y - 3 + floatOffset, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'boss':
                // BOSS红眼
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.x - 10, this.y - 5 + floatOffset, 8, 0, Math.PI * 2);
                ctx.arc(this.x + 10, this.y - 5 + floatOffset, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(this.x - 10, this.y - 5 + floatOffset, 3, 0, Math.PI * 2);
                ctx.arc(this.x + 10, this.y - 5 + floatOffset, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            default:
                // 默认眼睛
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(this.x - 3, this.y - 2 + floatOffset, 3, 0, Math.PI * 2);
                ctx.arc(this.x + 3, this.y - 2 + floatOffset, 3, 0, Math.PI * 2);
                ctx.fill();
        }
    }
    
    // ========== 敌人生成系统 ==========
    static spawnInterval = null;
    
    static startSpawning() {
        this.stopSpawning();
        
        this.spawnInterval = setInterval(() => {
            if (GameEngine.paused) return;
            this.spawnEnemy();
        }, CONFIG.ENEMY.SPAWN_INTERVAL);
    }
    
    static stopSpawning() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
    }
    
    static spawnEnemy() {
        const player = GameEngine.entities.player;
        if (!player) return;
        
        // 根据当前关卡选择敌人类型
        const levelConfig = CONFIG.LEVELS[Database.saveData.currentLevel];
        const enemyTypes = levelConfig?.enemyTypes || ['slime'];
        
        // 随游戏时间增加难度
        const gameMinutes = GameEngine.gameTime / 60;
        const difficultyMultiplier = 1 + gameMinutes * 0.1;
        
        // 随机选择敌人类型
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        // 在玩家周围随机位置生成
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.ENEMY.SPAWN_RADIUS + Math.random() * 100;
        
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;
        
        // 边界检查
        const mapSize = CONFIG.GAME.MAP_WIDTH * CONFIG.GAME.TILE_SIZE;
        if (x < 50 || x > mapSize - 50 || y < 50 || y > mapSize - 50) return;
        
        const enemy = new Enemy(type, x, y);
        
        // 难度加成
        enemy.maxHealth *= difficultyMultiplier;
        enemy.health = enemy.maxHealth;
        enemy.damage *= difficultyMultiplier;
        
        GameEngine.addEnemy(enemy);
        
        // BOSS每5分钟生成一个
        if (Math.floor(gameMinutes) > 0 && Math.floor(gameMinutes) % 5 === 0 && Math.random() < 0.1) {
            const boss = new Enemy('boss', x, y);
            GameEngine.addEnemy(boss);
        }
    }
}
