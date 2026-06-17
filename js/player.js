/**
 * ============================================
 * 像素肉鸽游戏 - 玩家模块
 * 包含：玩家属性、移动、升级系统、战斗
 * ============================================
 */

class Player {
    constructor() {
        // 位置
        this.x = CONFIG.GAME.MAP_WIDTH * CONFIG.GAME.TILE_SIZE / 2;
        this.y = CONFIG.GAME.MAP_HEIGHT * CONFIG.GAME.TILE_SIZE / 2;
        
        // 基础属性（结合永久升级）
        const permUpgrades = Database.saveData.permanentUpgrades;
        
        this.maxHealth = CONFIG.PLAYER.BASE_HEALTH + permUpgrades.maxHealth * 10;
        this.health = this.maxHealth;
        this.speed = CONFIG.PLAYER.BASE_SPEED + permUpgrades.speed * 0.15;
        this.damage = CONFIG.PLAYER.BASE_DAMAGE + permUpgrades.damage * 3;
        this.attackSpeed = CONFIG.PLAYER.BASE_ATTACK_SPEED + permUpgrades.attackSpeed * 0.1;
        
        // 对局内临时属性升级
        this.tempBonuses = {
            maxHealth: 0,
            damage: 0,
            speed: 0,
            attackSpeed: 0,
            critChance: CONFIG.PLAYER.BASE_CRIT_CHANCE,
            critDamage: CONFIG.PLAYER.BASE_CRIT_DAMAGE,
        };
        
        // 等级系统
        this.level = 1;
        this.exp = 0;
        this.expToNext = CONFIG.LEVELUP.BASE_EXP;
        
        // 外观
        this.size = CONFIG.PLAYER.SIZE;
        this.color = CONFIG.SKINS[Database.saveData.currentSkin]?.color || CONFIG.PLAYER.COLOR;
        
        // 状态
        this.dead = false;
        this.shieldActive = false;
        this.shieldEndTime = 0;
        this.invincible = false;
        
        // 自动攻击
        this.lastAttackTime = 0;
    }
    
    /**
     * 更新玩家
     */
    update(deltaTime) {
        if (this.dead) return;
        
        // 移动
        const movement = Controls.getMovement();
        this.x += movement.x * this.getTotalSpeed() * deltaTime * 60;
        this.y += movement.y * this.getTotalSpeed() * deltaTime * 60;
        
        // 边界限制
        this.x = Math.max(this.size, Math.min(CONFIG.GAME.MAP_WIDTH * CONFIG.GAME.TILE_SIZE - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CONFIG.GAME.MAP_HEIGHT * CONFIG.GAME.TILE_SIZE - this.size, this.y));
        
        // 护盾检测
        if (this.shieldActive && Date.now() > this.shieldEndTime) {
            this.shieldActive = false;
        }
        
        // 自动攻击最近敌人
        this.autoAttack();
        
        // 碰撞检测（敌人）
        this.checkEnemyCollision();
        
        // 调试模式：无敌
        if (CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.INVINCIBLE) {
            this.health = this.getTotalMaxHealth();
            this.invincible = true;
        }
    }
    
    /**
     * 自动攻击
     */
    autoAttack() {
        const now = Date.now();
        const attackInterval = 1000 / this.getTotalAttackSpeed();
        
        if (now - this.lastAttackTime < attackInterval) return;
        
        const nearest = GameEngine.getNearestEnemy(this.x, this.y);
        if (!nearest) return;
        
        // 发射普通攻击投射物
        const dx = nearest.x - this.x;
        const dy = nearest.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        GameEngine.addProjectile(new Projectile({
            x: this.x,
            y: this.y,
            vx: (dx / dist) * 8,
            vy: (dy / dist) * 8,
            damage: this.getTotalDamage(),
            size: 8,
            color: '#ffd700',
            isPlayer: true,
        }));
        
        this.lastAttackTime = now;
    }
    
    /**
     * 检测与敌人碰撞
     */
    checkEnemyCollision() {
        GameEngine.entities.enemies.forEach(enemy => {
            if (GameEngine.checkCollision(this, enemy)) {
                this.takeDamage(enemy.damage);
            }
        });
    }
    
