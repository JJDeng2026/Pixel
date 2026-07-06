/**
 * 王国守卫 - 塔防引擎 v6.0
 * 竖版固定塔防 | 20波 | 20级英雄 | 关卡选择 | 技能系统 | 村落守护
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
    bg_grassland: 'assets/images/td_bg_grassland.jpg',
    bg_desert:   'assets/images/td_bg_desert.jpg',
    bg_forest:   'assets/images/td_bg_forest.jpg',
    bg_castle:   'assets/images/td_bg_castle.jpg',
    bg_volcano:  'assets/images/td_bg_volcano.jpg',
    hero:        'assets/images/td_hero.jpg',
    enemySlime:    'assets/images/td_enemy_slime.jpg',
    enemySkeleton: 'assets/images/td_enemy_skeleton.jpg',
    enemyDemon:    'assets/images/td_enemy_demon.jpg',
    enemyBoss:     'assets/images/td_enemy_boss.jpg',
    bullet:     'assets/images/td_bullet.jpg',
    skillFire:  'assets/images/td_skill_fire.jpg',
    skillIce:   'assets/images/td_skill_ice.jpg',
    village:    'assets/images/td_village_gate.jpg',
};

// ==================== 配置 ====================
const CFG = {
    MAX_LEVEL: 20,
    MAX_WAVES: 20,
    STAGES: [
        { id:1, name:'草原', bgKey:'bg_grassland', unlocked:true,  enemyHpMul:1.0, enemySpdMul:1.0, goldMul:1.0, villageHp:200 },
        { id:2, name:'沙漠', bgKey:'bg_desert',   unlocked:true,  enemyHpMul:1.3, enemySpdMul:1.15, goldMul:1.2, villageHp:250 },
        { id:3, name:'森林', bgKey:'bg_forest',   unlocked:true,  enemyHpMul:1.6, enemySpdMul:1.0, goldMul:1.4, villageHp:300 },
        { id:4, name:'城堡', bgKey:'bg_castle',   unlocked:true,  enemyHpMul:2.0, enemySpdMul:1.25, goldMul:1.6, villageHp:350 },
        { id:5, name:'火山', bgKey:'bg_volcano',  unlocked:true,  enemyHpMul:2.5, enemySpdMul:1.35, goldMul:1.8, villageHp:400 },
    ],
    ENEMY_TYPES: {
        slime:    { name:'史莱姆', hp:25,  dmg:5,  villageDmg:3,  spd:1.0, size:36, xp:10,  gold:2,  color:'#44cc44' },
        skeleton: { name:'骷髅兵', hp:60,  dmg:10, villageDmg:6,  spd:0.8, size:42, xp:22,  gold:5,  color:'#cccccc' },
        demon:    { name:'恶魔',   hp:130, dmg:20, villageDmg:12, spd:1.3, size:48, xp:50,  gold:12, color:'#cc4444' },
        boss:     { name:'巨龙',   hp:500, dmg:35, villageDmg:25, spd:0.5, size:72, xp:250, gold:50, color:'#8844cc' },
    },
    SKILLS: {
        fire: { name:'火球术', desc:'全屏随机火球坠落', cooldown:18, icon:IMG.skillFire, fireballs:14, damage:40 },
        ice:  { name:'冰霜剑', desc:'扩散冰剑扇形攻击', cooldown:15, icon:IMG.skillIce, swords:7, damage:30 },
    },
    HERO: {
        baseHp: 120, baseAtk: 20, baseAtkSpd: 2.5, baseSpd: 4.0,
        bulletSpeed: 8, bulletSize: 12, bulletPierce: 1,
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
            {key:'bg_grassland', url:IMG.bg_grassland},
            {key:'bg_desert', url:IMG.bg_desert},
            {key:'bg_forest', url:IMG.bg_forest},
            {key:'bg_castle', url:IMG.bg_castle},
            {key:'bg_volcano', url:IMG.bg_volcano},
            {key:'hero', url:IMG.hero},
            {key:'enemySlime', url:IMG.enemySlime},
            {key:'enemySkeleton', url:IMG.enemySkeleton},
            {key:'enemyDemon', url:IMG.enemyDemon},
            {key:'enemyBoss', url:IMG.enemyBoss},
            {key:'bullet', url:IMG.bullet},
            {key:'skillFire', url:IMG.skillFire},
            {key:'skillIce', url:IMG.skillIce},
            {key:'village', url:IMG.village},
        ];
        this.total = urls.length;
        return Promise.all(urls.map(item=>this.loadImage(item.key, item.url)));
    },
    loadImage(key, url) {
        return new Promise((resolve)=>{
            const img = new Image();
            img.onload = ()=>{
                this.loaded[key]=img;
                if (key !== 'bg_grassland' && key !== 'bg_desert' && key !== 'bg_forest' && key !== 'bg_castle' && key !== 'bg_volcano') {
                    ChromaKey.process(img, key);
                }
                this.count++;
                const pct = Math.floor(this.progress()*100);
                const bar = document.getElementById('loadBar');
                const txt = document.getElementById('loadText');
                if(bar) bar.style.width = pct+'%';
                if(txt) txt.textContent = '加载中... '+pct+'%';
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
    key: 'kingdom_defense_v6',
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
function lerp(a,b,t) { return a+(b-a)*t; }
function easeOutCubic(t) { return 1-Math.pow(1-t,3); }
function easeInOutQuad(t) { return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }

// ==================== 粒子 ====================
class Particle {
    constructor(x,y,opts={}) {
        this.x=x; this.y=y; this.vx=opts.vx||rand(-1,1); this.vy=opts.vy||rand(-1,1);
        this.life=opts.life||0.5; this.maxLife=this.life; this.color=opts.color||'#fff';
        this.size=opts.size||3; this.dead=false; this.gravity=opts.gravity||0;
    }
    update(dt) {
        this.x+=this.vx*60*dt; this.y+=this.vy*60*dt;
        this.vy+=this.gravity*60*dt;
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
        this.age=0;
    }
    update(dt) {
        this.age+=dt;
        this.x+=this.vx*60*dt;
        this.y-=this.speed*60*dt;
        if(this.y<-20) this.dead=true;
    }
    draw(ctx) {
        if (this.sprite) {
            const sz=this.size*0.9;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.age*8);
            ctx.drawImage(this.sprite, -sz, -sz, sz*2, sz*2);
            ctx.restore();
        } else {
            ctx.fillStyle='#ffcc00'; ctx.shadowColor='#ffcc00'; ctx.shadowBlur=8;
            ctx.beginPath(); ctx.arc(this.x,this.y,this.size*0.5,0,Math.PI*2); ctx.fill();
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
        this.damage=cfg.dmg; this.villageDmg=cfg.villageDmg;
        this.spd=cfg.spd * stageCfg.enemySpdMul;
        this.size=cfg.size; this.color=cfg.color;
        this.xp=cfg.xp; this.gold=Math.floor(cfg.gold * stageCfg.goldMul);
        this.dead=false; this.hitFlash=0;
        this.wobble=rand(0,Math.PI*2);
        this.freezeTimer=0;
        let spriteKey='enemySlime';
        if(type==='skeleton') spriteKey='enemySkeleton';
        else if(type==='demon') spriteKey='enemyDemon';
        else if(type==='boss') spriteKey='enemyBoss';
        this.sprite=Assets.getSprite(spriteKey);
        this.bobOffset=rand(0,Math.PI*2);
    }
    update(dt) {
        const spdMul = this.freezeTimer>0 ? 0.3 : 1.0;
        this.freezeTimer=Math.max(0,this.freezeTimer-dt);
        this.y+=this.spd*60*dt*spdMul;
        this.x+=Math.sin(this.y/50+this.wobble)*0.5;
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        if(this.y>window._game.gameH+80) this.dead=true;
    }
    takeDamage(dmg, game, freeze) {
        this.hp-=dmg; this.hitFlash=0.08;
        if(freeze) this.freezeTimer=0.5;
        if(this.hp<=0) { this.die(game); return true; }
        return false;
    }
    die(game) {
        this.dead=true; game.kills++; game.goldEarned+=this.gold;
        game.score+=this.xp;
        for(let i=0;i<10;i++) {
            game.particles.push(new Particle(this.x,this.y,{
                vx:rand(-2.5,2.5), vy:rand(-2.5,1), color:this.color, life:0.5, size:rand(2,5)
            }));
        }
        game.addXP(this.xp);
    }
    draw(ctx) {
        const drawSize=this.size*4.5;
        if (this.sprite) {
            ctx.save();
            if(this.hitFlash>0) ctx.globalAlpha=0.5;
            const asp=this.sprite.width/this.sprite.height;
            let dw=drawSize, dh=drawSize;
            if(asp>1) dh=drawSize/asp; else dw=drawSize*asp;
            const bob=Math.sin(Date.now()*0.003+this.bobOffset)*3;
            ctx.drawImage(this.sprite, this.x-dw/2, this.y-dh/2+bob, dw, dh);
            if(this.freezeTimer>0) {
                ctx.globalAlpha=0.35;
                ctx.fillStyle='#88ccff';
                ctx.fillRect(this.x-dw/2, this.y-dh/2+bob, dw, dh);
            }
            ctx.restore();
        } else {
            ctx.fillStyle=this.hitFlash>0?'#fff':this.color;
            ctx.beginPath(); ctx.arc(this.x,this.y,this.size*0.8,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.stroke();
        }
        // 血条
        const hpR=this.hp/this.maxHp;
        const bw=this.size*1.8, bh=5, by=this.y-this.size*0.8-12;
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(this.x-bw/2,by,bw,bh);
        ctx.fillStyle=this.freezeTimer>0?'#88ccff':(hpR>0.3?'#4a4':'#c44');
        ctx.fillRect(this.x-bw/2,by,bw*hpR,bh);
    }
    hasReachedBottom(gameH) { return this.y > gameH - 80; }
}

// ==================== 技能特效 ====================
class Fireball {
    constructor(x, y, damage, gameH) {
        this.x=x; this.y=y;
        this.targetY=rand(180, gameH-100);
        this.damage=damage; this.timer=0; this.duration=1.0;
        this.dead=false; this.exploded=false;
        this.sprite=Assets.getSprite('skillFire');
        this.trail=[];
        this.rotation=rand(0,Math.PI*2);
        this.rotSpeed=rand(-3,3);
        this.scale=rand(0.8,1.2);
    }
    update(dt, game) {
        this.timer+=dt;
        const progress=this.timer/this.duration;
        this.y=lerp(this.y, this.targetY, 0.06);
        this.rotation+=this.rotSpeed*dt;
        this.trail.push({x:this.x, y:this.y, life:0.12, size:3+progress*4});
        for(let i=this.trail.length-1;i>=0;i--) {
            this.trail[i].life-=dt;
            if(this.trail[i].life<=0) this.trail.splice(i,1);
        }
        if(this.timer>=this.duration) {
            if(!this.exploded) {
                this.exploded=true;
                game.screenShake=0.2;
                game.flashAlpha=0.4;
                game.enemies.forEach(e=>{
                    if(dist(e,this)<90) e.takeDamage(this.damage,game);
                });
                // 爆炸粒子环
                for(let i=0;i<30;i++) {
                    const angle=rand(0,Math.PI*2);
                    const spd=rand(2,7);
                    game.particles.push(new Particle(this.x,this.y,{
                        vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
                        color:Math.random()>0.5?'#ff6600':'#ffcc00',
                        life:0.7, size:rand(3,9), gravity:0.5
                    }));
                }
                // 冲击波粒子
                for(let i=0;i<12;i++) {
                    const angle=(i/12)*Math.PI*2;
                    game.particles.push(new Particle(this.x,this.y,{
                        vx:Math.cos(angle)*1.5, vy:Math.sin(angle)*1.5,
                        color:'#ff4400', life:0.25, size:rand(12,22)
                    }));
                }
            }
            this.dead=true;
        }
    }
    draw(ctx) {
        const progress=this.timer/this.duration;
        // 尾迹
        for(const t of this.trail) {
            const a=t.life/0.12;
            ctx.globalAlpha=a*0.7;
            const grad=ctx.createRadialGradient(t.x,t.y,0,t.x,t.y,t.size);
            grad.addColorStop(0,'#ffcc00'); grad.addColorStop(1,'rgba(255,100,0,0)');
            ctx.fillStyle=grad;
            ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        const a=this.timer<0.15?this.timer/0.15:1;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        const sz=(20+progress*12)*this.scale;
        if (this.sprite) {
            ctx.globalAlpha=a;
            ctx.drawImage(this.sprite, -sz, -sz, sz*2, sz*2);
        } else {
            ctx.globalAlpha=a;
            const grad=ctx.createRadialGradient(0,0,sz*0.2,0,0,sz);
            grad.addColorStop(0,'#ffff88'); grad.addColorStop(0.5,'#ff6600'); grad.addColorStop(1,'rgba(255,50,0,0)');
            ctx.fillStyle=grad;
            ctx.beginPath(); ctx.arc(0,0,sz,0,Math.PI*2); ctx.fill();
        }
        // 光晕
        ctx.globalAlpha=a*0.4;
        const grad2=ctx.createRadialGradient(0,0,sz*0.5,0,0,sz*1.6);
        grad2.addColorStop(0,'rgba(255,200,50,0.6)'); grad2.addColorStop(1,'rgba(255,100,0,0)');
        ctx.fillStyle=grad2;
        ctx.beginPath(); ctx.arc(0,0,sz*1.6,0,Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha=1;
    }
}

class IceSword {
    constructor(x, y, vx, vy, damage) {
        this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.damage=damage;
        this.life=1.5; this.maxLife=1.5; this.dead=false; this.hit=new Set();
        this.sprite=Assets.getSprite('skillIce');
        this.trail=[];
        this.rotation=Math.atan2(vy, vx);
        this.spawnTimer=0;
    }
    update(dt, game) {
        this.spawnTimer+=dt;
        this.x+=this.vx*60*dt; this.y+=this.vy*60*dt;
        this.trail.push({x:this.x, y:this.y, life:0.1});
        for(let i=this.trail.length-1;i>=0;i--) {
            this.trail[i].life-=dt;
            if(this.trail[i].life<=0) this.trail.splice(i,1);
        }
        // 周期性产生冰晶粒子
        if(this.spawnTimer>0.06) {
            this.spawnTimer=0;
            game.particles.push(new Particle(this.x,this.y,{
                vx:rand(-0.5,0.5), vy:rand(-0.5,0.5),
                color:'#88ddff', life:0.25, size:rand(1,3)
            }));
        }
        this.life-=dt; if(this.life<=0) this.dead=true;
        game.enemies.forEach(e=>{
            if(this.hit.has(e)) return;
            if(dist(this,e)<(26+e.size*0.5)) {
                this.hit.add(e); e.takeDamage(this.damage,game,true);
                for(let i=0;i<6;i++) {
                    game.particles.push(new Particle(this.x,this.y,{
                        vx:rand(-1.5,1.5), vy:rand(-1.5,1.5),
                        color:'#aaddff', life:0.35, size:rand(2,5)
                    }));
                }
            }
        });
    }
    draw(ctx) {
        for(const t of this.trail) {
            const a=t.life/0.1;
            ctx.globalAlpha=a*0.6;
            ctx.fillStyle='#88ddff';
            ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        const a=Math.min(1, this.life/0.25);
        ctx.save();
        ctx.globalAlpha=a;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        if (this.sprite) {
            const sz=24;
            ctx.drawImage(this.sprite, -sz, -sz, sz*2, sz*2);
        } else {
            ctx.fillStyle='#66ccff'; ctx.shadowColor='#88ddff'; ctx.shadowBlur=14;
            ctx.beginPath();
            ctx.moveTo(14,0); ctx.lineTo(0,-6); ctx.lineTo(-6,0); ctx.lineTo(0,6); ctx.closePath();
            ctx.fill();
            ctx.shadowBlur=0;
        }
        // 冰晶光晕
        ctx.globalAlpha=a*0.3;
        const grad=ctx.createRadialGradient(0,0,2,0,0,20);
        grad.addColorStop(0,'rgba(150,220,255,0.7)'); grad.addColorStop(1,'rgba(100,200,255,0)');
        ctx.fillStyle=grad;
        ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha=1;
    }
}

// ==================== 村落 ====================
class Village {
    constructor(maxHp) {
        this.maxHp=maxHp; this.hp=maxHp;
        this.sprite=Assets.getSprite('village');
        this.hitFlash=0;
        this.x=0; this.y=0;
    }
    setPosition(x, y) { this.x=x; this.y=y; }
    takeDamage(dmg) {
        this.hp=Math.max(0, this.hp-dmg);
        this.hitFlash=0.15;
        return this.hp<=0;
    }
    update(dt) {
        this.hitFlash=Math.max(0, this.hitFlash-dt);
    }
    draw(ctx) {
        const w=180, h=100;
        if(this.sprite) {
            ctx.save();
            if(this.hitFlash>0) {
                ctx.globalAlpha = 0.5 + Math.sin(this.hitFlash*30)*0.3;
            }
            ctx.drawImage(this.sprite, this.x-w/2, this.y-h/2, w, h);
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle='#8B7355';
            ctx.fillRect(this.x-70, this.y-40, 140, 80);
            ctx.fillStyle='#654321';
            ctx.fillRect(this.x-25, this.y-20, 50, 60);
            ctx.fillStyle='#DAA520';
            ctx.fillRect(this.x-30, this.y-25, 60, 5);
        }
        // 村落血条
        const hpR=this.hp/this.maxHp;
        const bw=140, bh=8, by=this.y-58;
        ctx.fillStyle='rgba(0,0,0,0.7)';
        ctx.fillRect(this.x-bw/2, by, bw, bh);
        const hpGrad=ctx.createLinearGradient(this.x-bw/2,0,this.x+bw/2,0);
        hpGrad.addColorStop(0,'#ff4444'); hpGrad.addColorStop(0.5,'#ffaa00'); hpGrad.addColorStop(1,'#44cc44');
        ctx.fillStyle=hpGrad;
        ctx.fillRect(this.x-bw/2, by, bw*hpR, bh);
        ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
        ctx.fillText(Math.ceil(this.hp)+'/'+this.maxHp, this.x, by-2);
        ctx.textAlign='start';
    }
}

// ==================== 英雄 ====================
class Hero {
    constructor(gameW, gameH) {
        this.size=30;
        this.x=240; this.y=gameH-85;
        this.maxHp=CFG.HERO.baseHp; this.hp=this.maxHp; this.atk=CFG.HERO.baseAtk;
        this.atkSpd=CFG.HERO.baseAtkSpd; this.spd=CFG.HERO.baseSpd;
        this.level=1; this.xp=0; this.xpToNext=CFG.XP_BASE;
        this.dead=false; this.invulnTimer=0;
        this.atkTimer=0; this.moveDir=0;
        this.bonusBullets=0; this.bonusPierce=0; this.bonusSkillDmg=0; this.bonusSkillCd=0;
        this.skillCooldowns={fire:0, ice:0};
        this.sprite=Assets.getSprite('hero');
        this.animTimer=0;
    }
    getAtk() {
        let a=this.atk;
        a+=DB.getPermLv('atk')*3;
        return a;
    }
    getAtkSpd() {
        let s=this.atkSpd;
        s+=DB.getPermLv('atkSpd')*0.25;
        return s;
    }
    getSpd() {
        let s=this.spd;
        s+=DB.getPermLv('spd')*0.3;
        return s;
    }
    getMaxHp() {
        let h=this.maxHp;
        h+=DB.getPermLv('hp')*15;
        return h;
    }
    getSkillDmgMul() {
        return 1 + DB.getPermLv('skill')*0.08 + this.bonusSkillDmg*0.2;
    }
    getSkillCd( type) {
        const cfg=CFG.SKILLS[type];
        return Math.max(5, cfg.cooldown - this.bonusSkillCd*2);
    }
    getXpToNext() {
        return Math.floor(CFG.XP_BASE * Math.pow(CFG.XP_GROW, this.level-1));
    }
    update(dt, game) {
        if(this.dead) return;
        this.animTimer+=dt;
        if(this.invulnTimer>0) this.invulnTimer-=dt;
        for(const k in this.skillCooldowns) {
            if(this.skillCooldowns[k]>0) this.skillCooldowns[k]-=dt;
        }
        // 移动 - 触屏直接跟随，键盘用方向
        if(Input.touchActive) {
            const targetX = Input.getTargetX(game);
            if(targetX !== null) {
                const diff = targetX - this.x;
                const maxStep = this.getSpd() * 60 * dt;
                if(Math.abs(diff) < maxStep) {
                    this.x = targetX;
                    this.moveDir = 0;
                } else {
                    this.x += Math.sign(diff) * maxStep;
                    this.moveDir = Math.sign(diff);
                }
            }
        } else {
            const kb = Input.getKeyboardDir();
            this.moveDir = kb;
            this.x += kb * this.getSpd() * 60 * dt;
        }
        this.x = clamp(this.x, this.size*2, game.gameW-this.size*2);
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
        for(let i=0;i<totalCount;i++) {
            const bx=this.x + (i - (totalCount-1)/2) * 14;
            const b=new Bullet(bx, this.y-this.size*2, this.getAtk(), 1+this.bonusPierce);
            game.bullets.push(b);
        }
    }
    takeDamage(dmg) {
        if(this.invulnTimer>0||this.dead) return false;
        this.hp-=dmg;
        this.invulnTimer=0.3;
        if(this.hp<=0) {
            this.hp=0; this.dead=true;
        }
        return this.dead;
    }
    heal(amount) {
        this.hp=Math.min(this.getMaxHp(), this.hp+amount);
    }
    addXP(xp) {
        this.xp+=xp;
        while(this.xp>=this.getXpToNext()&&this.level<CFG.MAX_LEVEL) {
            this.xp-=this.getXpToNext();
            this.level++;
            this.onLevelUp();
        }
    }
    onLevelUp() {
        window._game.showLevelUp();
    }
    applyUpgrade(opt) {
        switch(opt.id) {
            case 'hp': this.maxHp+=20; this.heal(20); break;
            case 'atk': this.atk+=4; break;
            case 'atkSpd': this.atkSpd+=this.atkSpd*0.15; break;
            case 'spd': this.spd+=0.5; break;
            case 'bullet': this.bonusPierce+=1; break;
            case 'multi': this.bonusBullets+=1; break;
            case 'heal': this.heal(Math.floor(this.getMaxHp()*0.5)); break;
            case 'skillDmg': this.bonusSkillDmg+=1; break;
            case 'skillCd': this.bonusSkillCd+=1; break;
        }
    }
    draw(ctx) {
        if(this.dead) return;
        if(this.invulnTimer>0&&Math.floor(this.invulnTimer*20)%2===0) return;
        const drawSize=this.size*6.0;
        // 移动时倾斜
        const tilt=this.moveDir*0.15;
        // 空闲时上下浮动
        const idleBob=this.moveDir===0?Math.sin(this.animTimer*3)*2:0;
        ctx.save();
        ctx.translate(this.x, this.y+idleBob);
        ctx.rotate(tilt);
        if (this.sprite) {
            // 使用完整精灵图，不再分割帧
            const asp=this.sprite.width/this.sprite.height;
            let dw=drawSize, dh=drawSize;
            if(asp>1) dh=drawSize/asp; else dw=drawSize*asp;
            ctx.drawImage(this.sprite, -dw/2, -dh/2, dw, dh);
        } else {
            // 回退绘制
            const grad=ctx.createRadialGradient(0,-5,5,0,0,this.size*1.5);
            grad.addColorStop(0,'#ffcc00'); grad.addColorStop(0.6,'#cc8800'); grad.addColorStop(1,'rgba(150,80,0,0)');
            ctx.fillStyle=grad;
            ctx.beginPath(); ctx.arc(0,0,this.size*1.2,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-8,6,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
        // 底部光环
        ctx.fillStyle='rgba(255,200,0,0.2)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y+this.size*1.5+idleBob, this.size*1.2, 6, 0, 0, Math.PI*2); ctx.fill();
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
                this.touchX=e.touches[0].clientX;
            },{passive:false});
            canvas.addEventListener('touchend',e=>{ e.preventDefault(); this.touchActive=false; },{passive:false});
            canvas.addEventListener('touchcancel',e=>{ this.touchActive=false; });
            canvas.addEventListener('mousedown',e=>{
                this.touchActive=true; this.touchX=e.clientX;
            });
            window.addEventListener('mousemove',e=>{
                if(this.touchActive) this.touchX=e.clientX;
            });
            window.addEventListener('mouseup',()=>{ this.touchActive=false; });
        }
    },
    getTargetX(game) {
        if(this.touchActive) {
            const canvas=document.getElementById('gameCanvas');
            if(!canvas) return null;
            const rect=canvas.getBoundingClientRect();
            const relX=this.touchX-rect.left;
            const scale=rect.width/game.gameW;
            const worldX=relX/scale;
            return clamp(worldX, game.hero.size*2, game.gameW-game.hero.size*2);
        }
        return null;
    },
    getKeyboardDir() {
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
    } else if(waveNum<=10) {
        data.enemies.push({type:'slime', count:4+waveNum});
        data.enemies.push({type:'skeleton', count:3+(waveNum-5)*2});
        if(waveNum>=8) data.enemies.push({type:'demon', count:waveNum-7});
    } else if(waveNum<=15) {
        data.enemies.push({type:'slime', count:5+waveNum});
        data.enemies.push({type:'skeleton', count:5+(waveNum-10)*2});
        data.enemies.push({type:'demon', count:3+(waveNum-10)*2});
        if(waveNum>=14) data.enemies.push({type:'boss', count:1});
    } else {
        data.enemies.push({type:'slime', count:6+waveNum});
        data.enemies.push({type:'skeleton', count:8+(waveNum-15)*2});
        data.enemies.push({type:'demon', count:5+(waveNum-15)*2});
        data.enemies.push({type:'boss', count:waveNum>=18?2:1});
    }
    return data;
}

// ==================== 游戏主类 ====================
class Game {
    constructor(stageId) {
        this.stageCfg=CFG.STAGES.find(s=>s.id===stageId)||CFG.STAGES[0];
        this.gameW=480; this.gameH=800;
        this.canvas=document.getElementById('gameCanvas');
        this.ctx=this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', ()=>this.resize());
        // 状态
        this.enemies=[]; this.bullets=[]; this.particles=[];
        this.fireballs=[]; this.iceSwords=[];
        this.running=false; this.paused=false;
        this.currentWave=0; this.waveEnemies=[]; this.waveActive=false;
        this.waveSpawnTimer=0; this.waveSpawnInterval=0.5;
        this.kills=0; this.score=0; this.goldEarned=0;
        this.screenShake=0; this.flashAlpha=0; this._pendingWave=false;
        this.gameOver=false; this.victory=false;
        this.village=new Village(this.stageCfg.villageHp);
        this.hero=new Hero(this.gameW, this.gameH);
        this.hero.maxHp=this.hero.getMaxHp(); this.hero.hp=this.hero.maxHp;
        this.setupUI();
        this.showWaveTransition();
        this.lastTime=0;
        this.gameLoop(0);
    }
    resize() {
        const maxW=Math.min(window.innerWidth, 520);
        const maxH=Math.min(window.innerHeight, 880);
        const scaleX=maxW/this.gameW;
        const scaleY=maxH/this.gameH;
        this.scale=Math.min(scaleX, scaleY);
        this.canvas.width=maxW;
        this.canvas.height=maxH;
        this.renderX=(maxW-this.gameW*this.scale)/2;
        this.renderY=(maxH-this.gameH*this.scale)/2;
    }
    setupUI() {
        document.getElementById('btnUpgrade').onclick=()=>this.showPermUpgrades();
        document.getElementById('btnSkill1').onclick=()=>this.useSkill('fire');
        document.getElementById('btnSkill2').onclick=()=>this.useSkill('ice');
        document.getElementById('btnPause').onclick=()=>this.togglePause();
        document.getElementById('btnWaveStart').onclick=()=>this.startWave();
        document.getElementById('btnResume').onclick=()=>this.togglePause();
        document.getElementById('btnQuit').onclick=()=>this.quitGame();
        document.getElementById('btnRetry').onclick=()=>this.restartGame();
        document.getElementById('btnVictory').onclick=()=>this.quitGame();
    }
    gameLoop(timestamp) {
        if(!this.running) return;
        const dt=Math.min(0.05, (timestamp-this.lastTime)/1000);
        this.lastTime=timestamp;
        if(!this.paused) this.update(dt);
        this.render();
        this.updateHUD();
        requestAnimationFrame(t=>this.gameLoop(t));
    }
    update(dt) {
        // 屏幕震动衰减
        if(this.screenShake>0) this.screenShake=Math.max(0,this.screenShake-dt*1.5);
        if(this.flashAlpha>0) this.flashAlpha=Math.max(0,this.flashAlpha-dt*2);
        const h=this.hero;
        // 英雄
        h.update(dt, this);
        // 村落
        this.village.update(dt);
        // 波次生成
        if(this.waveActive) {
            this.waveSpawnTimer-=dt;
            if(this.waveSpawnTimer<=0&&this.waveEnemies.length>0) {
                const entry=this.waveEnemies.shift();
                for(let j=0;j<entry.count;j++) {
                    const margin=40;
                    const ex=rand(margin, this.gameW-margin);
                    const e=new Enemy(entry.type, ex, -rand(20,80), this.stageCfg);
                    this.enemies.push(e);
                }
                this.waveSpawnTimer=this.waveSpawnInterval;
            }
            // 波次完成
            if(this.waveEnemies.length===0&&this.enemies.length===0&&this.fireballs.length===0&&this.iceSwords.length===0) {
                this.waveActive=false;
                if(this.currentWave>=CFG.MAX_WAVES) {
                    this.onVictory();
                } else {
                    setTimeout(()=>this.showWaveTransition(), 500);
                }
            }
        }
        // 子弹
        for(let i=this.bullets.length-1;i>=0;i--) {
            const b=this.bullets[i];
            b.update(dt);
            if(b.dead) { this.bullets.splice(i,1); continue; }
            for(let j=this.enemies.length-1;j>=0;j--) {
                const e=this.enemies[j];
                if(b.hit.has(e)) continue;
                if(dist(b,e)<(b.size*0.8+e.size*0.4)) {
                    b.hit.add(e);
                    const killed=e.takeDamage(b.damage, this);
                    if(killed) {
                        this.enemies.splice(j,1);
                    }
                    if(b.hit.size>=b.pierce) {
                        b.dead=true; break;
                    }
                }
            }
        }
        // 清理标记死亡的子弹
        for(let i=this.bullets.length-1;i>=0;i--) {
            if(this.bullets[i].dead) this.bullets.splice(i,1);
        }
        // 敌人
        for(let i=this.enemies.length-1;i>=0;i--) {
            const e=this.enemies[i];
            e.update(dt);
            if(e.dead) { this.enemies.splice(i,1); continue; }
            // 碰到底线 - 攻击村落
            if(e.hasReachedBottom(this.gameH)) {
                const destroyed=this.village.takeDamage(e.villageDmg);
                e.dead=true;
                this.enemies.splice(i,1);
                // 碰底粒子
                for(let j=0;j<8;j++) {
                    this.particles.push(new Particle(e.x,this.gameH-20,{
                        vx:rand(-3,3), vy:rand(-4,0), color:'#ff4444', life:0.4, size:rand(2,5)
                    }));
                }
                if(this.village.hp<=0) {
                    this.onGameOver();
                    return;
                }
            }
        }
        // 碰撞检测 - 敌人撞英雄
        for(let i=this.enemies.length-1;i>=0;i--) {
            const e=this.enemies[i];
            if(dist(e,h)<(e.size*0.4+h.size*1.2)) {
                const heroDead=h.takeDamage(e.damage);
                if(heroDead) {
                    this.onGameOver();
                    return;
                }
            }
        }
        // 火球
        for(let i=this.fireballs.length-1;i>=0;i--) {
            this.fireballs[i].update(dt, this);
            if(this.fireballs[i].dead) this.fireballs.splice(i,1);
        }
        // 冰剑
        for(let i=this.iceSwords.length-1;i>=0;i--) {
            this.iceSwords[i].update(dt, this);
            if(this.iceSwords[i].dead) this.iceSwords.splice(i,1);
        }
        // 粒子
        for(let i=this.particles.length-1;i>=0;i--) {
            this.particles[i].update(dt);
            if(this.particles[i].dead) this.particles.splice(i,1);
        }
        // 检查英雄死亡
        if(h.dead) {
            this.onGameOver();
            return;
        }
        // 弹药限制
        if(this.bullets.length>300) this.bullets.splice(0,100);
        if(this.particles.length>200) this.particles.splice(0,50);
    }
    render() {
        const ctx=this.ctx;
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        ctx.fillStyle='#0a0a1a';
        ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        // 屏幕震动
        let shakeX=0, shakeY=0;
        if(this.screenShake>0) {
            shakeX=rand(-5,5)*this.screenShake*8;
            shakeY=rand(-4,4)*this.screenShake*8;
        }
        ctx.save();
        ctx.translate(this.renderX+shakeX, this.renderY+shakeY);
        ctx.scale(this.scale, this.scale);
        // 背景 - 使用关卡专属背景
        const bgKey=this.stageCfg.bgKey||'bg_grassland';
        const bgImg=Assets.getRaw(bgKey);
        if(bgImg&&bgImg.complete) {
            ctx.drawImage(bgImg, 0, 0, this.gameW, this.gameH);
            ctx.fillStyle='rgba(0,0,0,0.2)';
            ctx.fillRect(0,0,this.gameW,this.gameH);
        } else {
            ctx.fillStyle='#1a2a1a';
            ctx.fillRect(0,0,this.gameW,this.gameH);
        }
        // 底部防线
        ctx.strokeStyle='rgba(255,80,80,0.3)'; ctx.lineWidth=2;
        ctx.setLineDash([10,5]);
        ctx.beginPath(); ctx.moveTo(0,this.gameH-20); ctx.lineTo(this.gameW,this.gameH-20); ctx.stroke();
        ctx.setLineDash([]);
        // 村落
        this.village.setPosition(this.gameW/2, this.gameH-50);
        this.village.draw(ctx);
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
        // 全屏闪光
        if(this.flashAlpha>0) {
            ctx.fillStyle=`rgba(255,200,100,${this.flashAlpha})`;
            ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
        // 波次提示
        if(this.waveActive) {
            ctx.fillStyle='#ffcc00'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
            ctx.fillText('第 '+this.currentWave+' 波', this.canvas.width/2, 30);
            ctx.textAlign='start';
        }
    }
    updateHUD() {
        const h=this.hero;
        document.getElementById('hudWave').textContent=this.currentWave+'/'+CFG.MAX_WAVES;
        document.getElementById('hudKills').textContent=this.kills;
        document.getElementById('hudGold').textContent=this.goldEarned;
        document.getElementById('hudLevel').textContent=h.level;
        const xpR=h.xp/h.getXpToNext();
        document.getElementById('hudXpFill').style.width=(xpR*100)+'%';
        const maxHp=h.getMaxHp();
        const hpR=h.hp/maxHp;
        document.getElementById('hudHpFill').style.width=(hpR*100)+'%';
        document.getElementById('hudHpText').textContent=Math.ceil(h.hp)+'/'+maxHp;
        // 村落血量
        document.getElementById('hudVillageHp').textContent=Math.ceil(this.village.hp)+'/'+this.village.maxHp;
        document.getElementById('hudVillageFill').style.width=(this.village.hp/this.village.maxHp*100)+'%';
        // 技能冷却
        const cd1=h.skillCooldowns.fire;
        const cd2=h.skillCooldowns.ice;
        document.getElementById('skillCd1').textContent=cd1>0?Math.ceil(cd1)+'s':'';
        document.getElementById('skillCd2').textContent=cd2>0?Math.ceil(cd2)+'s':'';
        document.getElementById('btnSkill1').classList.toggle('on-cd', cd1>0);
        document.getElementById('btnSkill2').classList.toggle('on-cd', cd2>0);
    }
    showWaveTransition() {
        if(!document.getElementById('levelUpScreen').classList.contains('hidden')) {
            this._pendingWave=true;
            return;
        }
        this._pendingWave=false;
        this.paused=true;
        this.currentWave++;
        const data=getWaveData(this.currentWave);
        this.waveEnemies=[];
        // 随机打乱
        const shuffled=[...data.enemies].sort(()=>Math.random()-0.5);
        for(const e of shuffled) {
            this.waveEnemies.push({...e});
        }
        this.waveSpawnTimer=0.3;
        this.waveSpawnInterval=Math.max(0.2, 0.5-(this.currentWave-1)*0.015);
        document.getElementById('waveNum').textContent=this.currentWave;
        const preview=document.getElementById('wavePreview');
        preview.innerHTML='';
        for(const e of data.enemies) {
            const tag=document.createElement('span');
            tag.className='enemy-tag';
            tag.textContent=CFG.ENEMY_TYPES[e.type].name+' x'+e.count;
            preview.appendChild(tag);
        }
        document.getElementById('waveScreen').classList.remove('hidden');
    }
    startWave() {
        document.getElementById('waveScreen').classList.add('hidden');
        this.waveActive=true;
        this.paused=false;
    }
    addXP(xp) {
        this.hero.addXP(xp);
    }
    showLevelUp() {
        this.paused=true;
        const options=this.generateLevelUpOptions();
        const container=document.getElementById('levelUpOptions');
        container.innerHTML='';
        options.forEach(opt=>{
            const div=document.createElement('div');
            div.className='level-option';
            div.innerHTML='<div class="lo-name">'+opt.name+'</div><div class="lo-desc">'+opt.desc+'</div>';
            div.onclick=()=>{
                this.hero.applyUpgrade(opt);
                document.getElementById('levelUpScreen').classList.add('hidden');
                if(this._pendingWave) {
                    this._pendingWave=false;
                    this.showWaveTransition();
                } else {
                    this.paused=false;
                }
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
    useSkill(type) {
        const h=this.hero;
        if(h.dead||h.skillCooldowns[type]>0) return;
        const cfg=CFG.SKILLS[type];
        const dmgMul=h.getSkillDmgMul();
        h.skillCooldowns[type]=h.getSkillCd(type);
        if(type==='fire') {
            const count=cfg.fireballs+Math.floor(h.bonusSkillDmg*5);
            for(let i=0;i<count;i++) {
                this.fireballs.push(new Fireball(
                    rand(20,this.gameW-20), -rand(20,80),
                    Math.floor(cfg.damage*dmgMul), this.gameH
                ));
            }
        } else if(type==='ice') {
            const count=cfg.swords+Math.floor(h.bonusSkillDmg*3);
            const spreadAngle=Math.PI*0.7;
            const startAngle=-Math.PI/2-spreadAngle/2;
            for(let i=0;i<count;i++) {
                const a=startAngle+(i/(Math.max(1,count-1)))*spreadAngle;
                const spd=rand(3.5,5.5);
                this.iceSwords.push(new IceSword(h.x, h.y, Math.cos(a)*spd, Math.sin(a)*spd, Math.floor(cfg.damage*dmgMul)));
            }
        }
    }
    togglePause() {
        if(this.gameOver||this.victory) return;
        this.paused=!this.paused;
        document.getElementById('pauseScreen').classList.toggle('hidden', !this.paused);
    }
    onGameOver() {
        this.running=false;
        this.paused=true;
        DB.addGold(this.goldEarned);
        if(this.currentWave>DB.data.highWave) { DB.data.highWave=this.currentWave; DB.save(); }
        DB.data.totalKills+=this.kills; DB.save();
        document.getElementById('goWave').textContent=this.currentWave;
        document.getElementById('goKills').textContent=this.kills;
        document.getElementById('goGold').textContent=this.goldEarned;
        document.getElementById('goVillage').textContent=this.village.hp<=0?'村落被摧毁':'英雄阵亡';
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    onVictory() {
        this.running=false;
        this.paused=true;
        DB.addGold(this.goldEarned);
        DB.data.totalKills+=this.kills; DB.save();
        if(this.currentWave>DB.data.highWave) { DB.data.highWave=this.currentWave; DB.save(); }
        document.getElementById('vicGold').textContent=this.goldEarned;
        document.getElementById('victoryScreen').classList.remove('hidden');
    }
    quitGame() {
        this.running=false;
        location.reload();
    }
    restartGame() {
        this.running=false;
        document.getElementById('gameOverScreen').classList.add('hidden');
        window._game = new Game(this.stageCfg.id);
    }
    // 英雄强化
    showPermUpgrades() {
        const container=document.getElementById('upgradeList');
        container.innerHTML='';
        for(const k in CFG.PERM_UPGRADES) {
            const cfg=CFG.PERM_UPGRADES[k];
            const lv=DB.getPermLv(k);
            const cost=DB.getPermCost(k);
            const maxed=lv>=cfg.maxLv;
            const div=document.createElement('div');
            div.className='upgrade-item';
            div.innerHTML='<div class="up-name">'+cfg.name+' Lv.'+lv+'/'+cfg.maxLv+'</div><div class="up-desc">'+cfg.desc+'</div><div class="up-cost">'+ (maxed?'已满级':cost+' 金币')+'</div>';
            if(!maxed) {
                div.onclick=()=>{
                    if(DB.upgradePerm(k)) {
                        div.querySelector('.up-cost').textContent='已升级!';
                        setTimeout(()=>this.showPermUpgrades(), 300);
                    }
                };
            }
            container.appendChild(div);
        }
        document.getElementById('upgradeGold').textContent=DB.getGold();
        document.getElementById('upgradeScreen').classList.remove('hidden');
        document.getElementById('btnCloseUpgrade').onclick=()=>{
            document.getElementById('upgradeScreen').classList.add('hidden');
            this.updateMenuStats();
        };
    }
    updateMenuStats() {
        document.getElementById('mHighWave').textContent=DB.data.highWave;
        document.getElementById('mGold').textContent=DB.getGold();
        document.getElementById('mKills').textContent=DB.data.totalKills;
    }
}

// ==================== GM ====================
const GM = {
    show() { document.getElementById('gmScreen').classList.remove('hidden'); },
    hide() {
        document.getElementById('gmScreen').classList.add('hidden');
        if(window._game) window._game.updateMenuStats();
    },
    setGold() {
        const val=parseInt(document.getElementById('gmGoldInput').value)||0;
        DB.data.gold=val; DB.save();
        if(window._game) window._game.updateMenuStats();
    },
    addGold() { DB.data.gold+=99999; DB.save(); if(window._game) window._game.updateMenuStats(); },
    reset() { if(confirm('确定重置所有数据?')) { DB.resetAll(); if(window._game) window._game.updateMenuStats(); } },
    maxUpgrades() { DB.maxAll(); if(window._game) window._game.updateMenuStats(); },
};

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', ()=>{
    DB.init();
    Input.init();
    // 主菜单
    document.getElementById('mHighWave').textContent=DB.data.highWave;
    document.getElementById('mGold').textContent=DB.getGold();
    document.getElementById('mKills').textContent=DB.data.totalKills;
    // 关卡按钮
    const stageGrid=document.getElementById('stageGrid');
    CFG.STAGES.forEach(stage=>{
        const div=document.createElement('div');
        div.className='stage-btn'+(DB.data.unlockedStages.includes(stage.id)?'':' locked');
        div.innerHTML='<span class="st-num">'+stage.id+'</span><span class="st-name">'+stage.name+'</span>';
        div.onclick=()=>{
            if(!DB.data.unlockedStages.includes(stage.id)) return;
            document.getElementById('mainMenu').style.display='none';
            document.getElementById('gameScreen').style.display='block';
            window._game = new Game(stage.id);
        };
        stageGrid.appendChild(div);
    });
    // GM
    document.getElementById('btnGM').onclick=()=>GM.show();
    document.getElementById('btnCloseGM').onclick=()=>GM.hide();
    document.getElementById('btnGMSet').onclick=()=>GM.setGold();
    document.getElementById('btnGMAdd').onclick=()=>GM.addGold();
    document.getElementById('btnGMReset').onclick=()=>GM.reset();
    document.getElementById('btnGMMax').onclick=()=>GM.maxUpgrades();
    // 加载
    Assets.loadAll().then(()=>{
        document.getElementById('loadOverlay').classList.add('load-done');
        setTimeout(()=>{
            const el=document.getElementById('loadOverlay');
            if(el) el.style.display='none';
        }, 600);
    });
});

})();