/**
 * 王国守卫 - 塔防引擎 v5.0
 * 竖版固定塔防 | 20波 | 20级英雄 | 关卡选择 | 技能系统
 */
(function(){
'use strict';

// ==================== 绿幕抠图 ====================
const ChromaKey = {
    cache: {},
    process(img, key) {
        if (this.cache[key]) return this.cache[key];
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const pixels = data.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            if (g > 80 && g > r * 1.3 && g > b * 1.1) {
                const greenness = Math.min(1, (g - Math.max(r, b)) / 100);
                pixels[i + 3] = Math.round(255 * (1 - greenness));
            }
        }
        ctx.putImageData(data, 0, 0);
        this.cache[key] = c;
        return c;
    },
    clear() { this.cache = {}; }
};

// ==================== 资源路径 ====================
const IMG = {
    bg:       'assets/images/td_bg.jpg',
    hero:      'assets/images/td_hero.jpg',
    enemySlime:    'assets/images/td_enemy_slime.jpg',
    enemySkeleton: 'assets/images/td_enemy_skeleton.jpg',
    enemyDemon:    'assets/images/td_enemy_demon.jpg',
    enemyBoss:     'assets/images/td_enemy_boss.jpg',
    bullet:   'assets/images/td_bullet.jpg',
    skillFire:'assets/images/td_skill_fire.jpg',
    skillIce: 'assets/images/td_skill_ice.jpg',
};

// ==================== 配置 ====================
const CFG = {
    MAX_LEVEL: 20,
    MAX_WAVES: 20,
    STAGES: [
        { id:1, name:'草原', unlocked:true,  enemyHpMul:1.0, enemySpdMul:1.0, goldMul:1.0, bgColor:'#2d5a1e' },
        { id:2, name:'沙漠', unlocked:true,  enemyHpMul:1.3, enemySpdMul:1.15, goldMul:1.2, bgColor:'#c4a43e' },
        { id:3, name:'森林', unlocked:true,  enemyHpMul:1.6, enemySpdMul:1.0, goldMul:1.4, bgColor:'#1a4a2a' },
        { id:4, name:'城堡', unlocked:true,  enemyHpMul:2.0, enemySpdMul:1.25, goldMul:1.6, bgColor:'#4a3a5a' },
        { id:5, name:'火山', unlocked:true,  enemyHpMul:2.5, enemySpdMul:1.35, goldMul:1.8, bgColor:'#5a1a1a' },
    ],
    ENEMY_TYPES: {
        slime:    { name:'史莱姆', hp:25,  dmg:5,  spd:1.0, size:24, xp:10,  gold:2,  color:'#44cc44' },
        skeleton: { name:'骷髅兵', hp:60,  dmg:10, spd:0.8, size:28, xp:22,  gold:5,  color:'#cccccc' },
        demon:    { name:'恶魔',   hp:130, dmg:20, spd:1.3, size:32, xp:50,  gold:12, color:'#cc4444' },
        boss:     { name:'巨龙',   hp:500, dmg:35, spd:0.5, size:48, xp:250, gold:50, color:'#8844cc' },
    },
    SKILLS: {
        fire: { name:'火球术', desc:'全屏随机火球坠落', cooldown:18, icon:IMG.skillFire, fireballs:8, damage:40 },
        ice:  { name:'冰霜剑', desc:'扩散冰剑扇形攻击', cooldown:15, icon:IMG.skillIce, swords:5, damage:30 },
    },
    HERO: {
        baseHp: 120, baseAtk: 20, baseAtkSpd: 2.5, baseSpd: 4.0,
        bulletSpeed: 8, bulletSize: 8, bulletPierce: 1,
    },
    XP_BASE: 20, XP_GROW: 1.28,
    PERM_UPGRADES: {
        hp:     { name:'生命强化', desc:'+15 最大生命', baseCost:60,  costMul:1.4, maxLv:15 },
        atk:    { name:'攻击强化', desc:'+3 基础攻击',  baseCost:80,  costMul:1.4, maxLv:15 },
        atkSpd: { name:'攻速强化', desc:'+10% 攻击速度',baseCost:70,  costMul:1.4, maxLv:12 },
        spd:    { name:'速度强化', desc:'+0.3 移动速度',baseCost:70,  costMul:1.4, maxLv:10 },
        skill:  { name:'技能强化', desc:'+8% 技能伤害', baseCost:100, costMul:1.5, maxLv:10 },
        gold:   { name:'金币加成', desc:'+10% 金币获取',baseCost:90,  costMul:1.3, maxLv:10 },
    },
    LEVEL_OPTIONS: [
        { id:'hp',      name:'生命强化',  desc:'+20 最大生命',   weight:12 },
        { id:'atk',     name:'攻击强化',  desc:'+4 基础攻击',     weight:12 },
        { id:'atkSpd',  name:'攻速提升',  desc:'+15% 攻击速度',   weight:10 },
        { id:'spd',     name:'速度提升',  desc:'+0.5 移动速度',   weight:8 },
        { id:'bullet',  name:'弹幕强化',  desc:'+1 子弹穿透',     weight:10 },
        { id:'multi',   name:'多重射击',  desc:'+1 额外子弹',     weight:8 },
        { id:'heal',    name:'即时治疗',  desc:'恢复50%生命',     weight:8 },
        { id:'skillDmg',name:'技能威力',  desc:'+20% 技能伤害',   weight:8 },
        { id:'skillCd', name:'技能冷却',  desc:'-2秒 技能冷却',  weight:8 },
    ],
};

// ==================== 图片加载 ====================
const Assets = {
    loaded: {}, total: 0, count: 0,
    loadAll() {
        const urls = [
            {key:'bg', url:IMG.bg},
            {key:'hero', url:IMG.hero},
            {key:'enemySlime', url:IMG.enemySlime},
            {key:'enemySkeleton', url:IMG.enemySkeleton},
            {key:'enemyDemon', url:IMG.enemyDemon},
            {key:'enemyBoss', url:IMG.enemyBoss},
            {key:'bullet', url:IMG.bullet},
            {key:'skillFire', url:IMG.skillFire},
            {key:'skillIce', url:IMG.skillIce},
        ];
        this.total = urls.length;
        return Promise.all(urls.map(item=>this.loadImage(item.key, item.url)));
    },
    loadImage(key, url) {
        return new Promise((resolve)=>{
            const img = new Image();
            img.onload = ()=>{
                this.loaded[key]=img;
                if (key !== 'bg') ChromaKey.process(img, key);
                this.count++;
                resolve();
            };
            img.onerror = ()=>{ this.count++; resolve(); };
            img.src = url;
        });
    },
    getRaw(key) { return this.loaded[key]||null; },
    getSprite(key) {
        const img = this.loaded[key];
        if (!img) return null;
        return ChromaKey.process(img, key);
    },
    progress() { return this.total>0?this.count/this.total:0; },
};

// ==================== 存档 ====================
const DB = {
    key: 'kingdom_defense_save',
    data: null,
    defaults: {
        gold: 0, highWave: 0, totalKills: 0,
        permUpgrades: { hp:0, atk:0, atkSpd:0, spd:0, skill:0, gold:0 },
        unlockedStages: [1],
    },
    init() {
        try {
            const raw = localStorage.getItem(this.key);
            this.data = raw ? Object.assign({}, this.defaults, JSON.parse(raw)) : Object.assign({}, this.defaults);
            if (!this.data.permUpgrades) this.data.permUpgrades = Object.assign({}, this.defaults.permUpgrades);
            if (!this.data.unlockedStages || this.data.unlockedStages.length===0) this.data.unlockedStages = [1];
            this.save();
        } catch(e) { this.data = Object.assign({}, this.defaults); }
    },
    save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch(e) {} },
    getGold() { return this.data.gold; },
    addGold(n) { this.data.gold += n; this.save(); },
    spendGold(n) { if(this.data.gold >= n) { this.data.gold -= n; this.save(); return true; } return false; },
    getPermLv(key) { return this.data.permUpgrades[key] || 0; },
    upgradePerm(key) {
        const cfg = CFG.PERM_UPGRADES[key];
        const lv = this.getPermLv(key);
        if(lv >= cfg.maxLv) return false;
        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costMul, lv));
        if(this.spendGold(cost)) { this.data.permUpgrades[key] = lv + 1; this.save(); return true; }
        return false;
    },
    getPermCost(key) {
        const cfg = CFG.PERM_UPGRADES[key];
        const lv = this.getPermLv(key);
        return Math.floor(cfg.baseCost * Math.pow(cfg.costMul, lv));
    },
    unlockStage(id) {
        if (!this.data.unlockedStages.includes(id)) {
            this.data.unlockedStages.push(id);
            this.save();
        }
    },
    resetAll() { this.data = Object.assign({}, this.defaults); this.save(); },
    maxAll() {
        for(let k in CFG.PERM_UPGRADES) this.data.permUpgrades[k] = CFG.PERM_UPGRADES[k].maxLv;
        this.data.unlockedStages = [1,2,3,4,5];
        this.save();
    },
};

