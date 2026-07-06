/**
 * ============================================
 * 亡灵骑士·夏侯惇 - 游戏引擎 v4.0
 * 45°上帝视角 | 亮色主题 | 视野内攻击 | 升级弹道
 * ============================================
 */
(function(){
'use strict';

// ==================== 绿幕抠图 ====================
const ChromaKey = {
    cache: {},
    processSoft(img, key) {
        if (this.cache[key + '_soft']) return this.cache[key + '_soft'];
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
        this.cache[key + '_soft'] = c;
        return c;
    },
    clear() { this.cache = {}; }
};

// ==================== 图片资源 ====================
const IMG = {
    player: 'assets/images/ai_player_sprite.jpg',
    enemies: {
        wraith: 'assets/images/ai_enemy_wraith.jpg',
        skeleton: 'assets/images/ai_enemy_skeleton.jpg',
        zombie: 'assets/images/ai_enemy_zombie.jpg',
        demon: 'assets/images/ai_enemy_demon.jpg',
        boss: 'assets/images/ai_enemy_boss.jpg',
    },
    bgTile: 'assets/images/ai_bg_tile.jpg',
    itemBomb: 'assets/images/ai_item_bomb.jpg',
    itemPower: 'assets/images/ai_item_power.jpg',
    itemHeal: 'assets/images/ai_item_heal.jpg',
};

// ==================== 性能上限 ====================
const LIMITS = {
    ENEMIES: 200, PARTICLES: 300, PICKUPS: 120, PROJECTILES: 400, SKILL_EFFECTS: 10,
};

// ==================== 配置 ====================
const CFG = {
    MAP_W: 3600, MAP_H: 3600,
    PLAYER_SPEED: 3.5, PLAYER_SIZE: 28,
    PLAYER_HP: 120, PLAYER_DAMAGE: 12,
    PLAYER_ATK_SPD: 1.2,
    XP_BASE: 40, XP_GROW: 1.45,
    MAX_LEVEL: 60,
    ENEMY_CHASE_RANGE: 350,
    ENEMY_WANDER_SPEED: 0.4,
    ENEMY_STUN_TIME: 3,
    ITEM_DROP_CHANCE: 0.08,
    // 攻击范围：仅视野内（屏幕范围+边距）
    ATTACK_RANGE_MARGIN: 60,
    ITEM_TYPES: {
        bomb: { name:'暗影炸弹', desc:'全屏爆炸伤害', img:IMG.itemBomb, skill:'bomb', cooldown:8 },
        power:{ name:'黑暗能量', desc:'全屏暗影爆发', img:IMG.itemPower, skill:'ult', cooldown:10 },
        heal: { name:'生命药水', desc:'恢复50%生命',  img:IMG.itemHeal, skill:'heal', cooldown:5 },
    },
    ENEMY_TYPES: {
        wraith:  { name:'怨灵',    hp:25, dmg:6,  spd:2.8, size:22, color:'#8b5cf6', xp:12,  gold:3,  chaseRange:280, wanderSpd:0.5 },
        skeleton:{ name:'骷髅兵',  hp:50, dmg:10, spd:1.8, size:24, color:'#c8c8c8', xp:20,  gold:5,  chaseRange:320, wanderSpd:0.35 },
        zombie:  { name:'僵尸',    hp:90, dmg:15, spd:1.0, size:28, color:'#4a7a3a', xp:30,  gold:8,  chaseRange:250, wanderSpd:0.25 },
        demon:   { name:'恶魔',    hp:300,dmg:25, spd:2.2, size:32, color:'#cc3333', xp:100, gold:25, chaseRange:380, wanderSpd:0.4 },
        boss:    { name:'妖将',    hp:800,dmg:40, spd:1.2, size:50, color:'#ff4444', xp:500, gold:100,chaseRange:500, wanderSpd:0.2 },
    },
    WEAPONS: {
        soulBlade:   { name:'灵魂之刃',   desc:'近战弧形斩击',   maxLv:6, color:'#c8a84e', rarity:'common' },
        shadowBolt:  { name:'暗影弹幕',   desc:'自动发射暗影弹', maxLv:6, color:'#8b5cf6', rarity:'common' },
        deathAura:   { name:'死亡光环',   desc:'周围持续伤害',   maxLv:6, color:'#cc3333', rarity:'uncommon' },
        hellfire:    { name:'冥火风暴',   desc:'随机范围火焰',   maxLv:6, color:'#ff6600', rarity:'uncommon' },
        lightning:   { name:'冥雷链',     desc:'连锁闪电攻击',   maxLv:6, color:'#ffcc00', rarity:'rare' },
        frostNova:   { name:'冰霜新星',   desc:'周期性冰冻爆发', maxLv:6, color:'#66ccff', rarity:'rare' },
    },
    PERM_UPGRADES: {
        maxHp:  { name:'生命强化', desc:'+10 最大生命', baseCost:80,  costMul:1.4, maxLv:20 },
        damage:{ name:'攻击强化', desc:'+2 基础伤害',  baseCost:100, costMul:1.4, maxLv:20 },
        speed: { name:'速度强化', desc:'+0.2 移动速度',baseCost:120, costMul:1.4, maxLv:15 },
        atkSpd:{ name:'攻速强化', desc:'+8% 攻击速度', baseCost:90,  costMul:1.4, maxLv:15 },
        armor: { name:'护甲强化', desc:'+1 伤害减免',  baseCost:150, costMul:1.5, maxLv:12 },
        magnet:{ name:'磁铁强化', desc:'+15% 拾取范围',baseCost:100, costMul:1.3, maxLv:10 },
    },
    LEVEL_OPTIONS: [
        { type:'stat', id:'maxHp',    name:'生命强化',   desc:'+15 最大生命值',  weight:13 },
        { type:'stat', id:'maxHp2',   name:'生命强化+',  desc:'+25 最大生命值',  weight:7 },
        { type:'stat', id:'damage',   name:'攻击强化',   desc:'+3 基础伤害',     weight:13 },
        { type:'stat', id:'damage2',  name:'攻击强化+',  desc:'+6 基础伤害',     weight:7 },
        { type:'stat', id:'speed',    name:'速度提升',   desc:'+0.25 移动速度',  weight:10 },
        { type:'stat', id:'atkSpd',   name:'攻速提升',   desc:'+10% 攻击速度',   weight:10 },
        { type:'stat', id:'armor',    name:'护甲提升',   desc:'+1 伤害减免',     weight:8 },
        { type:'stat', id:'magnet',   name:'磁铁范围',   desc:'+20% 拾取范围',   weight:6 },
        { type:'stat', id:'heal',     name:'即时治疗',   desc:'恢复35%最大生命',  weight:8 },
        { type:'stat', id:'projectile', name:'弹道增加', desc:'+1 额外弹道数',    weight:10 },
        { type:'weapon', id:'newWeapon', name:'新武器',  desc:'获得一件新武器',   weight:6 },
        { type:'weapon', id:'upgradeWeapon', name:'武器升级', desc:'随机武器升1级',weight:8 },
    ],
};

// ==================== 图片加载器 ====================
const Assets = {
    loaded: {}, total: 0, count: 0,
    loadAll() {
        const urls = [];
        urls.push({key:'player', url:IMG.player});
        for(const [k,v] of Object.entries(IMG.enemies)) urls.push({key:'enemy_'+k, url:v});
        urls.push({key:'bgTile', url:IMG.bgTile});
        urls.push({key:'itemBomb', url:IMG.itemBomb});
        urls.push({key:'itemPower', url:IMG.itemPower});
        urls.push({key:'itemHeal', url:IMG.itemHeal});
        this.total = urls.length;
        return Promise.all(urls.map(item=>this.loadImage(item.key, item.url)));
    },
    loadImage(key, url) {
        return new Promise((resolve)=>{
            const img = new Image();
            img.onload = ()=>{
                this.loaded[key]=img;
                if (key === 'player' || key.startsWith('enemy_') || key.startsWith('item')) {
                    ChromaKey.processSoft(img, key);
                }
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
        return ChromaKey.processSoft(img, key);
    },
    progress() { return this.total>0?this.count/this.total:0; },
};

// ==================== 存档系统 ====================
const DB = {
    key: 'undead_knight_save',
    data: null,
    defaults: {
        gold: 0, highScore: 0, totalKills: 0, totalGames: 0,
        permUpgrades: { maxHp:0, damage:0, speed:0, atkSpd:0, armor:0, magnet:0 },
        unlockedWeapons: ['soulBlade'],
    },
    init() {
        try {
            const raw = localStorage.getItem(this.key);
            this.data = raw ? Object.assign({}, this.defaults, JSON.parse(raw)) : Object.assign({}, this.defaults);
            if (!this.data.permUpgrades) this.data.permUpgrades = Object.assign({}, this.defaults.permUpgrades);
            if (!this.data.unlockedWeapons) this.data.unlockedWeapons = ['soulBlade'];
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
    resetAll() { this.data = Object.assign({}, this.defaults); this.save(); },
    maxAll() { for(let k in CFG.PERM_UPGRADES) this.data.permUpgrades[k] = CFG.PERM_UPGRADES[k].maxLv; this.data.unlockedWeapons = Object.keys(CFG.WEAPONS); this.save(); },
};

// ==================== 工具函数 ====================
function dist(a,b) { const dx=a.x-b.x,dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }
function angle(a,b) { return Math.atan2(b.y-a.y, b.x-a.x); }
function rand(min,max) { return Math.random()*(max-min)+min; }
function randInt(min,max) { return Math.floor(rand(min,max+1)); }
function clamp(v,min,max) { return Math.max(min,Math.min(max,v)); }
function lerp(a,b,t) { return a+(b-a)*t; }

// ==================== 粒子系统 ====================
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
    draw(ctx, cam) {
        const a=this.life/this.maxLife;
        ctx.globalAlpha=a; ctx.fillStyle=this.color;
        ctx.beginPath(); ctx.arc(this.x-cam.x, this.y-cam.y, this.size*a, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
    }
}

// ==================== 投射物 ====================
class Projectile {
    constructor(x,y,vx,vy,damage,size,color,pierce=1) {
        this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.damage=damage; this.size=size;
        this.color=color; this.pierce=pierce; this.hit=new Set(); this.dead=false;
        this.trail=[];
    }
    update(dt) {
        this.x+=this.vx*60*dt; this.y+=this.vy*60*dt;
        if(this.trail.length===0||dist(this,this.trail[this.trail.length-1])>5)
            this.trail.push({x:this.x,y:this.y,life:0.15});
        for(let i=this.trail.length-1;i>=0;i--) {
            this.trail[i].life-=dt; if(this.trail[i].life<=0) this.trail.splice(i,1);
        }
        if(this.x<0||this.x>CFG.MAP_W||this.y<0||this.y>CFG.MAP_H) this.dead=true;
    }
    draw(ctx, cam) {
        for(const t of this.trail) {
            ctx.globalAlpha=t.life/0.15*0.5;
            ctx.fillStyle=this.color;
            ctx.beginPath(); ctx.arc(t.x-cam.x, t.y-cam.y, this.size*0.6, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(this.x-cam.x, this.y-cam.y, this.size/2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
    }
}

// ==================== 敌人 ====================
class Enemy {
    constructor(type, x, y, difficulty=1) {
        const cfg = CFG.ENEMY_TYPES[type];
        this.type=type; this.x=x; this.y=y; this.name=cfg.name;
        this.maxHp=Math.floor(cfg.hp*difficulty); this.hp=this.maxHp;
        this.damage=Math.floor(cfg.dmg*difficulty); this.baseSpd=cfg.spd;
        this.spd=cfg.spd; this.size=cfg.size; this.color=cfg.color;
        this.xpVal=cfg.xp; this.goldVal=cfg.gold;
        this.dead=false; this.slowTimer=0; this.hitFlash=0;
        this.anim=Math.random()*Math.PI*2;
        this.stunTimer=0;
        this.state='idle';
        this.wanderTarget={x:x+rand(-100,100), y:y+rand(-100,100)};
        this.wanderTimer=rand(1,3);
        this.chaseRange=cfg.chaseRange||300;
        this.wanderSpd=cfg.wanderSpd||0.3;
        this.animFrame=0; this.animTimer=0;
        this.sprite=Assets.getSprite('enemy_'+type);
    }
    update(dt, player) {
        if(this.dead) return;
        if(this.slowTimer>0) { this.spd=this.baseSpd*0.4; this.slowTimer-=dt; }
        else this.spd=this.baseSpd;
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        if(this.stunTimer>0) {
            this.stunTimer-=dt;
            this.state='stun';
            return;
        }
        this.animTimer+=dt;
        if(this.animTimer>0.2) { this.animTimer=0; this.animFrame=(this.animFrame+1)%4; }
        const d=dist(this,player);
        if(d<this.chaseRange) {
            this.state='chase';
        } else if(this.state==='chase') {
            this.state='wander';
            this.wanderTarget={x:this.x+rand(-200,200), y:this.y+rand(-200,200)};
            this.wanderTimer=rand(2,4);
        }
        if(this.state==='chase') {
            if(d>1) {
                const spd=this.spd*60*dt;
                this.x+=(player.x-this.x)/d*spd;
                this.y+=(player.y-this.y)/d*spd;
            }
        } else if(this.state==='wander') {
            this.wanderTimer-=dt;
            const wd=dist(this,this.wanderTarget);
            if(wd<10||this.wanderTimer<=0) {
                this.wanderTarget={x:this.x+rand(-200,200), y:this.y+rand(-200,200)};
                this.wanderTimer=rand(2,5);
            } else {
                const wSpd=this.baseSpd*this.wanderSpd*60*dt;
                this.x+=(this.wanderTarget.x-this.x)/wd*wSpd;
                this.y+=(this.wanderTarget.y-this.y)/wd*wSpd;
            }
        }
        this.x=clamp(this.x,20,CFG.MAP_W-20);
        this.y=clamp(this.y,20,CFG.MAP_H-20);
    }
    takeDamage(dmg, game) {
        this.hp-=dmg; this.hitFlash=0.1;
        this.stunTimer=CFG.ENEMY_STUN_TIME;
        this.state='stun';
        if(this.hp<=0) { this.die(game); return true; }
        return false;
    }
    die(game) {
        this.dead=true;
        game.spawnXP(this.x,this.y,this.xpVal);
        game.spawnGold(this.x,this.y,this.goldVal);
        game.kills++; game.score+=this.xpVal;
        if(Math.random()<CFG.ITEM_DROP_CHANCE) {
            const itemTypes=['bomb','power','heal'];
            game.spawnItem(this.x,this.y,itemTypes[randInt(0,itemTypes.length-1)]);
        }
        for(let i=0;i<12;i++) {
            game.particles.push(new Particle(this.x,this.y,{
                vx:Math.cos(i/12*Math.PI*2)*rand(1,4),
                vy:Math.sin(i/12*Math.PI*2)*rand(1,4),
                color:this.color, life:0.5, size:rand(2,5)
            }));
        }
    }
    draw(ctx, cam, player) {
        const sx=this.x-cam.x, sy=this.y-cam.y;
        const floatY=Math.sin(Date.now()/300+this.anim)*2;
        const drawSize=this.size*2.5;
        if (this.sprite) {
            ctx.save();
            ctx.translate(sx, sy+floatY);
            if (player) {
                const enemyAngle = Math.atan2(player.y - this.y, player.x - this.x);
                ctx.rotate(enemyAngle - Math.PI/2);
            }
            const eAspect = this.sprite.width / this.sprite.height;
            let edw = drawSize, edh = drawSize;
            if (eAspect > 1) edh = drawSize / eAspect;
            else edw = drawSize * eAspect;
            if (this.hitFlash>0) {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(this.sprite, -edw/2, -edh/2, edw, edh);
                ctx.globalAlpha = 1;
            } else {
                ctx.drawImage(this.sprite, -edw/2, -edh/2, edw, edh);
            }
            ctx.restore();
        } else {
            const color=this.hitFlash>0?'#fff':this.color;
            ctx.fillStyle=color;
            ctx.beginPath();
            if(this.type==='boss') {
                ctx.moveTo(sx,sy-this.size/2-floatY);
                ctx.lineTo(sx+this.size/2,sy+floatY);
                ctx.lineTo(sx,sy+this.size/2-floatY);
                ctx.lineTo(sx-this.size/2,sy+floatY);
            } else {
                ctx.arc(sx,sy+floatY,this.size/2,0,Math.PI*2);
            }
            ctx.fill();
            ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.stroke();
            this.drawEyes(ctx,sx,sy+floatY);
        }
        // 眩晕指示器
        if(this.stunTimer>0) {
            ctx.fillStyle='rgba(255,255,0,0.25)';
            ctx.beginPath(); ctx.arc(sx,sy+floatY,drawSize/2+4,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#fff'; ctx.font='10px sans-serif'; ctx.textAlign='center';
            ctx.fillText('\u7729\u6655 '+this.stunTimer.toFixed(1)+'s', sx, sy-drawSize/2-8);
            ctx.textAlign='start';
        }
        if(this.slowTimer>0) {
            ctx.strokeStyle='rgba(100,200,255,0.6)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(sx,sy+floatY,this.size/2+6,0,Math.PI*2); ctx.stroke();
        }
        const hpR=this.hp/this.maxHp;
        const bw=this.size*1.2; const bh=3; const by=sy-this.size/2-12;
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(sx-bw/2,by,bw,bh);
        ctx.fillStyle=hpR>0.3?'#4a4':'#c44'; ctx.fillRect(sx-bw/2,by,bw*hpR,bh);
    }
    drawEyes(ctx,sx,sy) {
        ctx.fillStyle='#fff';
        const es=this.type==='boss'?5:3;
        ctx.beginPath(); ctx.arc(sx-es,sy-es*0.5,es,0,Math.PI*2); ctx.arc(sx+es,sy-es*0.5,es,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#000';
        ctx.beginPath(); ctx.arc(sx-es,sy-es*0.5,es*0.5,0,Math.PI*2); ctx.arc(sx+es,sy-es*0.5,es*0.5,0,Math.PI*2); ctx.fill();
    }
}

// ==================== 拾取物 ====================
class Pickup {
    constructor(x,y,type,value) {
        this.x=x; this.y=y; this.type=type; this.value=value;
        this.size=type==='gold'?10:type==='item'?16:12; this.dead=false;
        this.life=type==='item'?15:25; this.anim=rand(0,Math.PI*2);
        this.sprite=null;
        if (type==='item') {
            const imgKey='item'+(value==='bomb'?'Bomb':value==='power'?'Power':'Heal');
            this.sprite=Assets.getSprite(imgKey);
        }
    }
    update(dt, player, magnetRange, game) {
        this.life-=dt; if(this.life<=0) { this.dead=true; return; }
        if(this.life<5&&this.type!=='item') this.dead=true;
        const d=dist(this,player);
        if(d<magnetRange) {
            const spd=300;
            const a=angle(this,player);
            this.x+=Math.cos(a)*spd*dt;
            this.y+=Math.sin(a)*spd*dt;
        }
        if(d<player.size+15) {
            if(this.type==='xp') player.gainXP(this.value);
            else if(this.type==='gold') { game.collectedGold+=this.value; }
            else if(this.type==='item') { game.collectItem(this.value); }
            this.dead=true;
        }
    }
    draw(ctx, cam) {
        const sx=this.x-cam.x, sy=this.y-cam.y;
        const floatY=Math.sin(Date.now()/200+this.anim)*3;
        if (this.sprite) {
            const s=18;
            ctx.drawImage(this.sprite, sx-s, sy-s+floatY, s*2, s*2);
        } else {
            ctx.fillStyle=this.type==='xp'?'#4f4':this.type==='item'?'#c8a84e':'#fc0';
            ctx.shadowColor=this.type==='xp'?'#4f4':this.type==='item'?'#c8a84e':'#fc0';
            ctx.shadowBlur=8;
            ctx.beginPath(); ctx.arc(sx,sy+floatY,this.size/2,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0;
            ctx.fillStyle='#fff'; ctx.font='9px sans-serif'; ctx.textAlign='center';
            ctx.fillText(this.type==='xp'?'XP':this.type==='item'?'*':'$',sx,sy+floatY+3);
            ctx.textAlign='start';
        }
        if(this.type==='item') {
            ctx.strokeStyle='rgba(200,168,78,0.6)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(sx,sy+floatY,this.size/2+3,0,Math.PI*2); ctx.stroke();
        }
    }
}

// ==================== 全屏技能特效 ====================
class SkillEffect {
    constructor(type) {
        this.type=type; this.timer=0; this.duration=1.2; this.dead=false;
        this.scale=0; this.alpha=1;
    }
    update(dt, game) {
        this.timer+=dt;
        this.scale=Math.min(1, this.timer/0.3);
        if(this.timer>this.duration*0.5) this.alpha=1-(this.timer-this.duration*0.5)/(this.duration*0.5);
        if(this.timer<0.5) {
            for(let i=0;i<3;i++) {
                const a=rand(0,Math.PI*2);
                const r=rand(0,Math.max(game.canvas.width,game.canvas.height)*0.7);
                game.particles.push(new Particle(
                    game.player.x+Math.cos(a)*r, game.player.y+Math.sin(a)*r,
                    {vx:rand(-2,2),vy:rand(-3,-1),color:this.type==='bomb'?'#ff6600':'#8b5cf6',life:0.8,size:rand(3,8)}
                ));
            }
        }
        if(this.timer>=this.duration) this.dead=true;
    }
    draw(ctx, cam) {
        const cx=window._game.player.x-cam.x, cy=window._game.player.y-cam.y;
        const maxR=Math.max(window._game.canvas.width,window._game.canvas.height)*0.8;
        const r=maxR*easeOut(this.scale);
        ctx.globalAlpha=this.alpha*0.5;
        const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        if(this.type==='bomb') {
            grad.addColorStop(0,'rgba(255,100,0,0.8)');
            grad.addColorStop(0.5,'rgba(255,50,0,0.4)');
            grad.addColorStop(0.8,'rgba(100,0,50,0.2)');
            grad.addColorStop(1,'rgba(0,0,0,0)');
        } else {
            grad.addColorStop(0,'rgba(139,92,246,0.8)');
            grad.addColorStop(0.5,'rgba(80,30,180,0.4)');
            grad.addColorStop(0.8,'rgba(30,0,80,0.2)');
            grad.addColorStop(1,'rgba(0,0,0,0)');
        }
        ctx.fillStyle=grad;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=this.alpha*0.8;
        ctx.strokeStyle=this.type==='bomb'?'#ffaa00':'#c0a0ff';
        ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.5,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
    }
}
function easeOut(t) { return 1-Math.pow(1-t,3); }

// ==================== 武器系统 ====================
class WeaponSystem {
    constructor() { this.weapons = {}; }
    hasWeapon(id) { return !!this.weapons[id]; }
    getLevel(id) { return this.weapons[id]?this.weapons[id].level:0; }
    addWeapon(id) {
        if(this.weapons[id]) {
            if(this.weapons[id].level>=CFG.WEAPONS[id].maxLv) return false;
            this.weapons[id].level++;
        } else { this.weapons[id]={level:1}; }
        return true;
    }
    getWeaponIds() { return Object.keys(this.weapons); }
    getUpgradeableWeapons() {
        return Object.keys(this.weapons).filter(id=>this.weapons[id].level<CFG.WEAPONS[id].maxLv);
    }
    update(dt, player, game) {
        for(const [id, w] of Object.entries(this.weapons)) {
            const lv=w.level;
            switch(id) {
                case 'soulBlade': this.updateSoulBlade(dt,player,game,w,lv); break;
                case 'shadowBolt': this.updateShadowBolt(dt,player,game,w,lv); break;
                case 'deathAura': this.updateDeathAura(dt,player,game,w,lv); break;
                case 'hellfire': this.updateHellfire(dt,player,game,w,lv); break;
                case 'lightning': this.updateLightning(dt,player,game,w,lv); break;
                case 'frostNova': this.updateFrostNova(dt,player,game,w,lv); break;
            }
        }
    }
    // 获取额外弹道数
    getExtraProjectiles(player) {
        return player ? player.bonusProjectiles : 0;
    }
    updateSoulBlade(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0; w.cooldown-=dt;
        const cd=Math.max(0.3,1.2-lv*0.1);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const nearest=game.getNearestEnemyInViewport(player);
            if(!nearest) return;
            const a=angle(player,nearest);
            const arcCount=lv>=5?5:lv>=3?3:1;
            const spread=lv>=4?0.5:0.3;
            const extra = this.getExtraProjectiles(player);
            const total = arcCount + extra;
            for(let i=0;i<total;i++) {
                const aa=a+(i-Math.floor(total/2))*spread;
                const proj=new Projectile(
                    player.x+Math.cos(aa)*player.size,player.y+Math.sin(aa)*player.size,
                    Math.cos(aa)*10,Math.sin(aa)*10,player.getDamage()*(0.8+lv*0.3),16+lv*2,'#c8a84e',lv>=6?4:lv>=4?2:1
                );
                game.projectiles.push(proj);
            }
        }
    }
    updateShadowBolt(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0; w.cooldown-=dt;
        const cd=Math.max(0.3,0.9-lv*0.08);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const baseCount=lv>=5?6:lv>=3?4:2;
            const extra = this.getExtraProjectiles(player);
            const count = baseCount + extra;
            const baseAngle=Date.now()/1000*(lv>=4?2:1);
            for(let i=0;i<count;i++) {
                const a=baseAngle+(i/count)*Math.PI*2;
                game.projectiles.push(new Projectile(player.x,player.y,Math.cos(a)*8,Math.sin(a)*8,player.getDamage()*(0.5+lv*0.15),8+lv,'#8b5cf6',1));
            }
        }
    }
    updateDeathAura(dt, player, game, w, lv) {
        if(!w.timer) w.timer=0; w.timer-=dt;
        if(w.timer<=0) {
            w.timer=0.15;
            const radius=60+lv*12;
            game.enemies.forEach(e=>{
                if(!game.isInViewport(e)) return;
                if(dist(e,player)<radius) e.takeDamage(player.getDamage()*(0.3+lv*0.1)*dt*60,game);
            });
        }
        w.visualAngle=(w.visualAngle||0)+dt*2;
        for(let i=0;i<3+lv;i++) {
            const a=w.visualAngle+(i/(3+lv))*Math.PI*2;
            game.particles.push(new Particle(player.x+Math.cos(a)*(60+lv*12),player.y+Math.sin(a)*(60+lv*12),
                {vx:0,vy:0,color:'#cc3333',life:0.2,size:2+lv}));
        }
    }
    updateHellfire(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0; w.cooldown-=dt;
        const cd=Math.max(0.5,2.5-lv*0.3);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const baseCount=lv>=5?5:lv>=3?3:2;
            const extra = this.getExtraProjectiles(player);
            const count = baseCount + extra;
            for(let i=0;i<count;i++) {
                const tx=player.x+rand(-200,200),ty=player.y+rand(-200,200);
                const radius=30+lv*8;
                game.enemies.forEach(e=>{if(dist(e,{x:tx,y:ty})<radius) e.takeDamage(player.getDamage()*(0.8+lv*0.25),game);});
                for(let j=0;j<12;j++) game.particles.push(new Particle(tx+rand(-radius,radius),ty+rand(-radius,radius),
                    {vx:rand(-2,2),vy:rand(-4,-1),color:'#ff6600',life:0.6,size:rand(3,6)}));
            }
        }
    }
    updateLightning(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0; w.cooldown-=dt;
        const cd=Math.max(0.3,1.5-lv*0.15);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const baseCount=lv>=5?6:lv>=3?4:2;
            const extra = this.getExtraProjectiles(player);
            const chainCount = baseCount + extra;
            let last=player; const hit=new Set();
            for(let c=0;c<chainCount;c++) {
                let nearest=null,minD=250;
                game.enemies.forEach(e=>{if(hit.has(e))return;const d=dist(e,last);if(d<minD){minD=d;nearest=e;}});
                if(!nearest)break;
                hit.add(nearest); nearest.takeDamage(player.getDamage()*(0.6+lv*0.2),game);
                for(let i=0;i<6;i++) game.particles.push(new Particle(lerp(last.x,nearest.x,i/6),lerp(last.y,nearest.y,i/6),
                    {vx:0,vy:0,color:'#ffcc00',life:0.2,size:3}));
                last=nearest;
            }
        }
    }
    updateFrostNova(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0; w.cooldown-=dt;
        const cd=Math.max(0.8,5-lv*0.5);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const radius=80+lv*20;
            game.enemies.forEach(e=>{if(dist(e,player)<radius){e.takeDamage(player.getDamage()*(0.5+lv*0.2),game);e.slowTimer=1.5+lv*0.3;}});
            for(let i=0;i<20;i++){const a=rand(0,Math.PI*2),r=rand(0,radius);
                game.particles.push(new Particle(player.x+Math.cos(a)*r,player.y+Math.sin(a)*r,
                {vx:Math.cos(a)*rand(1,3),vy:Math.sin(a)*rand(1,3),color:'#66ccff',life:0.5,size:rand(2,5)}));}
        }
    }
}

// ==================== 玩家 ====================
class Player {
    constructor(permUpgrades) {
        this.x=CFG.MAP_W/2; this.y=CFG.MAP_H/2;
        this.maxHp=CFG.PLAYER_HP+permUpgrades.maxHp*10;
        this.hp=this.maxHp;
        this.baseDmg=CFG.PLAYER_DAMAGE+permUpgrades.damage*2;
        this.baseSpd=CFG.PLAYER_SPEED+permUpgrades.speed*0.2;
        this.baseAtkSpd=CFG.PLAYER_ATK_SPD+permUpgrades.atkSpd*0.08;
        this.armor=permUpgrades.armor;
        this.magnet=permUpgrades.magnet*0.15;
        this.size=CFG.PLAYER_SIZE;
        this.level=1; this.xp=0; this.xpToNext=CFG.XP_BASE;
        this.dead=false; this.invulnTimer=3; this.contactDmgTimer=0;
        this.bonusHp=0; this.bonusDmg=0; this.bonusSpd=0; this.bonusAtkSpd=0;
        this.bonusArmor=0; this.bonusMagnet=0;
        this.bonusProjectiles=0;
        this.weapons=new WeaponSystem(); this.weapons.addWeapon('soulBlade');
        this.facingDir=0; this.moveX=0; this.moveY=0;
        this.animFrame=0; this.animTimer=0; this.isMoving=false;
        this.sprite=Assets.getSprite('player');
    }
    getTotalHp() { return this.maxHp+this.bonusHp; }
    getDamage() { return this.baseDmg+this.bonusDmg; }
    getSpeed() { return this.baseSpd+this.bonusSpd; }
    getAtkSpd() { return this.baseAtkSpd*(1+this.bonusAtkSpd); }
    getTotalArmor() { return this.armor+this.bonusArmor; }
    getMagnetRange() { return 60+(1+this.magnet+this.bonusMagnet)*60; }
    update(dt) {
        if(this.dead) return;
        if(this.invulnTimer>0) this.invulnTimer-=dt;
        if(this.contactDmgTimer>0) this.contactDmgTimer-=dt;
        const input=Input.getMovement();
        this.moveX=input.x; this.moveY=input.y;
        this.isMoving=input.x!==0||input.y!==0;
        const spd=this.getSpeed();
        // 45° 等距移动：将屏幕坐标映射到等距世界坐标
        // 屏幕右 = 世界右下，屏幕上 = 世界右上，屏幕左 = 世界左上，屏幕下 = 世界左下
        const isoX = input.x * 0.707 - input.y * 0.707;
        const isoY = input.x * 0.707 + input.y * 0.707;
        this.x+=isoX*spd*60*dt; this.y+=isoY*spd*60*dt;
        if(this.isMoving) {
            this.facingDir=Math.atan2(isoY, isoX);
            this.animTimer+=dt;
            if(this.animTimer>0.12) { this.animTimer=0; this.animFrame=(this.animFrame+1)%4; }
        } else { this.animFrame=0; }
        this.x=clamp(this.x,this.size,CFG.MAP_W-this.size);
        this.y=clamp(this.y,this.size,CFG.MAP_H-this.size);
        this.weapons.update(dt, this, window._game);
    }
    takeDamage(dmg) {
        if(this.invulnTimer>0||this.dead) return;
        const finalDmg=Math.max(1,dmg-this.getTotalArmor());
        this.hp-=finalDmg; this.invulnTimer=0.15;
        if(window._game) window._game.shake=0.15;
        if(this.hp<=0) { this.hp=0; this.dead=true; }
    }
    gainXP(amount) {
        this.xp+=amount;
        while(this.xp>=this.xpToNext&&this.level<CFG.MAX_LEVEL) {
            this.xp-=this.xpToNext; this.level++;
            this.xpToNext=Math.floor(CFG.XP_BASE*Math.pow(CFG.XP_GROW,this.level-1));
            this.onLevelUp();
        }
    }
    onLevelUp() { if(window._game) window._game.showLevelUp(); }
    applyUpgrade(opt) {
        switch(opt.type) {
            case 'stat':
                switch(opt.id) {
                    case 'maxHp': this.bonusHp+=15; this.hp+=15; break;
                    case 'maxHp2': this.bonusHp+=25; this.hp+=25; break;
                    case 'damage': this.bonusDmg+=3; break;
                    case 'damage2': this.bonusDmg+=6; break;
                    case 'speed': this.bonusSpd+=0.25; break;
                    case 'atkSpd': this.bonusAtkSpd+=0.1; break;
                    case 'armor': this.bonusArmor+=1; break;
                    case 'magnet': this.bonusMagnet+=0.2; break;
                    case 'projectile': this.bonusProjectiles+=1; break;
                    case 'heal': this.hp=Math.min(this.getTotalHp(),this.hp+this.getTotalHp()*0.35); break;
                } break;
            case 'weapon':
                if(opt.id==='newWeapon') {
                    const available=Object.keys(CFG.WEAPONS).filter(id=>!this.weapons.hasWeapon(id));
                    if(available.length>0) this.weapons.addWeapon(available[randInt(0,available.length-1)]);
                } else if(opt.id==='upgradeWeapon') {
                    const upg=this.weapons.getUpgradeableWeapons();
                    if(upg.length>0) this.weapons.addWeapon(upg[randInt(0,upg.length-1)]);
                } break;
        }
    }
    draw(ctx, cam) {
        const sx=this.x-cam.x, sy=this.y-cam.y;
        // 无闪烁：正常绘制，不被 invulnTimer 影响
        const drawSize=this.size*2.8;
        if (this.sprite) {
            const frameW = this.sprite.width / 4;
            const srcX = this.animFrame * frameW;
            const frameH = this.sprite.height;
            const aspect = frameW / frameH;
            let dw = drawSize, dh = drawSize;
            if (aspect > 1) dh = drawSize / aspect;
            else dw = drawSize * aspect;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(this.facingDir - Math.PI/2);
            ctx.drawImage(this.sprite, srcX, 0, frameW, frameH, -dw/2, -dh/2, dw, dh);
            ctx.restore();
        } else {
            const grad=ctx.createRadialGradient(sx,sy,0,sx,sy,this.size/2);
            grad.addColorStop(0,'#4a6090'); grad.addColorStop(0.6,'#2a3a5a'); grad.addColorStop(1,'#0a0a1a');
            ctx.fillStyle=grad;
            ctx.beginPath(); ctx.arc(sx,sy,this.size/2,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#c8a84e'; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle='#66ccff'; ctx.shadowColor='#66ccff'; ctx.shadowBlur=8;
            ctx.beginPath(); ctx.arc(sx-this.size*0.25,sy-this.size*0.2,3,0,Math.PI*2);
            ctx.arc(sx+this.size*0.25,sy-this.size*0.2,3,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0;
        }
        // 无敌光环（不闪烁，始终显示淡金环）
        if(this.invulnTimer>2) {
            ctx.strokeStyle='rgba(255,215,0,0.4)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(sx,sy,this.size/2+6,0,Math.PI*2); ctx.stroke();
        }
    }
}

// ==================== 输入系统 ====================
const Input = {
    keys: {},
    joystick: { active:false, dx:0, dy:0 },
    init() {
        window.addEventListener('keydown',e=>{
            this.keys[e.key.toLowerCase()]=true;
            if(e.key==='Escape') { e.preventDefault(); window._game?.togglePause(); }
            if(e.key===' ') e.preventDefault();
            if(e.key==='1') window._game?.useItem(0);
            if(e.key==='2') window._game?.useItem(1);
            if(e.key==='3') window._game?.useItem(2);
        });
        window.addEventListener('keyup',e=>{ this.keys[e.key.toLowerCase()]=false; });
        this.setupJoystick();
    },
    setupJoystick() {
        const zone=document.getElementById('joystickZone');
        const knob=document.getElementById('joystickKnob');
        if(!zone||!knob) return;
        const base=document.getElementById('joystickBase');
        const onStart=(cx,cy)=>{
            const r=base.getBoundingClientRect();
            this.joystick.active=true;
            this.joystick.cx=r.left+r.width/2;
            this.joystick.cy=r.top+r.height/2;
            this.joystick.maxR=r.width/2*0.7;
            this.updateJoystick(cx,cy,knob);
        };
        const onMove=(cx,cy)=>{ if(!this.joystick.active) return; this.updateJoystick(cx,cy,knob); };
        const onEnd=()=>{ this.joystick.active=false; this.joystick.dx=0; this.joystick.dy=0; knob.style.transform='translate(-50%,-50%)'; };
        zone.addEventListener('touchstart',e=>{ e.preventDefault(); onStart(e.touches[0].clientX,e.touches[0].clientY); },{passive:false});
        zone.addEventListener('touchmove',e=>{ e.preventDefault(); onMove(e.touches[0].clientX,e.touches[0].clientY); },{passive:false});
        zone.addEventListener('touchend',e=>{ e.preventDefault(); onEnd(); },{passive:false});
        zone.addEventListener('mousedown',e=>{ e.preventDefault(); onStart(e.clientX,e.clientY);
            const mm=e=>onMove(e.clientX,e.clientY);
            const mu=()=>{ onEnd(); document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); };
            document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
        });
    },
    updateJoystick(cx,cy,knob) {
        const dx=cx-this.joystick.cx, dy=cy-this.joystick.cy;
        const d=Math.sqrt(dx*dx+dy*dy);
        const maxR=this.joystick.maxR;
        let ndx=dx, ndy=dy;
        if(d>maxR) { ndx=dx/d*maxR; ndy=dy/d*maxR; }
        if(d<maxR*0.1) { ndx=0; ndy=0; }
        this.joystick.dx=ndx/maxR; this.joystick.dy=ndy/maxR;
        knob.style.transform=`translate(calc(-50% + ${ndx}px), calc(-50% + ${ndy}px))`;
    },
    getMovement() {
        if(this.joystick.active&&(this.joystick.dx!==0||this.joystick.dy!==0))
            return {x:this.joystick.dx, y:this.joystick.dy};
        let x=0,y=0;
        if(this.keys['w']||this.keys['arrowup']) y=-1;
        if(this.keys['s']||this.keys['arrowdown']) y=1;
        if(this.keys['a']||this.keys['arrowleft']) x=-1;
        if(this.keys['d']||this.keys['arrowright']) x=1;
        if(x!==0&&y!==0) { const l=Math.sqrt(2); x/=l; y/=l; }
        return {x,y};
    },
};

// ==================== 主游戏类 ====================
class Game {
    constructor() {
        this.canvas=document.getElementById('gameCanvas');
        this.ctx=this.canvas.getContext('2d');
        this.running=false; this.paused=false;
        this.time=0; this.score=0; this.kills=0; this.collectedGold=0;
        this.player=null; this.enemies=[]; this.projectiles=[];
        this.particles=[]; this.pickups=[];
        this.cam={x:0,y:0}; this.shake=0;
        this.enemySpawnTimer=0; this.difficulty=1;
        this.bossSpawned=false;
        this.items=[]; this.maxItems=3;
        this.itemCooldowns={bomb:0,power:0,heal:0};
        this.skillEffects=[];
        this.bgCache=null;
        this._itemBarDirty=false;
        window._game=this;
    }
    init() {
        this.resize();
        window.addEventListener('resize',()=>this.resize());
        Input.init();
        this.setupUI();
        this.generateBg();
    }
    resize() { this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight; this.generateBg(); }
    generateBg() {
        const bgImg=Assets.getRaw('bgTile');
        if (!bgImg || !bgImg.complete) {
            this.bgCache = null;
            return;
        }
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = CFG.MAP_W;
        bgCanvas.height = CFG.MAP_H;
        const bgCtx = bgCanvas.getContext('2d');
        const tileSize = 512;
        for (let x = 0; x < CFG.MAP_W; x += tileSize) {
            for (let y = 0; y < CFG.MAP_H; y += tileSize) {
                bgCtx.drawImage(bgImg, x, y, tileSize, tileSize);
            }
        }
        // 亮色半透明覆盖层（替代之前的暗色）
        bgCtx.fillStyle = 'rgba(255,255,240,0.08)';
        bgCtx.fillRect(0, 0, CFG.MAP_W, CFG.MAP_H);
        this.bgCache = bgCanvas;
    }
    // 判断敌人是否在视野内
    isInViewport(enemy) {
        const margin = CFG.ATTACK_RANGE_MARGIN;
        const left = this.cam.x - margin;
        const right = this.cam.x + this.canvas.width + margin;
        const top = this.cam.y - margin;
        const bottom = this.cam.y + this.canvas.height + margin;
        return enemy.x >= left && enemy.x <= right && enemy.y >= top && enemy.y <= bottom;
    }
    // 获取视野内最近的敌人
    getNearestEnemyInViewport(player) {
        let nearest=null, minD=Infinity;
        for(const e of this.enemies) {
            if(!this.isInViewport(e)) continue;
            const d=dist(e,player);
            if(d<minD) { minD=d; nearest=e; }
        }
        return nearest;
    }
    start() {
        this.running=true; this.paused=false;
        this.time=0; this.score=0; this.kills=0; this.collectedGold=0;
        this.enemies=[]; this.projectiles=[]; this.particles=[]; this.pickups=[];
        this.items=[]; this.skillEffects=[];
        this.itemCooldowns={bomb:0,power:0,heal:0};
        this.cam={x:CFG.MAP_W/2-this.canvas.width/2, y:CFG.MAP_H/2-this.canvas.height/2};
        this.shake=0; this.enemySpawnTimer=0; this.difficulty=1; this.bossSpawned=false;
        this.player=new Player(DB.data.permUpgrades);
        this._itemBarDirty = true;
        this.lastTime=performance.now();
        this.updateItemBar();
        this.loop();
    }
    loop() {
        if(!this.running) return;
        const now=performance.now();
        let dt=(now-this.lastTime)/1000;
        this.lastTime=now;
        if(dt>0.1) dt=0.1;
        if(!this.paused) {
            this.time+=dt;
            this.update(dt);
        }
        this.render();
        requestAnimationFrame(()=>this.loop());
    }
    update(dt) {
        const p=this.player;
        if(!p||p.dead) return;
        p.update(dt);
        // 技能特效
        for(let i=this.skillEffects.length-1;i>=0;i--) {
            this.skillEffects[i].update(dt,this);
            if(this.skillEffects[i].dead) this.skillEffects.splice(i,1);
        }
        if(this.skillEffects.length>LIMITS.SKILL_EFFECTS) this.skillEffects.splice(0,this.skillEffects.length-LIMITS.SKILL_EFFECTS);
        // 道具冷却
        for(const k in this.itemCooldowns) {
            if(this.itemCooldowns[k]>0) this.itemCooldowns[k]-=dt;
        }
        // 敌人
        for(let i=this.enemies.length-1;i>=0;i--) {
            this.enemies[i].update(dt,p);
            if(this.enemies[i].dead) this.enemies.splice(i,1);
        }
        if(this.enemies.length>LIMITS.ENEMIES) this.enemies.splice(0,this.enemies.length-LIMITS.ENEMIES);
        // 投射物
        for(let i=this.projectiles.length-1;i>=0;i--) {
            this.projectiles[i].update(dt);
            const proj=this.projectiles[i];
            if(proj.dead) { this.projectiles.splice(i,1); continue; }
            for(const e of this.enemies) {
                if(proj.hit.has(e)) continue;
                if(dist(proj,e)<(proj.size+e.size)/2) {
                    proj.hit.add(e); e.takeDamage(proj.damage,this);
                    proj.pierce--; if(proj.pierce<=0) { proj.dead=true; break; }
                }
            }
        }
        if(this.projectiles.length>LIMITS.PROJECTILES) this.projectiles.splice(0,this.projectiles.length-LIMITS.PROJECTILES);
        // 粒子
        for(let i=this.particles.length-1;i>=0;i--) {
            this.particles[i].update(dt);
            if(this.particles[i].dead) this.particles.splice(i,1);
        }
        if(this.particles.length>LIMITS.PARTICLES) this.particles.splice(0,this.particles.length-LIMITS.PARTICLES);
        // 掉落物
        for(let i=this.pickups.length-1;i>=0;i--) {
            this.pickups[i].update(dt,p,p.getMagnetRange(),this);
            if(this.pickups[i].dead) this.pickups.splice(i,1);
        }
        if(this.pickups.length>LIMITS.PICKUPS) this.pickups.splice(0,this.pickups.length-LIMITS.PICKUPS);
        // 接触伤害
        if(p.contactDmgTimer<=0) {
            for(const e of this.enemies) {
                if(dist(e,p)<(e.size+p.size)/2) {
                    p.takeDamage(e.damage); p.contactDmgTimer=0.5; break;
                }
            }
        }
        // 敌人生成
        this.enemySpawnTimer-=dt;
        if(this.enemySpawnTimer<=0&&this.enemies.length<LIMITS.ENEMIES) {
            this.spawnWave();
            this.enemySpawnTimer=Math.max(0.8,3.0-this.time/300);
        }
        this.difficulty=1+this.time/60;
        const mins=Math.floor(this.time/60);
        if(mins>0&&mins%3===0&&!this.bossSpawned&&this.enemies.length<LIMITS.ENEMIES-5) {
            this.bossSpawned=true; this.spawnEnemy('boss',3);
        }
        if(mins%3!==0) this.bossSpawned=false;
        this.cam.x=lerp(this.cam.x, p.x-this.canvas.width/2, 0.08);
        this.cam.y=lerp(this.cam.y, p.y-this.canvas.height/2, 0.08);
        if(this.shake>0) {
            this.shake-=dt;
            this.cam.x+=Math.sin(this.shake*50)*5*this.shake;
            this.cam.y+=Math.cos(this.shake*50)*5*this.shake;
        }
        if(p.dead) this.gameOver();
        this.updateHUD();
    }
    spawnWave() {
        const remaining=Math.max(0,LIMITS.ENEMIES-this.enemies.length);
        const count=Math.min(remaining, Math.floor(2+this.time/25));
        for(let i=0;i<count;i++) {
            const types=['wraith','skeleton','zombie','demon'];
            const weights=this.time<30?[50,30,20,0]:this.time<120?[30,30,25,15]:[20,25,30,25];
            this.spawnEnemy(this.weightedRandom(types,weights),1);
        }
    }
    spawnEnemy(type, count) {
        for(let i=0;i<count;i++) {
            const a=rand(0,Math.PI*2);
            const r=Math.max(this.canvas.width,this.canvas.height)*0.9+rand(100,250);
            const ex=clamp(this.player.x+Math.cos(a)*r,30,CFG.MAP_W-30);
            const ey=clamp(this.player.y+Math.sin(a)*r,30,CFG.MAP_H-30);
            this.enemies.push(new Enemy(type,ex,ey,this.difficulty));
        }
    }
    weightedRandom(items, weights) {
        const total=weights.reduce((a,b)=>a+b,0);
        let r=Math.random()*total;
        for(let i=0;i<items.length;i++) { r-=weights[i]; if(r<=0) return items[i]; }
        return items[0];
    }
    spawnXP(x,y,value) {
        const count=Math.ceil(value/5);
        for(let i=0;i<count;i++) this.pickups.push(new Pickup(x+rand(-10,10),y+rand(-10,10),'xp',Math.ceil(value/count)));
    }
    spawnGold(x,y,value) { this.pickups.push(new Pickup(x,y,'gold',value)); }
    spawnItem(x,y,type) { this.pickups.push(new Pickup(x,y,'item',type)); }
    getNearestEnemy(x,y) {
        let nearest=null, minD=Infinity;
        for(const e of this.enemies) { const d=dist(e,{x,y}); if(d<minD) { minD=d; nearest=e; } }
        return nearest;
    }
    collectItem(type) {
        if(this.items.length>=this.maxItems) return;
        this.items.push(type);
        this._itemBarDirty = true;
        this.updateItemBar();
    }
    useItem(index) {
        if(index<0||index>=this.items.length) return;
        const type=this.items[index];
        if(this.itemCooldowns[type]>0) return;
        this.items.splice(index,1);
        const cfg=CFG.ITEM_TYPES[type];
        this.itemCooldowns[type]=cfg.cooldown;
        switch(cfg.skill) {
            case 'bomb':
                this.skillEffects.push(new SkillEffect('bomb'));
                for(const e of this.enemies) {
                    e.takeDamage(this.player?this.player.getDamage()*5:50,this);
                }
                break;
            case 'ult':
                this.skillEffects.push(new SkillEffect('ult'));
                for(const e of this.enemies) {
                    e.takeDamage(this.player?this.player.getDamage()*3:30,this);
                    e.stunTimer=5;
                }
                break;
            case 'heal':
                if(this.player) {
                    this.player.hp=Math.min(this.player.getTotalHp(),this.player.hp+this.player.getTotalHp()*0.5);
                }
                for(let i=0;i<30;i++) {
                    this.particles.push(new Particle(this.player.x,this.player.y,{
                        vx:rand(-3,3),vy:rand(-3,3),color:'#44ff44',life:1,size:rand(3,6)
                    }));
                }
                break;
        }
        this._itemBarDirty = true;
        this.updateItemBar();
    }
    updateItemBar() {
        this._itemBarDirty = false;
        const container=document.getElementById('itemSlots');
        if(!container) return;
        container.innerHTML='';
        for(let i=0;i<this.maxItems;i++) {
            const slot=document.createElement('div');
            slot.className='item-slot';
            if(i<this.items.length) {
                const type=this.items[i];
                const cfg=CFG.ITEM_TYPES[type];
                const onCd=this.itemCooldowns[type]>0;
                slot.className+=' item-filled'+(onCd?' item-cooldown':'');
                const imgKey='item'+(type==='bomb'?'Bomb':type==='power'?'Power':'Heal');
                const sprite=Assets.getSprite(imgKey);
                if(sprite) {
                    const img=document.createElement('img');
                    img.src=sprite.toDataURL();
                    img.className='item-img';
                    slot.appendChild(img);
                } else {
                    const txt=document.createElement('span');
                    txt.className='item-text';
                    txt.textContent=cfg.name.charAt(0);
                    slot.appendChild(txt);
                }
                const key=document.createElement('span');
                key.className='item-key';
                key.textContent=String(i+1);
                slot.appendChild(key);
                if(onCd) {
                    const cd=document.createElement('span');
                    cd.className='item-cd';
                    cd.textContent=this.itemCooldowns[type].toFixed(1)+'s';
                    slot.appendChild(cd);
                }
                slot.onclick=()=>this.useItem(i);
                slot.title=cfg.name+': '+cfg.desc;
            } else {
                slot.className+=' item-empty';
                const key=document.createElement('span');
                key.className='item-key';
                key.textContent=String(i+1);
                slot.appendChild(key);
            }
            container.appendChild(slot);
        }
    }
    updateItemBarCooldowns() {
        const container=document.getElementById('itemSlots');
        if(!container) return;
        for(let i=0;i<this.maxItems;i++) {
            const slot=container.children[i];
            if(!slot) continue;
            const oldCd=slot.querySelector('.item-cd');
            if(i<this.items.length) {
                const type=this.items[i];
                const onCd=this.itemCooldowns[type]>0;
                if(onCd) {
                    if(oldCd) oldCd.textContent=this.itemCooldowns[type].toFixed(1)+'s';
                    else {
                        const cd=document.createElement('span');
                        cd.className='item-cd';
                        cd.textContent=this.itemCooldowns[type].toFixed(1)+'s';
                        slot.appendChild(cd);
                    }
                    slot.classList.add('item-cooldown');
                } else {
                    if(oldCd) oldCd.remove();
                    slot.classList.remove('item-cooldown');
                }
            }
        }
    }
    render() {
        const ctx=this.ctx;
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        if (this.bgCache) {
            ctx.drawImage(this.bgCache, this.cam.x, this.cam.y, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle='#f5f0e0'; ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
        for(const pk of this.pickups) pk.draw(ctx,this.cam);
        for(const e of this.enemies) e.draw(ctx,this.cam,this.player);
        if(this.player) this.player.draw(ctx,this.cam);
        for(const proj of this.projectiles) proj.draw(ctx,this.cam);
        for(const pt of this.particles) pt.draw(ctx,this.cam);
        for(const se of this.skillEffects) se.draw(ctx,this.cam);
        if(this.player&&this.player.weapons.hasWeapon('deathAura')) {
            const lv=this.player.weapons.getLevel('deathAura');
            const r=60+lv*12;
            const sx=this.player.x-this.cam.x, sy=this.player.y-this.cam.y;
            ctx.strokeStyle='rgba(204,51,51,0.3)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2); ctx.stroke();
        }
    }
    updateHUD() {
        const p=this.player;
        if(!p) return;
        const hpR=p.hp/p.getTotalHp();
        const hpEl=document.getElementById('hpHpBar'); if(hpEl) hpEl.style.width=(hpR*100)+'%';
        const hpTxt=document.getElementById('hpText'); if(hpTxt) hpTxt.textContent=Math.ceil(p.hp)+'/'+p.getTotalHp();
        const xpR=p.xp/p.xpToNext;
        const xpEl=document.getElementById('hudXpBar'); if(xpEl) xpEl.style.width=(xpR*100)+'%';
        const lvEl=document.getElementById('hudLevel'); if(lvEl) lvEl.textContent=p.level;
        const m=Math.floor(this.time/60), s=Math.floor(this.time%60);
        const tEl=document.getElementById('hudTime'); if(tEl) tEl.textContent=m+':'+String(s).padStart(2,'0');
        const kEl=document.getElementById('hudKills'); if(kEl) kEl.textContent=this.kills;
        const sEl=document.getElementById('hudScore'); if(sEl) sEl.textContent=Math.floor(this.score);
        if (this._itemBarDirty) {
            this.updateItemBar();
        } else {
            this.updateItemBarCooldowns();
        }
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
            const rarityLabel=opt.rarity?(' ['+(opt.rarity==='rare'?'稀有':'罕见')+']'):'';
            div.innerHTML='<span class="op-name">'+opt.name+rarityLabel+'</span><span class="op-desc">'+opt.desc+'</span>';
            div.onclick=()=>{this.player.applyUpgrade(opt);document.getElementById('levelUpScreen').classList.add('hidden');this.paused=false;};
            container.appendChild(div);
        });
        document.getElementById('levelUpScreen').classList.remove('hidden');
    }
    generateLevelUpOptions() {
        const options=[];
        const pool=[...CFG.LEVEL_OPTIONS];
        const hasAll=Object.keys(CFG.WEAPONS).every(id=>this.player.weapons.hasWeapon(id));
        const hasUpgradeable=this.player.weapons.getUpgradeableWeapons().length>0;
        const filtered=pool.filter(o=>{
            if(o.type==='weapon'&&o.id==='newWeapon'&&hasAll) return false;
            if(o.type==='weapon'&&o.id==='upgradeWeapon'&&!hasUpgradeable) return false;
            return true;
        });
        for(let i=0;i<4;i++) {
            const total=filtered.reduce((a,b)=>a+b.weight,0);
            let r=Math.random()*total;
            for(const o of filtered) { r-=o.weight; if(r<=0) { options.push({...o}); break; } }
        }
        return options;
    }
    togglePause() {
        if(this.paused) { this.paused=false; document.getElementById('pauseScreen').classList.add('hidden'); }
        else { this.paused=true; document.getElementById('pauseScreen').classList.remove('hidden'); }
    }
    gameOver() {
        this.running=false;
        const score=Math.floor(this.score);
        const goldEarned=Math.floor(score*0.1+this.kills*2+this.collectedGold);
        DB.addGold(goldEarned);
        if(score>DB.data.highScore) DB.data.highScore=score;
        DB.data.totalKills+=this.kills; DB.data.totalGames++;
        DB.save();
        document.getElementById('goScore').textContent=score;
        document.getElementById('goKills').textContent=this.kills;
        const m=Math.floor(this.time/60), s=Math.floor(this.time%60);
        document.getElementById('goTime').textContent=m+':'+String(s).padStart(2,'0');
        document.getElementById('goLevel').textContent=this.player?this.player.level:1;
        document.getElementById('goGold').textContent=goldEarned;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        this.updateMenuStats();
    }
    setupUI() {
        document.getElementById('btnStart').onclick=()=>{
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('gameScreen').classList.remove('hidden');
            this.generateBg();
            this.start();
        };
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
            this.start();
        };
        document.getElementById('btnMenu').onclick=()=>{
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
            this.updateMenuStats();
        };
        document.getElementById('btnCloseUpgrade').onclick=()=>document.getElementById('upgradeScreen').classList.add('hidden');
        document.getElementById('btnCloseGM').onclick=()=>document.getElementById('gmScreen').classList.add('hidden');
        this.updateMenuStats();
    }
    updateMenuStats() {
        document.getElementById('mHighScore').textContent=DB.data.highScore;
        document.getElementById('mGold').textContent=DB.getGold();
        document.getElementById('mTotalKills').textContent=DB.data.totalKills;
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
            if(!maxed) div.querySelector('.ui-btn').onclick=()=>{if(DB.upgradePerm(key)){this.showPermUpgrades();this.updateMenuStats();}else alert('金币不足!');};
            container.appendChild(div);
        }
        document.getElementById('upgradeScreen').classList.remove('hidden');
    }
}

// ==================== GM系统 ====================
window.GM = {
    setGold() {
        const v=parseInt(document.getElementById('gmGold').value)||0;
        DB.data.gold=v; DB.save();
        document.getElementById('gmScreen').classList.add('hidden');
        if(window._game) window._game.updateMenuStats();
    },
    addGold(n) { DB.addGold(n); document.getElementById('gmGold').value=DB.getGold(); if(window._game) window._game.updateMenuStats(); },
    resetAll() { if(confirm('确定要重置所有数据吗?')) { DB.resetAll(); if(window._game) window._game.updateMenuStats(); alert('已重置'); } },
    maxUpgrades() { DB.maxAll(); if(window._game) window._game.updateMenuStats(); alert('已满级所有永久强化'); },
    unlockAll() { DB.data.unlockedWeapons=Object.keys(CFG.WEAPONS); DB.save(); alert('已解锁全部武器'); },
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