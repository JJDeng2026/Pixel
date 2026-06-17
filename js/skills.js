/**
 * ============================================
 * 像素肉鸽游戏 - 技能模块
 * 包含：技能释放、冷却管理、技能效果
 * 扩展预留：新增技能只需在此添加配置和实现
 * ============================================
 */

const Skills = {
    // 已解锁技能列表
    unlocked: ['fireball', 'lightning', 'iceShard', 'shield'],
    
    // 技能冷却（毫秒）
    cooldowns: [0, 0, 0, 0],
    
    /**
     * 初始化技能系统
     */
    init() {
        // 每帧更新冷却
        setInterval(() => {
            this.updateCooldowns(16);
        }, 16);
        
        console.log('✅ 技能系统初始化完成');
    },
    
    /**
     * 更新技能冷却
     */
    updateCooldowns(delta) {
        for (let i = 0; i < this.cooldowns.length; i++) {
            if (this.cooldowns[i] > 0) {
                this.cooldowns[i] = Math.max(0, this.cooldowns[i] - delta);
            }
        }
        Controls.updateSkillCooldowns();
    },
    
    /**
     * 释放技能
     * @param {number} index 技能槽位 (0-3)
     */
    cast(index) {
        if (GameEngine.paused) return;
        if (!GameEngine.entities.player) return;
        if (GameEngine.entities.player.dead) return;
        
        // 调试模式：无冷却
        if (CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.UNLIMITED_SKILLS) {
            this.cooldowns[index] = 0;
        }
        
        if (this.cooldowns[index] > 0) return;
        
        const skillId = this.unlocked[index];
        if (!skillId) return;
        
        const player = GameEngine.entities.player;
        const skillConfig = CONFIG.SKILLS[skillId];
        if (!skillConfig) return;
        
        // 执行技能
        this.executeSkill(skillId, player);
        
        // 设置冷却
        this.cooldowns[index] = skillConfig.cooldown;
    },
    
    /**
     * 执行具体技能
     * 扩展预留：新增技能只需在此添加case分支
     */
    executeSkill(skillId, player) {
        const nearest = GameEngine.getNearestEnemy(player.x, player.y);
        
        switch (skillId) {
            case 'fireball':
                this.castFireball(player, nearest);
                break;
                
            case 'lightning':
                this.castLightning(player);
                break;
                
            case 'iceShard':
                this.castIceShard(player, nearest);
                break;
                
            case 'shield':
                this.castShield(player);
                break;
                
            case 'spinAttack':
                this.castSpinAttack(player);
                break;
                
            case 'heal':
                this.castHeal(player);
                break;
                
            // ========== 扩展预留：新增技能模板 ==========
            // case 'newSkill':
            //     this.castNewSkill(player);
            //     break;
        }
    },
    
    /**
     * 火球术 - 发射高伤害火球
     */
    castFireball(player, target) {
        if (!target) return;
        
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const skill = CONFIG.SKILLS.fireball;
        
        const proj = new Projectile({
            x: player.x,
            y: player.y,
            vx: (dx / dist) * skill.speed,
            vy: (dy / dist) * skill.speed,
            damage: skill.damage + player.getTotalDamage() * 0.5,
            size: skill.size,
            color: skill.color,
            isPlayer: true,
            pierce: skill.pierce,
        });
        
        proj.useSprite = 'fireball';
        GameEngine.addProjectile(proj);
        
        // 施法特效
        GameEngine.addEffect(new Effect({
            x: player.x,
            y: player.y,
            type: 'sprite',
            spriteName: 'fireball',
            size: 30,
            duration: 300,
        }));
    },
    
    /**
     * 闪电链 - 连锁伤害多个敌人
     */
    castLightning(player) {
        const skill = CONFIG.SKILLS.lightning;
        const enemies = GameEngine.getEnemiesInRange(player.x, player.y, skill.range);
        
        let chainCount = 0;
        let lastTarget = player;
        
        enemies.forEach(enemy => {
            if (chainCount >= skill.chainCount) return;
            
            // 闪电特效（绘制连线）
            GameEngine.addEffect(new Effect({
                x: (lastTarget.x + enemy.x) / 2,
                y: (lastTarget.y + enemy.y) / 2,
                type: 'explosion',
                color: skill.color,
                size: 15,
                duration: 300,
            }));
            
            enemy.takeDamage(skill.damage + player.getTotalDamage() * 0.3);
            lastTarget = enemy;
            chainCount++;
        });
    },
    
    /**
     * 冰锥术 - 发射冰锥并减速敌人
     */
    castIceShard(player, target) {
        if (!target) return;
        
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const skill = CONFIG.SKILLS.iceShard;
        
        const proj = new Projectile({
            x: player.x,
            y: player.y,
            vx: (dx / dist) * skill.speed,
            vy: (dy / dist) * skill.speed,
            damage: skill.damage + player.getTotalDamage() * 0.3,
            size: skill.size,
            color: skill.color,
            isPlayer: true,
            pierce: 3,
        });
        
        // 冰锥命中时附加减速
        proj.onHit = (enemy) => {
            enemy.applySlow();
        };
        
        GameEngine.addProjectile(proj);
    },
    
    /**
     * 护盾 - 减伤护盾
     */
    castShield(player) {
        const skill = CONFIG.SKILLS.shield;
        player.shieldActive = true;
        player.shieldEndTime = Date.now() + skill.duration;
        
        // 护盾激活特效
        GameEngine.addEffect(new Effect({
            x: player.x,
            y: player.y,
            type: 'explosion',
            color: skill.color,
            size: 50,
            duration: 500,
        }));
    },
    
    /**
     * 旋风斩 - 范围AOE伤害
     */
    castSpinAttack(player) {
        const skill = CONFIG.SKILLS.spinAttack;
        const enemies = GameEngine.getEnemiesInRange(player.x, player.y, skill.radius);
        
        enemies.forEach(enemy => {
            enemy.takeDamage(skill.damage + player.getTotalDamage() * 0.8);
        });
        
        // 旋风特效
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            GameEngine.addEffect(new Effect({
                x: player.x + Math.cos(angle) * skill.radius * 0.5,
                y: player.y + Math.sin(angle) * skill.radius * 0.5,
                type: 'explosion',
                color: skill.color,
                size: 20,
                duration: skill.duration,
            }));
        }
    },
    
    /**
     * 治疗术 - 恢复生命
     */
    castHeal(player) {
        const skill = CONFIG.SKILLS.heal;
        player.heal(skill.healAmount);
        
        // 治疗特效
        GameEngine.addEffect(new Effect({
            x: player.x,
            y: player.y,
            type: 'heal',
            color: skill.color,
            duration: 800,
        }));
    },
    
    // ========== 扩展预留：新增技能模板 ==========
    // castNewSkill(player) {
    //     // 技能实现代码
    // },
    
    /**
     * 获取升级选项列表
     * 扩展预留：新增升级选项只需在此添加
     */
    getUpgradeOptions() {
        const allOptions = [
            { type: 'maxHealth', name: '生命强化', description: '+20 最大生命值', value: 20, icon: '❤️' },
            { type: 'maxHealth', name: '生命强化+', description: '+30 最大生命值', value: 30, icon: '❤️' },
            { type: 'damage', name: '攻击强化', description: '+5 伤害', value: 5, icon: '⚔️' },
            { type: 'damage', name: '攻击强化+', description: '+8 伤害', value: 8, icon: '⚔️' },
            { type: 'speed', name: '速度提升', description: '+0.2 移动速度', value: 0.2, icon: '👟' },
            { type: 'attackSpeed', name: '攻速提升', description: '+0.15 攻击速度', value: 0.15, icon: '⚡' },
            { type: 'critChance', name: '暴击精通', description: '+5% 暴击率', value: 0.05, icon: '💥' },
            { type: 'critDamage', name: '暴击伤害', description: '+0.2 暴击伤害', value: 0.2, icon: '🔥' },
            { type: 'heal', name: '即时治疗', description: '恢复30%最大生命', value: 0.3, icon: '💚' },
            { type: 'heal', name: '大量治疗', description: '恢复50%最大生命', value: 0.5, icon: '💚' },
        ];
        
        // 随机选择3个不同的选项
        const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, CONFIG.LEVELUP.OPTIONS_COUNT);
    }
};