// ==================== 工具 ====================
function rand(min,max) { return Math.random()*(max-min)+min; }
function randInt(min,max) { return Math.floor(rand(min,max+1)); }
function clamp(v,min,max) { return Math.max(min,Math.min(max,v)); }
function dist(a,b) { const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }

// ==================== 粒子 ====================
class Particle {
    constructor(x,y,opts={}) {
        this.x=x; this.y=y; this.vx=opts.vx||rand(-1,1); this.vy=opts.vy||rand(-1,1);
        this.life=opts.life||0.5; this.maxLife=this.life; this.color=opts.color||'#fff';
        this.size=opts.size||3; this.dead=false;
    }
    update(dt) {
        this.x+=this.vx*60*dt; this.y+=this.vy*60*dt;
        this.life-=dt; if(this.life<=0) this.dead=true;
    }
    draw(ctx) {
        const a=this.life/this.maxLife;
        ctx.globalAlpha=a; ctx.fillStyle=this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size*a, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
    }
}

// ==================== 子弹 ====================
class Bullet {
    constructor(x,y,damage,pierce) {
        this.x=x; this.y=y; this.damage=damage; this.pierce=pierce;
        this.speed=CFG.HERO.bulletSpeed; this.size=CFG.HERO.bulletSize;
        this.vx=0; this.dead=false; this.hit=new Set();
        this.sprite=Assets.getSprite('bullet');
    }
    update(dt) {
        this.x+=this.vx*60*dt;
        this.y-=this.speed*60*dt;
        if(this.y<-20) this.dead=true;
    }
    draw(ctx) {
        if (this.sprite) {
            ctx.drawImage(this.sprite, this.x-this.size, this.y-this.size, this.size*2, this.size*2);
        } else {
            ctx.fillStyle='#ffcc00'; ctx.shadowColor='#ffcc00'; ctx.shadowBlur=6;
            ctx.beginPath(); ctx.arc(this.x,this.y,this.size/2,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0;
        }
    }
}

// ==================== 敌人 ====================
class Enemy {
    constructor(type, x, y, stageCfg) {
        const cfg = CFG.ENEMY_TYPES[type];
        this.type=type; this.x=x; this.y=y; this.name=cfg.name;
        this.maxHp=Math.floor(cfg.hp * stageCfg.enemyHpMul);
        this.hp=this.maxHp;
        this.damage=cfg.dmg; this.spd=cfg.spd * stageCfg.enemySpdMul;
        this.size=cfg.size; this.color=cfg.color;
        this.xp=cfg.xp; this.gold=Math.floor(cfg.gold * stageCfg.goldMul);
        this.dead=false; this.hitFlash=0;
        this.wobble=rand(0,Math.PI*2);
        let spriteKey='enemySlime';
        if(type==='skeleton') spriteKey='enemySkeleton';
        else if(type==='demon') spriteKey='enemyDemon';
        else if(type==='boss') spriteKey='enemyBoss';
        this.sprite=Assets.getSprite(spriteKey);
    }
    update(dt) {
        this.y+=this.spd*60*dt;
        this.x+=Math.sin(this.y/50+this.wobble)*0.5;
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        if(this.y>window._game.gameH+60) this.dead=true;
    }
    takeDamage(dmg, game) {
        this.hp-=dmg; this.hitFlash=0.08;
        if(this.hp<=0) { this.die(game); return true; }
        return false;
    }
    die(game) {
        this.dead=true; game.kills++; game.goldEarned+=this.gold;
        game.score+=this.xp;
        for(let i=0;i<8;i++) {
            game.particles.push(new Particle(this.x,this.y,{
                vx:rand(-2,2), vy:rand(-2,1), color:this.color, life:0.4, size:rand(2,4)
            }));
        }
        game.addXP(this.xp);
    }
    draw(ctx) {
        const drawSize=this.size*2;
        if (this.sprite) {
            ctx.save();
            if(this.hitFlash>0) ctx.globalAlpha=0.5;
            const asp=this.sprite.width/this.sprite.height;
            let dw=drawSize, dh=drawSize;
            if(asp>1) dh=drawSize/asp; else dw=drawSize*asp;
            ctx.drawImage(this.sprite, this.x-dw/2, this.y-dh/2, dw, dh);
            ctx.restore();
        } else {
            ctx.fillStyle=this.hitFlash>0?'#fff':this.color;
            ctx.beginPath(); ctx.arc(this.x,this.y,this.size/2,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.stroke();
        }
        // 血条
        const hpR=this.hp/this.maxHp;
        const bw=this.size*1.2, bh=3, by=this.y-this.size/2-8;
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(this.x-bw/2,by,bw,bh);
        ctx.fillStyle=hpR>0.3?'#4a4':'#c44'; ctx.fillRect(this.x-bw/2,by,bw*hpR,bh);
    }
    hasReachedBottom(gameH) { return this.y > gameH + 20; }
}

// ==================== 技能特效 ====================
class Fireball {
    constructor(x, y, damage) {
        this.x=x; this.y=y; this.targetY=rand(this.y+50, this.y+200);
        this.damage=damage; this.timer=0; this.duration=0.8;
        this.dead=false; this.exploded=false;
        this.sprite=Assets.getSprite('skillFire');
    }
    update(dt, game) {
        this.timer+=dt;
        this.y+=(this.targetY-this.y)*0.08;
        if(this.timer>=this.duration) {
            if(!this.exploded) {
                this.exploded=true;
                game.enemies.forEach(e=>{
                    if(dist(e,this)<60) e.takeDamage(this.damage,game);
                });
                for(let i=0;i<15;i++) {
                    game.particles.push(new Particle(this.x,this.y,{
                        vx:rand(-3,3), vy:rand(-3,1), color:'#ff6600', life:0.5, size:rand(3,7)
                    }));
                }
            }
            this.dead=true;
        }
    }
    draw(ctx) {
        const a=this.timer<0.3?this.timer/0.3:1;
        if (this.sprite) {
            ctx.globalAlpha=a;
            ctx.drawImage(this.sprite, this.x-20, this.y-20, 40, 40);
            ctx.globalAlpha=1;
        } else {
            ctx.globalAlpha=a; ctx.fillStyle='#ff6600'; ctx.shadowColor='#ff4400'; ctx.shadowBlur=12;
            ctx.beginPath(); ctx.arc(this.x,this.y,10,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0; ctx.globalAlpha=1;
        }
    }
}

class IceSword {
    constructor(x, y, vx, vy, damage) {
        this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.damage=damage;
        this.life=1.5; this.dead=false; this.hit=new Set();
        this.sprite=Assets.getSprite('skillIce');
    }
    update(dt, game) {
        this.x+=this.vx*60*dt; this.y+=this.vy*60*dt;
        this.life-=dt; if(this.life<=0) this.dead=true;
        game.enemies.forEach(e=>{
            if(this.hit.has(e)) return;
            if(dist(this,e)<(24+e.size/2)) {
                this.hit.add(e); e.takeDamage(this.damage,game);
            }
        });
    }
    draw(ctx) {
        if (this.sprite) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.drawImage(this.sprite, -16, -16, 32, 32);
            ctx.restore();
        } else {
            ctx.fillStyle='#66ccff'; ctx.shadowColor='#66ccff'; ctx.shadowBlur=8;
            ctx.beginPath(); ctx.arc(this.x,this.y,8,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0;
        }
    }
}

// ==================== 英雄 ====================
class Hero {
    constructor(permUpgrades) {
        this.maxHp=CFG.HERO.baseHp + permUpgrades.hp*15;
        this.hp=this.maxHp;
        this.baseAtk=CFG.HERO.baseAtk + permUpgrades.atk*3;
        this.baseAtkSpd=CFG.HERO.baseAtkSpd * (1 + permUpgrades.atkSpd*0.1);
        this.baseSpd=CFG.HERO.baseSpd + permUpgrades.spd*0.3;
        this.size=26;
        this.x=200; this.y=620;
        this.level=1; this.xp=0; this.xpToNext=CFG.XP_BASE;
        this.dead=false; this.invulnTimer=0;
        this.bonusAtk=0; this.bonusAtkSpd=0; this.bonusSpd=0;
        this.bonusBullets=0; this.bonusPierce=0;
        this.bonusSkillDmg=permUpgrades.skill*0.08;
        this.bonusSkillCd=0;
        this.skillCooldowns={fire:0, ice:0};
        this.atkTimer=0; this.animFrame=0; this.animTimer=0;
        this.moveDir=0;
        this.sprite=Assets.getSprite('hero');
    }
    getAtk() { return this.baseAtk+this.bonusAtk; }
    getAtkSpd() { return this.baseAtkSpd*(1+this.bonusAtkSpd); }
    getSpd() { return this.baseSpd+this.bonusSpd; }
    getSkillDmgMul() { return 1+this.bonusSkillDmg; }
    getSkillCd(type) {
        const base=CFG.SKILLS[type].cooldown;
        return Math.max(5, base-this.bonusSkillCd);
    }
    update(dt, game) {
        if(this.dead) return;
        if(this.invulnTimer>0) this.invulnTimer-=dt;
        // 技能冷却
        for(const k in this.skillCooldowns) {
            if(this.skillCooldowns[k]>0) this.skillCooldowns[k]-=dt;
        }
        // 移动
        this.x+=this.moveDir*this.getSpd()*60*dt;
        this.x=clamp(this.x,this.size,game.gameW-this.size);
        // 动画
        if(this.moveDir!==0) {
            this.animTimer+=dt;
            if(this.animTimer>0.12) { this.animTimer=0; this.animFrame=(this.animFrame+1)%4; }
        } else { this.animFrame=0; }
        // 攻击
        this.atkTimer-=dt;
        if(this.atkTimer<=0) {
            this.atkTimer=1/this.getAtkSpd();
            this.shoot(game);
        }
    }
    shoot(game) {
        const baseCount=1;
        const totalCount=baseCount + this.bonusBullets;
        const spread=totalCount>1?0.15:0;
        for(let i=0;i<totalCount;i++) {
            const bx=this.x + (i - (totalCount-1)/2) * 12;
            const b=new Bullet(bx, this.y-this.size, this.getAtk(), 1+this.bonusPierce);
            if(totalCount>1) {
                b.vx = (i - (totalCount-1)/2) * 1.5;
            }
            game.bullets.push(b);
        }
    }
    takeDamage(dmg) {
        if(this.invulnTimer>0||this.dead) return;
        this.hp-=dmg; this.invulnTimer=0.2;
        if(this.hp<=0) { this.hp=0; this.dead=true; }
    }
    addXP(amount) {
        this.xp+=amount;
        while(this.xp>=this.xpToNext&&this.level<CFG.MAX_LEVEL) {
            this.xp-=this.xpToNext; this.level++;
            this.xpToNext=Math.floor(CFG.XP_BASE*Math.pow(CFG.XP_GROW,this.level-1));
            window._game.showLevelUp();
        }
    }
    applyUpgrade(opt) {
        switch(opt.id) {
            case 'hp': this.maxHp+=20; this.hp+=20; break;
            case 'atk': this.bonusAtk+=4; break;
            case 'atkSpd': this.bonusAtkSpd+=0.15; break;
            case 'spd': this.bonusSpd+=0.5; break;
            case 'bullet': this.bonusPierce+=1; break;
            case 'multi': this.bonusBullets+=1; break;
            case 'heal': this.hp=Math.min(this.maxHp,this.hp+this.maxHp*0.5); break;
            case 'skillDmg': this.bonusSkillDmg+=0.2; break;
            case 'skillCd': this.bonusSkillCd+=2; break;
        }
    }
    draw(ctx) {
        if(this.dead) return;
        const drawSize=this.size*2.5;
        // 无敌闪烁
        if(this.invulnTimer>0&&Math.floor(this.invulnTimer*20)%2===0) return;
        if (this.sprite) {
            const frameW=this.sprite.width/4;
            const srcX=this.animFrame*frameW;
            const frameH=this.sprite.height;
            const asp=frameW/frameH;
            let dw=drawSize, dh=drawSize;
            if(asp>1) dh=drawSize/asp; else dw=drawSize*asp;
            ctx.drawImage(this.sprite, srcX, 0, frameW, frameH, this.x-dw/2, this.y-dh/2, dw, dh);
        } else {
            const grad=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size/2);
            grad.addColorStop(0,'#4499cc'); grad.addColorStop(0.6,'#225588'); grad.addColorStop(1,'#0a0a1a');
            ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(this.x,this.y,this.size/2,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#ffcc00'; ctx.lineWidth=2; ctx.stroke();
        }
    }
}

// ==================== 输入 ====================
const Input = {
    keys: {}, touchActive:false, touchX:0,
    init() {
        window.addEventListener('keydown',e=>{
            this.keys[e.key.toLowerCase()]=true;
            if(e.key==='Escape') { e.preventDefault(); window._game?.togglePause(); }
            if(e.key===' ') e.preventDefault();
        });
        window.addEventListener('keyup',e=>{ this.keys[e.key.toLowerCase()]=false; });
        const canvas=document.getElementById('gameCanvas');
        if(canvas) {
            canvas.addEventListener('touchstart',e=>{
                e.preventDefault();
                this.touchActive=true;
                this.touchX=e.touches[0].clientX;
            },{passive:false});
            canvas.addEventListener('touchmove',e=>{
                e.preventDefault();
                if(this.touchActive) this.touchX=e.touches[0].clientX;
            },{passive:false});
            canvas.addEventListener('touchend',e=>{ e.preventDefault(); this.touchActive=false; },{passive:false});
            canvas.addEventListener('mousedown',e=>{
                this.touchActive=true; this.touchX=e.clientX;
                const mm=e=>{ if(this.touchActive) this.touchX=e.clientX; };
                const mu=()=>{ this.touchActive=false; document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); };
                document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
            });
        }
    },
    getMoveDir(heroX) {
        if(this.touchActive) {
            const canvas=document.getElementById('gameCanvas');
            if(!canvas) return 0;
            const rect=canvas.getBoundingClientRect();
            const relX=this.touchX-rect.left;
            const scale=rect.width/window._game.gameW;
            const worldX=relX/scale;
            if(worldX<heroX-8) return -1;
            if(worldX>heroX+8) return 1;
            return 0;
        }
        let d=0;
        if(this.keys['a']||this.keys['arrowleft']) d=-1;
        if(this.keys['d']||this.keys['arrowright']) d=1;
        return d;
    },
};

// ==================== 波次数据 ====================
function getWaveData(waveNum) {
    const data={enemies:[], total:0};
    if(waveNum<=5) {
        data.enemies.push({type:'slime', count:3+waveNum*2});
        if(waveNum>=3) data.enemies.push({type:'skeleton', count:waveNum-2});
        data.total=data.enemies.reduce((a,b)=>a+b.count,0);
    } else if(waveNum<=10) {
        data.enemies.push({type:'slime', count:4+waveNum});
        data.enemies.push({type:'skeleton', count:3+(waveNum-5)*2});
        if(waveNum>=8) data.enemies.push({type:'demon', count:waveNum-7});
        data.total=data.enemies.reduce((a,b)=>a+b.count,0);
    } else if(waveNum<=15) {
        data.enemies.push({type:'skeleton', count:5+(waveNum-10)*2});
        data.enemies.push({type:'demon', count:3+(waveNum-10)*3});
        data.enemies.push({type:'slime', count:6+waveNum});
        data.total=data.enemies.reduce((a,b)=>a+b.count,0);
    } else if(waveNum<=19) {
        data.enemies.push({type:'demon', count:5+(waveNum-15)*3});
        data.enemies.push({type:'skeleton', count:8+(waveNum-15)*2});
        if(waveNum>=18) data.enemies.push({type:'boss', count:1});
        data.total=data.enemies.reduce((a,b)=>a+b.count,0);
    } else {
        data.enemies.push({type:'boss', count:3});
        data.enemies.push({type:'demon', count:8});
        data.enemies.push({type:'skeleton', count:10});
        data.total=data.enemies.reduce((a,b)=>a+b.count,0);
    }
    return data;
}

// ==================== 主游戏 ====================
class Game {
    constructor() {
        this.canvas=document.getElementById('gameCanvas');
        this.ctx=this.canvas.getContext('2d');
        this.running=false; this.paused=false;
        this.gameW=400; this.gameH=700;
        this.stageId=1; this.stageCfg=CFG.STAGES[0];
        this.currentWave=1; this.waveActive=false;
        this.waveEnemies=[]; this.waveSpawned=0; this.waveSpawnTimer=0;
        this.hero=null; this.enemies=[]; this.bullets=[];
        this.particles=[]; this.fireballs=[]; this.iceSwords=[];
        this.kills=0; this.score=0; this.goldEarned=0;
        this.gameOver=false; this.victory=false;
        this._itemBarDirty=false;
        window._game=this;
    }
    init() {
        this.resize();
        window.addEventListener('resize',()=>this.resize());
        Input.init();
        this.setupUI();
    }
    resize() {
        this.canvas.width=window.innerWidth;
        this.canvas.height=window.innerHeight;
        const scaleX=window.innerWidth/this.gameW;
        const scaleY=window.innerHeight/this.gameH;
        const scale=Math.min(scaleX, scaleY);
        this.renderW=this.gameW*scale;
        this.renderH=this.gameH*scale;
        this.renderX=(window.innerWidth-this.renderW)/2;
        this.renderY=(window.innerHeight-this.renderH)/2;
        this.scale=scale;
    }
    start(stageId) {
        this.stageId=stageId; this.stageCfg=CFG.STAGES[stageId-1];
        this.running=true; this.paused=false;
        this.gameOver=false; this.victory=false;
        this.currentWave=1; this.waveActive=false;
        this.waveEnemies=[]; this.waveSpawned=0;
        this.waveSpawnTimer=0;
        this.enemies=[]; this.bullets=[]; this.particles=[];
        this.fireballs=[]; this.iceSwords=[];
        this.kills=0; this.score=0; this.goldEarned=0;
        this.hero=new Hero(DB.data.permUpgrades);
        this.hero.x=this.gameW/2;
        this.hero.y=this.gameH-80;
        this.resize();
        this.lastTime=performance.now();
        this.showWaveTransition();
        this.loop();
    }
    loop() {
        if(!this.running) return;
        const now=performance.now();
        let dt=(now-this.lastTime)/1000;
        this.lastTime=now;
        if(dt>0.1) dt=0.1;
        if(!this.paused) {
            this.update(dt);
        }
        this.render();
        requestAnimationFrame(()=>this.loop());
    }
    update(dt) {
        const h=this.hero;
        if(!h||h.dead) {
            if(!this.gameOver) { this.gameOver=true; this.onGameOver(); }
            return;
        }
        // 英雄移动
        h.moveDir=Input.getMoveDir(h.x);
        h.update(dt, this);
        // 子弹
        for(let i=this.bullets.length-1;i>=0;i--) {
            this.bullets[i].update(dt);
            const b=this.bullets[i];
            if(b.dead) { this.bullets.splice(i,1); continue; }
            for(const e of this.enemies) {
                if(b.hit.has(e)) continue;
                if(dist(b,e)<(b.size+e.size/2)) {
                    b.hit.add(e); e.takeDamage(b.damage,this);
                    b.pierce--; if(b.pierce<=0) { b.dead=true; break; }
                }
            }
        }
        if(this.bullets.length>200) this.bullets.splice(0,this.bullets.length-200);
        // 敌人
        for(let i=this.enemies.length-1;i>=0;i--) {
            this.enemies[i].update(dt);
            const e=this.enemies[i];
            if(e.dead) { this.enemies.splice(i,1); continue; }
            if(e.hasReachedBottom(this.gameH)) {
                h.takeDamage(e.damage);
                e.dead=true;
                this.enemies.splice(i,1);
            }
        }
        // 火球
        for(let i=this.fireballs.length-1;i>=0;i--) {
            this.fireballs[i].update(dt,this);
            if(this.fireballs[i].dead) this.fireballs.splice(i,1);
        }
        // 冰剑
        for(let i=this.iceSwords.length-1;i>=0;i--) {
            this.iceSwords[i].update(dt,this);
            if(this.iceSwords[i].dead) this.iceSwords.splice(i,1);
        }
        // 粒子
        for(let i=this.particles.length-1;i>=0;i--) {
            this.particles[i].update(dt);
            if(this.particles[i].dead) this.particles.splice(i,1);
        }
        if(this.particles.length>300) this.particles.splice(0,this.particles.length-300);
        // 波次系统
        if(this.waveActive) {
            this.waveSpawnTimer-=dt;
            if(this.waveSpawnTimer<=0&&this.waveSpawned<this.waveEnemies.length) {
                const spawn=this.waveEnemies[this.waveSpawned];
                const margin=30;
                const ex=rand(margin, this.gameW-margin);
                this.enemies.push(new Enemy(spawn.type, ex, -rand(20,80), this.stageCfg));
                this.waveSpawned++;
                this.waveSpawnTimer=Math.max(0.3, 1.5-this.currentWave*0.05);
            }
            if(this.waveSpawned>=this.waveEnemies.length&&this.enemies.length===0) {
                this.waveActive=false;
                this.currentWave++;
                if(this.currentWave>CFG.MAX_WAVES) {
                    this.victory=true;
                    this.running=false;
                    this.onVictory();
                } else {
                    this.showWaveTransition();
                }
            }
        }
        this.updateHUD();
    }
    startWave() {
        this.waveActive=true;
        const data=getWaveData(this.currentWave);
        this.waveEnemies=[];
        for(const g of data.enemies) {
            for(let i=0;i<g.count;i++) this.waveEnemies.push({type:g.type});
        }
        // 随机打乱
        for(let i=this.waveEnemies.length-1;i>0;i--) {
            const j=randInt(0,i);
            [this.waveEnemies[i],this.waveEnemies[j]]=[this.waveEnemies[j],this.waveEnemies[i]];
        }
        this.waveSpawned=0; this.waveSpawnTimer=0.5;
    }
    showWaveTransition() {
        if(!document.getElementById('levelUpScreen').classList.contains('hidden')) return;
        this.paused=true;
        document.getElementById('waveTitle').textContent='第 '+this.currentWave+' 波';
        const data=getWaveData(this.currentWave);
        let info='';
        for(const g of data.enemies) {
            info+=CFG.ENEMY_TYPES[g.type].name+' x'+g.count+' ';
        }
        document.getElementById('waveInfo').textContent=info;
        document.getElementById('waveScreen').classList.remove('hidden');
    }
    useSkill(type) {
        const h=this.hero;
        if(!h||h.dead) return;
        if(h.skillCooldowns[type]>0) return;
        h.skillCooldowns[type]=h.getSkillCd(type);
        const cfg=CFG.SKILLS[type];
        const dmgMul=h.getSkillDmgMul();
        if(type==='fire') {
            const count=cfg.fireballs+Math.floor(h.bonusSkillDmg*5);
            for(let i=0;i<count;i++) {
                this.fireballs.push(new Fireball(
                    rand(30,this.gameW-30), -rand(10,60),
                    Math.floor(cfg.damage*dmgMul)
                ));
            }
        } else if(type==='ice') {
            const count=cfg.swords+Math.floor(h.bonusSkillDmg*3);
            const spreadAngle=Math.PI/3;
            const startAngle=-Math.PI/2-spreadAngle/2;
            for(let i=0;i<count;i++) {
                const a=startAngle+(i/(count-1))*spreadAngle;
                const spd=rand(3,5);
                this.iceSwords.push(new IceSword(h.x, h.y, Math.cos(a)*spd, Math.sin(a)*spd, Math.floor(cfg.damage*dmgMul)));
            }
        }
    }
    addXP(amount) {
        if(this.hero&&!this.hero.dead) this.hero.addXP(amount);
    }
    showLevelUp() {
        this.paused=true;
        const opts=this.generateLevelUpOptions();
        const container=document.getElementById('levelUpOptions');
        if(!container) return;
        container.innerHTML='';
        opts.forEach(opt=>{
            const div=document.createElement('div');
            div.className='option-btn';
            div.innerHTML='<span class="op-name">'+opt.name+'</span><span class="op-desc">'+opt.desc+'</span>';
            div.onclick=()=>{
                this.hero.applyUpgrade(opt);
                document.getElementById('levelUpScreen').classList.add('hidden');
                this.paused=false;
            };
            container.appendChild(div);
        });
        document.getElementById('levelUpScreen').classList.remove('hidden');
    }
    generateLevelUpOptions() {
        const options=[];
        const pool=[...CFG.LEVEL_OPTIONS];
        const used=new Set();
        for(let i=0;i<4;i++) {
            const available=pool.filter(o=>!used.has(o.id));
            if(available.length===0) break;
            const total=available.reduce((a,b)=>a+b.weight,0);
            let r=Math.random()*total;
            for(const o of available) { r-=o.weight; if(r<=0) { options.push({...o}); used.add(o.id); break; } }
        }
        return options;
    }
    render() {
        const ctx=this.ctx;
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        // 暗色背景
        ctx.fillStyle='#0a0a1a';
        ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        // 游戏区域
        ctx.save();
        ctx.translate(this.renderX, this.renderY);
        ctx.scale(this.scale, this.scale);
        // 背景
        const bgImg=Assets.getRaw('bg');
        if(bgImg&&bgImg.complete) {
            ctx.drawImage(bgImg, 0, 0, this.gameW, this.gameH);
        } else {
            ctx.fillStyle=this.stageCfg.bgColor;
            ctx.fillRect(0,0,this.gameW,this.gameH);
        }
        // 道路
        ctx.fillStyle='rgba(139,119,80,0.3)';
        ctx.fillRect(this.gameW*0.2, 0, this.gameW*0.6, this.gameH);
        // 网格线
        ctx.strokeStyle='rgba(255,255,255,0.05)';
        ctx.lineWidth=0.5;
        for(let x=0;x<this.gameW;x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,this.gameH); ctx.stroke(); }
        for(let y=0;y<this.gameH;y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(this.gameW,y); ctx.stroke(); }
        // 底部防线
        ctx.strokeStyle='rgba(255,50,50,0.5)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(0,this.gameH-15); ctx.lineTo(this.gameW,this.gameH-15); ctx.stroke();
        // 粒子
        for(const pt of this.particles) pt.draw(ctx);
        // 火球
        for(const fb of this.fireballs) fb.draw(ctx);
        // 冰剑
        for(const is of this.iceSwords) is.draw(ctx);
        // 敌人
        for(const e of this.enemies) e.draw(ctx);
        // 子弹
        for(const b of this.bullets) b.draw(ctx);
        // 英雄
        if(this.hero) this.hero.draw(ctx);
        ctx.restore();
        // 波次提示
        if(this.waveActive) {
            ctx.fillStyle='#ffcc00'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
            ctx.fillText('第 '+this.currentWave+' 波', this.canvas.width/2, 30);
            ctx.textAlign='start';
        }
    }
    updateHUD() {
        const h=this.hero;
        if(!h) return;
        document.getElementById('hudWave').textContent=this.currentWave+'/'+CFG.MAX_WAVES;
        document.getElementById('hudKills').textContent=this.kills;
        document.getElementById('hudGold').textContent=this.goldEarned;
        document.getElementById('hudLevel').textContent=h.level;
        const xpR=h.xp/h.xpToNext;
        document.getElementById('hudXpFill').style.width=(xpR*100)+'%';
        const hpR=h.hp/h.maxHp;
        document.getElementById('hudHpFill').style.width=(hpR*100)+'%';
        document.getElementById('hudHpText').textContent=Math.ceil(h.hp)+'/'+h.maxHp;
        // 技能冷却
        const cd1=h.skillCooldowns['fire'];
        const cd2=h.skillCooldowns['ice'];
        const btn1=document.getElementById('btnSkill1');
        const btn2=document.getElementById('btnSkill2');
        const cd1El=document.getElementById('skillCd1');
        const cd2El=document.getElementById('skillCd2');
        if(cd1>0) {
            btn1.classList.add('on-cd'); cd1El.textContent=cd1.toFixed(1)+'s';
        } else {
            btn1.classList.remove('on-cd'); cd1El.textContent='';
        }
        if(cd2>0) {
            btn2.classList.add('on-cd'); cd2El.textContent=cd2.toFixed(1)+'s';
        } else {
            btn2.classList.remove('on-cd'); cd2El.textContent='';
        }
    }
    togglePause() {
        if(this.paused) {
            this.paused=false;
            document.getElementById('pauseScreen').classList.add('hidden');
        } else {
            this.paused=true;
            document.getElementById('pauseScreen').classList.remove('hidden');
        }
    }
    onGameOver() {
        this.running=false;
        DB.addGold(this.goldEarned);
        if(this.currentWave>DB.data.highWave) DB.data.highWave=this.currentWave;
        DB.data.totalKills+=this.kills;
        DB.unlockStage(Math.min(this.stageId+1, 5));
        DB.save();
        document.getElementById('goWave').textContent=this.currentWave;
        document.getElementById('goKills').textContent=this.kills;
        document.getElementById('goLevel').textContent=this.hero?this.hero.level:1;
        document.getElementById('goGold').textContent=this.goldEarned;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        this.updateMenuStats();
    }
    onVictory() {
        DB.addGold(this.goldEarned+100);
        if(CFG.MAX_WAVES>DB.data.highWave) DB.data.highWave=CFG.MAX_WAVES;
        DB.data.totalKills+=this.kills;
        DB.unlockStage(Math.min(this.stageId+1, 5));
        DB.save();
        document.getElementById('vKills').textContent=this.kills;
        document.getElementById('vLevel').textContent=this.hero?this.hero.level:1;
        document.getElementById('vGold').textContent=this.goldEarned+100;
        document.getElementById('victoryScreen').classList.remove('hidden');
        this.updateMenuStats();
    }
    setupUI() {
        document.getElementById('btnUpgrade').onclick=()=>this.showPermUpgrades();
        document.getElementById('btnGM').onclick=()=>{
            document.getElementById('gmGold').value=DB.getGold();
            document.getElementById('gmScreen').classList.remove('hidden');
        };
        document.getElementById('btnPause').onclick=()=>this.togglePause();
        document.getElementById('btnResume').onclick=()=>this.togglePause();
        document.getElementById('btnQuit').onclick=()=>{
            this.running=false;
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('pauseScreen').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
            this.updateMenuStats();
        };
        document.getElementById('btnRestart').onclick=()=>{
            document.getElementById('gameOverScreen').classList.add('hidden');
            this.start(this.stageId);
        };
        document.getElementById('btnMenu').onclick=()=>{
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
            this.updateMenuStats();
        };
        document.getElementById('btnVictoryRestart').onclick=()=>{
            document.getElementById('victoryScreen').classList.add('hidden');
            this.start(this.stageId);
        };
        document.getElementById('btnVictoryMenu').onclick=()=>{
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('victoryScreen').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
            this.updateMenuStats();
        };
        document.getElementById('btnWaveStart').onclick=()=>{
            document.getElementById('waveScreen').classList.add('hidden');
            this.paused=false;
            this.startWave();
        };
        document.getElementById('btnSkill1').onclick=()=>this.useSkill('fire');
        document.getElementById('btnSkill2').onclick=()=>this.useSkill('ice');
        document.getElementById('btnCloseUpgrade').onclick=()=>document.getElementById('upgradeScreen').classList.add('hidden');
        document.getElementById('btnCloseGM').onclick=()=>document.getElementById('gmScreen').classList.add('hidden');
        this.updateMenuStats();
        this.updateStageButtons();
    }
    updateMenuStats() {
        document.getElementById('mHighWave').textContent=DB.data.highWave;
        document.getElementById('mGold').textContent=DB.getGold();
        document.getElementById('mTotalKills').textContent=DB.data.totalKills;
    }
    updateStageButtons() {
        const grid=document.getElementById('stageGrid');
        if(!grid) return;
        grid.innerHTML='';
        for(const s of CFG.STAGES) {
            const btn=document.createElement('div');
            btn.className='stage-btn';
            if(!DB.data.unlockedStages.includes(s.id)) btn.className+=' locked';
            btn.innerHTML='<span class="st-num">'+s.id+'</span><span class="st-name">'+s.name+'</span>';
            btn.onclick=()=>{
                if(!DB.data.unlockedStages.includes(s.id)) return;
                document.getElementById('mainMenu').classList.add('hidden');
                document.getElementById('gameScreen').classList.remove('hidden');
                this.start(s.id);
            };
            grid.appendChild(btn);
        }
    }
    showPermUpgrades() {
        const container=document.getElementById('upgradeList');
        container.innerHTML='';
        document.getElementById('upGold').textContent=DB.getGold();
        for(const [key,cfg] of Object.entries(CFG.PERM_UPGRADES)) {
            const lv=DB.getPermLv(key), maxed=lv>=cfg.maxLv, cost=DB.getPermCost(key);
            const div=document.createElement('div');
            div.className='upgrade-item';
            div.innerHTML='<div class="ui-info"><div class="ui-name">'+cfg.name+' Lv.'+lv+'/'+cfg.maxLv+'</div><div class="ui-desc">'+cfg.desc+'</div></div>'+(maxed?'<span class="ui-maxed">已满级</span>':'<button class="ui-btn">'+cost+' G</button>');
            if(!maxed) div.querySelector('.ui-btn').onclick=()=>{if(DB.upgradePerm(key)){this.showPermUpgrades();this.updateMenuStats();this.updateStageButtons();}};
            container.appendChild(div);
        }
        document.getElementById('upgradeScreen').classList.remove('hidden');
    }
}

// ==================== GM ====================
window.GM = {
    setGold() {
        const v=parseInt(document.getElementById('gmGold').value)||0;
        DB.data.gold=v; DB.save();
        document.getElementById('gmScreen').classList.add('hidden');
        if(window._game) { window._game.updateMenuStats(); window._game.updateStageButtons(); }
    },
    addGold(n) { DB.addGold(n); document.getElementById('gmGold').value=DB.getGold(); if(window._game) { window._game.updateMenuStats(); window._game.updateStageButtons(); } },
    resetAll() { if(confirm('确定要重置所有数据吗?')) { DB.resetAll(); if(window._game) { window._game.updateMenuStats(); window._game.updateStageButtons(); } } },
    maxUpgrades() { DB.maxAll(); if(window._game) { window._game.updateMenuStats(); window._game.updateStageButtons(); } },
};

// ==================== 启动 ====================
DB.init();
const game = new Game();
const loadOverlay=document.createElement('div');
loadOverlay.id='loadOverlay';
loadOverlay.innerHTML='<div class="load-content"><div class="load-spinner"></div><p>资源加载中...</p><div class="load-bar"><div id="loadBar" class="load-bar-fill"></div></div></div>';
document.body.appendChild(loadOverlay);

Assets.loadAll().then(()=>{
    game.init();
    loadOverlay.classList.add('load-done');
    setTimeout(()=>loadOverlay.remove(),500);
    document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
});

const progressInterval=setInterval(()=>{
    const p=Assets.progress();
    const bar=document.getElementById('loadBar');
    if(bar) bar.style.width=(p*100)+'%';
    if(p>=1) clearInterval(progressInterval);
},100);

})();