    /**
     * 受到伤害
     */
    takeDamage(amount) {
        if (this.invincible) return;
        
        let finalDamage = amount;
        
        // 护盾减伤
        if (this.shieldActive) {
            finalDamage *= (1 - CONFIG.SKILLS.shield.damageReduction);
        }
        
        this.health -= finalDamage;
        
        // 受伤特效
        GameEngine.addEffect(new Effect({
            x: this.x,
            y: this.y,
            type: 'damage',
            color: '#ff4444',
            duration: 300,
        }));
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    /**
     * 治疗
     */
    heal(amount) {
        this.health = Math.min(this.getTotalMaxHealth(), this.health + amount);
        
        // 治疗特效
        GameEngine.addEffect(new Effect({
            x: this.x,
            y: this.y,
            type: 'heal',
            color: '#4ade80',
            duration: 500,
        }));
    }
    
    /**
     * 死亡
     */
    die() {
        this.dead = true;
        Game.gameOver();
    }
    
    /**
     * 获得经验
     */
    gainExp(amount) {
        this.exp += amount;
        
        while (this.exp >= this.expToNext && this.level < CONFIG.LEVELUP.MAX_LEVEL) {
            this.exp -= this.expToNext;
            this.levelUp();
        }
    }
    
    /**
     * 升级
     */
    levelUp() {
        this.level++;
        this.expToNext = Math.floor(CONFIG.LEVELUP.BASE_EXP * Math.pow(CONFIG.LEVELUP.EXP_MULTIPLIER, this.level - 1));
        
        // 显示升级选择界面
        UI.showLevelUpOptions();
    }
    
    /**
     * 应用升级选项
     */
    applyUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'maxHealth':
                this.tempBonuses.maxHealth += upgrade.value;
                this.health += upgrade.value;
                break;
            case 'damage':
                this.tempBonuses.damage += upgrade.value;
                break;
            case 'speed':
                this.tempBonuses.speed += upgrade.value;
                break;
            case 'attackSpeed':
                this.tempBonuses.attackSpeed += upgrade.value;
                break;
            case 'critChance':
                this.tempBonuses.critChance += upgrade.value;
                break;
            case 'critDamage':
                this.tempBonuses.critDamage += upgrade.value;
                break;
            case 'heal':
                this.heal(this.getTotalMaxHealth() * upgrade.value);
                break;
        }
    }
    
    /**
     * 获取总最大生命值
     */
    getTotalMaxHealth() {
        return this.maxHealth + this.tempBonuses.maxHealth;
    }
    
    /**
     * 获取总伤害
     */
    getTotalDamage() {
        // 加上武器加成
        const weapon = CONFIG.WEAPONS[Database.saveData.currentWeapon];
        const weaponDamage = weapon ? weapon.damage : 0;
        return this.damage + this.tempBonuses.damage + weaponDamage;
    }
    
    /**
     * 获取总速度
     */
    getTotalSpeed() {
        return this.speed + this.tempBonuses.speed;
    }
    
    /**
     * 获取总攻速
     */
    getTotalAttackSpeed() {
        const weapon = CONFIG.WEAPONS[Database.saveData.currentWeapon];
        const weaponAS = weapon ? weapon.attackSpeed : 0;
        return this.attackSpeed + this.tempBonuses.attackSpeed + weaponAS;
    }
    
    /**
     * 渲染玩家
     */
    render(ctx) {
        // 尝试使用精灵图渲染
        if (!Sprites.renderSprite(ctx, 'player', this.x, this.y, this.size, this.size, Math.floor(Date.now() / 200) % 4, 4)) {
            // 降级：原始渲染方式
            // 护盾效果
            if (this.shieldActive) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI * 2);
                ctx.strokeStyle = CONFIG.SKILLS.shield.color;
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            
            // 玩家身体
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 玩家边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 眼睛
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y - 3, 4, 0, Math.PI * 2);
            ctx.arc(this.x + 5, this.y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y - 3, 2, 0, Math.PI * 2);
            ctx.arc(this.x + 5, this.y - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 护盾效果（始终渲染）
        if (this.shieldActive) {
            Sprites.renderSkillEffect(ctx, 'shield', this.x, this.y, this.size + 20, Date.now() / 1000);
        }
    }
}

/**
 * 投射物类
 */
