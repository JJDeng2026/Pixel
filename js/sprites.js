/**
 * ============================================
 * 像素肉鸽游戏 - 精灵动画系统
 * 处理：精灵图加载、帧动画、特效渲染
 * ============================================
 */

const Sprites = {
    // 精灵图缓存
    images: {},
    loaded: false,
    
    // 精灵图路径配置
    spritePaths: {
        // 角色
        player: 'assets/images/characters/player_sprite.png',
        // 敌人
        slime: 'assets/images/enemies/slime_sprite.png',
        skeleton: 'assets/images/enemies/skeleton_sprite.png',
        bat: 'assets/images/enemies/bat_sprite.png',
        // 技能特效
        fireball: 'assets/images/effects/fireball_effect.png',
        lightning: 'assets/images/effects/lightning_effect.png',
        ice: 'assets/images/effects/ice_effect.png',
        shield: 'assets/images/effects/shield_effect.png',
        spin: 'assets/images/effects/spin_effect.png',
        heal: 'assets/images/effects/heal_effect.png',
    },
    
    /**
     * 预加载所有精灵图
     */
    async loadAll() {
        console.log('📦 加载精灵素材...');
        
        const promises = Object.entries(this.spritePaths).map(([name, path]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.images[name] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`⚠️ 精灵加载失败: ${name}, 使用默认渲染`);
                    resolve();
                };
                img.src = path;
            });
        });
        
        await Promise.all(promises);
        this.loaded = true;
        console.log('✅ 精灵素材加载完成');
    },
    
    /**
     * 获取精灵图
     */
    get(name) {
        return this.images[name];
    },
    
    /**
     * 渲染精灵动画帧
     */
    renderSprite(ctx, spriteName, x, y, width, height, frame = 0, totalFrames = 1) {
        const img = this.images[spriteName];
        if (!img) return false;
        
        const frameWidth = img.width / totalFrames;
        const frameX = (frame % totalFrames) * frameWidth;
        
        ctx.drawImage(
            img,
            frameX, 0, frameWidth, img.height,
            x - width / 2, y - height / 2, width, height
        );
        
        return true;
    },
    
    /**
     * 渲染技能特效
     */
    renderSkillEffect(ctx, skillName, x, y, size, progress = 0) {
        const img = this.images[skillName];
        if (!img) return false;
        
        ctx.save();
        ctx.globalAlpha = 1 - progress * 0.5;
        ctx.translate(x, y);
        ctx.rotate(progress * Math.PI * 2);
        
        ctx.drawImage(
            img,
            -size / 2, -size / 2, size, size
        );
        
        ctx.restore();
        return true;
    }
};

/**
 * 动画精灵基类
 */
class AnimatedSprite {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.spriteName = options.spriteName;
        this.width = options.width || 32;
        this.height = options.height || 32;
        this.frameCount = options.frameCount || 4;
        this.frameDuration = options.frameDuration || 200;
        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.playing = true;
    }
    
    update(deltaTime) {
        if (!this.playing) return;
        
        const now = Date.now();
        if (now - this.lastFrameTime > this.frameDuration) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.lastFrameTime = now;
        }
    }
    
    render(ctx) {
        Sprites.renderSprite(
            ctx,
            this.spriteName,
            this.x, this.y,
            this.width, this.height,
            this.currentFrame,
            this.frameCount
        );
    }
}