class Projectile {
    constructor(options) {
        this.x = options.x;
        this.y = options.y;
        this.vx = options.vx;
        this.vy = options.vy;
        this.damage = options.damage;
        this.size = options.size;
        this.color = options.color;
        this.isPlayer = options.isPlayer !== false;
        this.pierce = options.pierce || 1;
        this.hitEnemies = [];
        this.dead = false;
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        
        // 超出地图
        if (this.x < 0 || this.x > CONFIG.GAME.MAP_WIDTH * CONFIG.GAME.TILE_SIZE ||
            this.y < 0 || this.y > CONFIG.GAME.MAP_HEIGHT * CONFIG.GAME.TILE_SIZE) {
            this.dead = true;
            return;
        }
        
        // 碰撞检测
        if (this.isPlayer) {
            GameEngine.entities.enemies.forEach(enemy => {
                if (this.hitEnemies.includes(enemy)) return;
                if (GameEngine.checkCollision(this, enemy)) {
                    enemy.takeDamage(this.damage);
                    this.hitEnemies.push(enemy);
                    this.pierce--;
                    if (this.pierce <= 0) {
                        this.dead = true;
                    }
                }
            });
        }
    }
    
    render(ctx) {
        // 尝试使用精灵图渲染
        if (this.useSprite && Sprites.renderSkillEffect(ctx, this.useSprite, this.x, this.y, this.size, Date.now() / 500)) {
            return;
        }
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 发光效果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * 特效类
 */
class Effect {
    constructor(options) {
        this.x = options.x;
        this.y = options.y;
        this.type = options.type;
        this.color = options.color;
        this.duration = options.duration;
        this.startTime = Date.now();
        this.dead = false;
        this.size = options.size || 30;
    }
    
    update(deltaTime) {
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= this.duration) {
            this.dead = true;
        }
    }
    
    render(ctx) {
        const elapsed = Date.now() - this.startTime;
        const progress = elapsed / this.duration;
        const alpha = 1 - progress;
        
        ctx.globalAlpha = alpha;
        
        if (this.type === 'sprite' && this.spriteName) {
            Sprites.renderSkillEffect(ctx, this.spriteName, this.x, this.y, this.size * (1 + progress * 0.5), progress);
            ctx.globalAlpha = 1;
            return;
        }
        
        switch (this.type) {
            case 'damage':
                ctx.fillStyle = this.color;
                ctx.font = 'bold 16px Arial';
                ctx.fillText('💥', this.x - 10, this.y - 20 - progress * 30);
                break;
                
            case 'heal':
                ctx.fillStyle = this.color;
                ctx.font = 'bold 16px Arial';
                ctx.fillText('+❤️', this.x - 15, this.y - 20 - progress * 30);
                break;
                
            case 'explosion':
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * (0.5 + progress * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                break;
                
            case 'levelup':
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 24px Arial';
                ctx.fillText('⬆️', this.x - 15, this.y - 30 - progress * 50);
                break;
        }
        
        ctx.globalAlpha = 1;
    }
}

/**
 * 拾取物类
 */
class Pickup {
    constructor(options) {
        this.x = options.x;
        this.y = options.y;
        this.type = options.type; // 'exp', 'gold', 'health'
        this.value = options.value;
        this.size = 16;
        this.dead = false;
        this.lifetime = 30000; // 30秒后消失
        this.spawnTime = Date.now();
    }
    
    update(deltaTime) {
        // 超时消失
        if (Date.now() - this.spawnTime > this.lifetime) {
            this.dead = true;
            return;
        }
        
        // 被玩家拾取
        const player = GameEngine.entities.player;
        if (player && GameEngine.checkCollision(this, player)) {
            this.pickup();
        }
    }
    
    pickup() {
        const player = GameEngine.entities.player;
        
        switch (this.type) {
            case 'exp':
                player.gainExp(this.value);
                break;
            case 'gold':
                // 金币在游戏结束时结算
                GameEngine.addScore(this.value);
                break;
            case 'health':
                player.heal(this.value);
                break;
        }
        
        this.dead = true;
    }
    
    render(ctx) {
        const colors = {
            exp: '#4ade80',
            gold: '#ffd700',
            health: '#ff6b6b',
        };
        
        const icons = {
            exp: '⭐',
            gold: '💰',
            health: '❤️',
        };
        
        // 浮动动画
        const floatOffset = Math.sin(Date.now() / 200) * 3;
        
        ctx.font = '14px Arial';
        ctx.fillText(icons[this.type], this.x - 7, this.y + 5 + floatOffset);
    }
}
