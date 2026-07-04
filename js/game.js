/**
 * ============================================
 * 亡灵骑士·夏侯惇 - 游戏引擎
 * Vampire Survivors 风格暗黑三国游戏
 * ============================================
 */
(function(){
'use strict';

// ==================== 配置 ====================
const CFG = {
    MAP_W: 3000, MAP_H: 3000,
    PLAYER_SPEED: 3.5, PLAYER_SIZE: 18,
    PLAYER_HP: 120, PLAYER_DAMAGE: 12,
    PLAYER_ATK_SPD: 1.2,
    XP_BASE: 40, XP_GROW: 1.45,
    MAX_LEVEL: 60,
    ENEMY_TYPES: {
        wraith:  { name:'怨灵', hp:25, dmg:6,  spd:2.8, size:14, color:'#8b5cf6', xp:12,  gold:3 },
        skeleton:{ name:'骷髅兵',hp:50, dmg:10, spd:1.8, size:18, color:'#c8c8c8', xp:20,  gold:5 },
        zombie:  { name:'僵尸', hp:90, dmg:15, spd:1.0, size:22, color:'#4a7a3a', xp:30,  gold:8 },
        demon:   { name:'恶魔', hp:300, dmg:25, spd:2.2, size:28, color:'#cc3333', xp:100, gold:25 },
        boss:    { name:'妖将', hp:800, dmg:40, spd:1.2, size:42, color:'#ff4444', xp:500, gold:100 },
    },
    WEAPONS: {
        soulBlade:   { name:'灵魂之刃',   desc:'近战弧形斩击',   icon:'⚔️', maxLv:6, color:'#c8a84e', rarity:'common' },
        shadowBolt:  { name:'暗影弹幕',   desc:'自动发射暗影弹', icon:'🏹', maxLv:6, color:'#8b5cf6', rarity:'common' },
        deathAura:   { name:'死亡光环',   desc:'周围持续伤害',   icon:'💫', maxLv:6, color:'#cc3333', rarity:'uncommon' },
        hellfire:    { name:'冥火风暴',   desc:'随机范围火焰',   icon:'🔥', maxLv:6, color:'#ff6600', rarity:'uncommon' },
        lightning:   { name:'冥雷链',     desc:'连锁闪电攻击',   icon:'⚡', maxLv:6, color:'#ffcc00', rarity:'rare' },
        frostNova:   { name:'冰霜新星',   desc:'周期性冰冻爆发', icon:'❄️', maxLv:6, color:'#66ccff', rarity:'rare' },
    },
    PERM_UPGRADES: {
        maxHp:  { name:'生命强化', desc:'+10 最大生命', baseCost:80,  costMul:1.4, maxLv:20 },
        damage:{ name:'攻击强化', desc:'+2 基础伤害',  baseCost:100, costMul:1.4, maxLv:20 },
        speed: { name:'速度强化', desc:'+0.2 移动速度',baseCost:120, costMul:1.4, maxLv:15 },
        atkSpd:{ name:'攻速强化', desc:'+8% 攻击速度', baseCost:90,  costMul:1.4, maxLv:15 },
        armor: { name:'护甲强化', desc:'+1 伤害减免',  baseCost:150, costMul:1.5, maxLv:12 },
        magnet:{ name:'磁铁强化', desc:'+15% 拾取范围',baseCost:100, costMul:1.3, maxLv:10 },
    },
    // 等级升级选项权重
    LEVEL_OPTIONS: [
        { type:'stat', id:'maxHp',    name:'生命强化',   desc:'+15 最大生命值',  icon:'❤️', weight:15 },
        { type:'stat', id:'maxHp2',   name:'生命强化+',  desc:'+25 最大生命值',  icon:'❤️', weight:8 },
        { type:'stat', id:'damage',   name:'攻击强化',   desc:'+3 基础伤害',     icon:'⚔️', weight:15 },
        { type:'stat', id:'damage2',  name:'攻击强化+',  desc:'+6 基础伤害',     icon:'⚔️', weight:8 },
        { type:'stat', id:'speed',    name:'速度提升',   desc:'+0.25 移动速度',  icon:'👟', weight:12 },
        { type:'stat', id:'atkSpd',   name:'攻速提升',   desc:'+10% 攻击速度',   icon:'💨', weight:12 },
        { type:'stat', id:'armor',    name:'护甲提升',   desc:'+1 伤害减免',     icon:'🛡️', weight:10 },
        { type:'stat', id:'magnet',   name:'磁铁',       desc:'+20% 拾取范围',   icon:'🧲', weight:8 },
        { type:'stat', id:'heal',     name:'即时治疗',   desc:'恢复35%最大生命',  icon:'💚', weight:10 },
        { type:'weapon', id:'newWeapon', name:'新武器',  desc:'获得一件新武器',   icon:'🗡️', weight:8 },
        { type:'weapon', id:'upgradeWeapon', name:'武器升级', desc:'随机武器升1级',icon:'⬆️', weight:10 },
    ],
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
function hsl(h,s,l,a) { return `hsla(${h},${s}%,${l}%,${a||1})`; }

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
    }
    update(dt, player) {
        if(this.dead) return;
        if(this.slowTimer>0) { this.spd=this.baseSpd*0.4; this.slowTimer-=dt; }
        else this.spd=this.baseSpd;
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        const dx=player.x-this.x, dy=player.y-this.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d>1) { this.x+=(dx/d)*this.spd*60*dt; this.y+=(dy/d)*this.spd*60*dt; }
    }
    takeDamage(dmg, game) {
        this.hp-=dmg; this.hitFlash=0.08;
        if(this.hp<=0) { this.die(game); return true; }
        return false;
    }
    die(game) {
        this.dead=true;
        game.spawnXP(this.x,this.y,this.xpVal);
        game.spawnGold(this.x,this.y,this.goldVal);
        game.kills++; game.score+=this.xpVal;
        for(let i=0;i<8;i++) {
            game.particles.push(new Particle(this.x,this.y,{
                vx:Math.cos(i/8*Math.PI*2)*rand(1,3),
                vy:Math.sin(i/8*Math.PI*2)*rand(1,3),
                color:this.color, life:0.4, size:rand(2,5)
            }));
        }
    }
    draw(ctx, cam) {
        const sx=this.x-cam.x, sy=this.y-cam.y;
        const color=this.hitFlash>0?'#fff':this.color;
        const floatY=Math.sin(Date.now()/300+this.anim)*2;
        // body
        ctx.fillStyle=color;
        ctx.beginPath();
        if(this.type==='boss') {
            // boss: diamond shape
            ctx.moveTo(sx,sy-this.size/2-floatY);
            ctx.lineTo(sx+this.size/2,sy+floatY);
            ctx.lineTo(sx,sy+this.size/2-floatY);
            ctx.lineTo(sx-this.size/2,sy+floatY);
        } else {
            ctx.arc(sx,sy+floatY,this.size/2,0,Math.PI*2);
        }
        ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.stroke();
        // eyes
        this.drawEyes(ctx,sx,sy+floatY);
        // slow effect
        if(this.slowTimer>0) {
            ctx.strokeStyle='rgba(100,200,255,0.6)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(sx,sy+floatY,this.size/2+4,0,Math.PI*2); ctx.stroke();
        }
        // hp bar
        const hpR=this.hp/this.maxHp;
        const bw=this.size; const bh=3; const by=sy-this.size/2-8;
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
        this.size=type==='gold'?10:12; this.dead=false;
        this.life=25; // seconds before disappearing
        this.anim=rand(0,Math.PI*2);
    }
    update(dt, player, magnetRange, game) {
        this.life-=dt; if(this.life<=0) { this.dead=true; return; }
        if(this.life<5) this.dead=true; // auto-disappear when close to expiry
        const d=dist(this,player);
        if(d<magnetRange) {
            const spd=300;
            const a=angle(this,player);
            this.x+=Math.cos(a)*spd*dt;
            this.y+=Math.sin(a)*spd*dt;
        }
        if(d<player.size+10) {
            if(this.type==='xp') player.gainXP(this.value);
            else if(this.type==='gold') { game.collectedGold+=this.value; }
            this.dead=true;
        }
    }
    draw(ctx, cam) {
        const sx=this.x-cam.x, sy=this.y-cam.y;
        const floatY=Math.sin(Date.now()/200+this.anim)*3;
        ctx.fillStyle=this.type==='xp'?'#4f4':'#fc0';
        ctx.shadowColor=this.type==='xp'?'#4f4':'#fc0'; ctx.shadowBlur=6;
        ctx.beginPath(); ctx.arc(sx,sy+floatY,this.size/2,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
        ctx.fillStyle='#fff'; ctx.font='8px sans-serif';
        ctx.fillText(this.type==='xp'?'XP':'$',sx-5,sy+floatY+3);
    }
}

// ==================== 武器系统 ====================
class WeaponSystem {
    constructor() {
        this.weapons = {}; // {id: {level, ...}}
    }
    hasWeapon(id) { return !!this.weapons[id]; }
    getLevel(id) { return this.weapons[id]?this.weapons[id].level:0; }
    addWeapon(id) {
        if(this.weapons[id]) {
            const cfg=CFG.WEAPONS[id];
            if(this.weapons[id].level>=cfg.maxLv) return false;
            this.weapons[id].level++;
        } else {
            this.weapons[id]={level:1};
        }
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

    // 灵魂之刃 - 近战弧形斩击
    updateSoulBlade(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0;
        w.cooldown-=dt;
        const cd=Math.max(0.3,1.2-lv*0.1);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const nearest=game.getNearestEnemy(player.x,player.y);
            if(!nearest) return;
            const a=angle(player,nearest);
            const arcCount=lv>=5?5:lv>=3?3:1;
            const spread=lv>=4?0.5:0.3;
            for(let i=0;i<arcCount;i++) {
                const aa=a+(i-Math.floor(arcCount/2))*spread;
                const dmg=player.getDamage()*(0.8+lv*0.3);
                const proj=new Projectile(
                    player.x+Math.cos(aa)*player.size,
                    player.y+Math.sin(aa)*player.size,
                    Math.cos(aa)*10, Math.sin(aa)*10,
                    dmg, 16+lv*2, '#c8a84e', lv>=6?4:lv>=4?2:1
                );
                game.projectiles.push(proj);
            }
        }
    }

    // 暗影弹幕 - 自动发射弹幕
    updateShadowBolt(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0;
        w.cooldown-=dt;
        const cd=Math.max(0.3,0.9-lv*0.08);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const count=lv>=5?6:lv>=3?4:2;
            const baseAngle=Date.now()/1000*(lv>=4?2:1);
            for(let i=0;i<count;i++) {
                const a=baseAngle+(i/count)*Math.PI*2;
                const dmg=player.getDamage()*(0.5+lv*0.15);
                const proj=new Projectile(
                    player.x, player.y,
                    Math.cos(a)*8, Math.sin(a)*8,
                    dmg, 8+lv, '#8b5cf6', 1
                );
                game.projectiles.push(proj);
            }
        }
    }

    // 死亡光环 - 周围持续伤害
    updateDeathAura(dt, player, game, w, lv) {
        if(!w.timer) w.timer=0;
        w.timer-=dt;
        if(w.timer<=0) {
            w.timer=0.15;
            const radius=60+lv*12;
            const dmg=player.getDamage()*(0.3+lv*0.1);
            game.enemies.forEach(e=>{
                if(dist(e,player)<radius) e.takeDamage(dmg*dt*60,game);
            });
        }
        // visual
        w.visualAngle=(w.visualAngle||0)+dt*2;
        for(let i=0;i<3+lv;i++) {
            const a=w.visualAngle+(i/(3+lv))*Math.PI*2;
            const px=player.x+Math.cos(a)*radius;
            const py=player.y+Math.sin(a)*radius;
            game.particles.push(new Particle(px,py,{
                vx:0,vy:0,color:'#cc3333',life:0.2,size:2+lv
            }));
        }
    }

    // 冥火风暴 - 随机范围AOE
    updateHellfire(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0;
        w.cooldown-=dt;
        const cd=Math.max(0.5,2.5-lv*0.3);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const count=lv>=5?5:lv>=3?3:2;
            for(let i=0;i<count;i++) {
                const tx=player.x+rand(-200,200);
                const ty=player.y+rand(-200,200);
                const radius=30+lv*8;
                const dmg=player.getDamage()*(0.8+lv*0.25);
                // damage enemies in area
                game.enemies.forEach(e=>{
                    if(dist(e,{x:tx,y:ty})<radius) e.takeDamage(dmg,game);
                });
                // visual
                for(let j=0;j<12;j++) {
                    game.particles.push(new Particle(tx+rand(-radius,radius),ty+rand(-radius,radius),{
                        vx:rand(-2,2),vy:rand(-4,-1),color:'#ff6600',life:0.6,size:rand(3,6)
                    }));
                }
            }
        }
    }

    // 冥雷链 - 连锁闪电
    updateLightning(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0;
        w.cooldown-=dt;
        const cd=Math.max(0.3,1.5-lv*0.15);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const chainCount=lv>=5?6:lv>=3?4:2;
            const dmg=player.getDamage()*(0.6+lv*0.2);
            let last=player;
            const hit=new Set();
            for(let c=0;c<chainCount;c++) {
                let nearest=null, minD=250;
                game.enemies.forEach(e=>{
                    if(hit.has(e)) return;
                    const d=dist(e,last);
                    if(d<minD) { minD=d; nearest=e; }
                });
                if(!nearest) break;
                hit.add(nearest);
                nearest.takeDamage(dmg,game);
                // lightning visual
                for(let i=0;i<6;i++) {
                    const t=i/6;
                    game.particles.push(new Particle(
                        lerp(last.x,nearest.x,t), lerp(last.y,nearest.y,t),
                        {vx:0,vy:0,color:'#ffcc00',life:0.2,size:3}
                    ));
                }
                last=nearest;
            }
        }
    }

    // 冰霜新星 - 周期性冰冻爆发
    updateFrostNova(dt, player, game, w, lv) {
        if(!w.cooldown) w.cooldown=0;
        w.cooldown-=dt;
        const cd=Math.max(0.8,5-lv*0.5);
        if(w.cooldown<=0) {
            w.cooldown=cd;
            const radius=80+lv*20;
            const dmg=player.getDamage()*(0.5+lv*0.2);
            game.enemies.forEach(e=>{
                if(dist(e,player)<radius) {
                    e.takeDamage(dmg,game);
                    e.slowTimer=1.5+lv*0.3;
                }
            });
            // visual
            for(let i=0;i<20;i++) {
                const a=rand(0,Math.PI*2);
                const r=rand(0,radius);
                game.particles.push(new Particle(
                    player.x+Math.cos(a)*r, player.y+Math.sin(a)*r,
                    {vx:Math.cos(a)*rand(1,3),vy:Math.sin(a)*rand(1,3),
                     color:'#66ccff',life:0.5,size:rand(2,5)}
                ));
            }
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
        this.dead=false; this.invulnTimer=3; // 3秒初始无敌
        this.contactDmgTimer=0; // 接触伤害冷却
        // temp bonuses from level-ups
        this.bonusHp=0; this.bonusDmg=0; this.bonusSpd=0; this.bonusAtkSpd=0;
        this.bonusArmor=0; this.bonusMagnet=0;
        this.weapons=new WeaponSystem();
        this.weapons.addWeapon('soulBlade'); // starting weapon
        this.facingDir=0; // current facing direction
        this.moveX=0; this.moveY=0;
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
        // movement
        const input=Input.getMovement();
        this.moveX=input.x; this.moveY=input.y;
        const spd=this.getSpeed();
        this.x+=input.x*spd*60*dt;
        this.y+=input.y*spd*60*dt;
        if(input.x!==0||input.y!==0) this.facingDir=Math.atan2(input.y,input.x);
        // clamp to map
        this.x=clamp(this.x,this.size,CFG.MAP_W-this.size);
        this.y=clamp(this.y,this.size,CFG.MAP_H-this.size);
        // weapons
        this.weapons.update(dt, this, window._game);
    }

    takeDamage(dmg) {
        if(this.invulnTimer>0||this.dead) return;
        const finalDmg=Math.max(1,dmg-this.getTotalArmor());
        this.hp-=finalDmg; this.invulnTimer=0.15;
        // screen shake
        if(window._game) window._game.shake=0.15;
        if(this.hp<=0) { this.hp=0; this.dead=true; }
    }

    gainXP(amount) {
        this.xp+=amount;
        while(this.xp>=this.xpToNext&&this.level<CFG.MAX_LEVEL) {
            this.xp-=this.xpToNext;
            this.level++;
            this.xpToNext=Math.floor(CFG.XP_BASE*Math.pow(CFG.XP_GROW,this.level-1));
            this.onLevelUp();
        }
    }

    onLevelUp() {
        if(window._game) window._game.showLevelUp();
    }

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
                    case 'heal': this.hp=Math.min(this.getTotalHp(),this.hp+this.getTotalHp()*0.35); break;
                }
                break;
            case 'weapon':
                if(opt.id==='newWeapon') {
                    const available=Object.keys(CFG.WEAPONS).filter(id=>!this.weapons.hasWeapon(id));
                    if(available.length>0) {
                        const pick=available[randInt(0,available.length-1)];
                        this.weapons.addWeapon(pick);
                    }
                } else if(opt.id==='upgradeWeapon') {
                    const upg=this.weapons.getUpgradeableWeapons();
                    if(upg.length>0) {
                        const pick=upg[randInt(0,upg.length-1)];
                        this.weapons.addWeapon(pick);
                    }
                }
                break;
        }
    }

    draw(ctx, cam) {
        const sx=this.x-cam.x, sy=this.y-cam.y;
        if(this.invulnTimer>0&&Math.floor(this.invulnTimer*30)%2===0) return; // blink
        // player body - dark knight
        const bodyGrad=ctx.createRadialGradient(sx,sy,0,sx,sy,this.size/2);
        bodyGrad.addColorStop(0,'#4a6090'); bodyGrad.addColorStop(0.6,'#2a3a5a'); bodyGrad.addColorStop(1,'#0a0a1a');
        ctx.fillStyle=bodyGrad;
        ctx.beginPath(); ctx.arc(sx,sy,this.size/2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#c8a84e'; ctx.lineWidth=2; ctx.stroke();
        // glowing eyes
        ctx.fillStyle='#66ccff';
        ctx.shadowColor='#66ccff'; ctx.shadowBlur=8;
        const ex=this.size*0.25, ey=this.size*0.2;
        ctx.beginPath(); ctx.arc(sx-ex,sy-ey,3,0,Math.PI*2); ctx.arc(sx+ex,sy-ey,3,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
        // weapon indicator (facing direction)
        if(this.moveX!==0||this.moveY!==0) {
            const wx=sx+Math.cos(this.facingDir)*this.size*0.7;
            const wy=sy+Math.sin(this.facingDir)*this.size*0.7;
            ctx.strokeStyle='#c8a84e'; ctx.lineWidth=3;
            ctx.shadowColor='#c8a84e'; ctx.shadowBlur=10;
            ctx.beginPath(); ctx.moveTo(sx+Math.cos(this.facingDir)*this.size*0.3, sy+Math.sin(this.facingDir)*this.size*0.3);
            ctx.lineTo(wx,wy); ctx.stroke();
            ctx.shadowBlur=0;
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
            if(e.key==='Escape') window._game?.togglePause();
            if(e.key===' ') e.preventDefault();
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
        const onMove=(cx,cy)=>{
            if(!this.joystick.active) return;
            this.updateJoystick(cx,cy,knob);
        };
        const onEnd=()=>{
            this.joystick.active=false; this.joystick.dx=0; this.joystick.dy=0;
            knob.style.transform='translate(-50%,-50%)';
        };
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
        window._game=this;
    }

    init() {
        this.resize();
        window.addEventListener('resize',()=>this.resize());
        Input.init();
        this.setupUI();
        this.drawBackground();
    }

    resize() {
        this.canvas.width=window.innerWidth;
        this.canvas.height=window.innerHeight;
    }

    drawBackground() {
        // Create a dark battlefield background pattern
        const bgCanvas=document.createElement('canvas');
        bgCanvas.width=CFG.MAP_W; bgCanvas.height=CFG.MAP_H;
        const bgCtx=bgCanvas.getContext('2d');
        // base dark color
        bgCtx.fillStyle='#0d1117'; bgCtx.fillRect(0,0,CFG.MAP_W,CFG.MAP_H);
        // grid
        bgCtx.strokeStyle='rgba(255,255,255,0.03)'; bgCtx.lineWidth=1;
        const gs=64;
        for(let x=0;x<CFG.MAP_W;x+=gs) { bgCtx.beginPath(); bgCtx.moveTo(x,0); bgCtx.lineTo(x,CFG.MAP_H); bgCtx.stroke(); }
        for(let y=0;y<CFG.MAP_H;y+=gs) { bgCtx.beginPath(); bgCtx.moveTo(0,y); bgCtx.lineTo(CFG.MAP_W,y); bgCtx.stroke(); }
        // random decorative elements
        bgCtx.fillStyle='rgba(255,255,255,0.02)';
        for(let i=0;i<80;i++) {
            bgCtx.beginPath();
            bgCtx.arc(rand(0,CFG.MAP_W),rand(0,CFG.MAP_H),rand(10,40),0,Math.PI*2);
            bgCtx.fill();
        }
        // some darker spots
        bgCtx.fillStyle='rgba(0,0,0,0.3)';
        for(let i=0;i<20;i++) {
            bgCtx.beginPath();
            bgCtx.arc(rand(0,CFG.MAP_W),rand(0,CFG.MAP_H),rand(50,150),0,Math.PI*2);
            bgCtx.fill();
        }
        this.bgImage=bgCanvas;
    }

    start() {
        this.running=true; this.paused=false;
        this.time=0; this.score=0; this.kills=0; this.collectedGold=0;
        this.enemies=[]; this.projectiles=[]; this.particles=[]; this.pickups=[];
        this.cam={x:CFG.MAP_W/2-this.canvas.width/2, y:CFG.MAP_H/2-this.canvas.height/2};
        this.shake=0; this.enemySpawnTimer=0; this.difficulty=1; this.bossSpawned=false;
        this.player=new Player(DB.data.permUpgrades);
        this.lastTime=performance.now();
        this.loop();
    }

    loop() {
        if(!this.running) return;
        const now=performance.now();
        let dt=(now-this.lastTime)/1000;
        this.lastTime=now;
        if(dt>0.1) dt=0.1; // cap delta to avoid spiral of death
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
        // update player
        p.update(dt);
        // update enemies
        for(let i=this.enemies.length-1;i>=0;i--) {
            this.enemies[i].update(dt,p);
            if(this.enemies[i].dead) this.enemies.splice(i,1);
        }
        // update projectiles
        for(let i=this.projectiles.length-1;i>=0;i--) {
            this.projectiles[i].update(dt);
            const proj=this.projectiles[i];
            if(proj.dead) { this.projectiles.splice(i,1); continue; }
            // collision with enemies
            for(const e of this.enemies) {
                if(proj.hit.has(e)) continue;
                if(dist(proj,e)<(proj.size+e.size)/2) {
                    proj.hit.add(e);
                    e.takeDamage(proj.damage,this);
                    proj.pierce--;
                    if(proj.pierce<=0) { proj.dead=true; break; }
                }
            }
        }
        // update particles
        for(let i=this.particles.length-1;i>=0;i--) {
            this.particles[i].update(dt);
            if(this.particles[i].dead) this.particles.splice(i,1);
        }
        // update pickups
        for(let i=this.pickups.length-1;i>=0;i--) {
            this.pickups[i].update(dt,p,p.getMagnetRange(),this);
            if(this.pickups[i].dead) this.pickups.splice(i,1);
        }
        // enemy collision with player (with contact damage cooldown)
        if(p.contactDmgTimer<=0) {
            for(const e of this.enemies) {
                if(dist(e,p)<(e.size+p.size)/2) {
                    p.takeDamage(e.damage);
                    p.contactDmgTimer=0.5; // 0.5秒接触伤害冷却
                    break;
                }
            }
        }
        // spawn enemies
        this.enemySpawnTimer-=dt;
        if(this.enemySpawnTimer<=0) {
            this.spawnWave();
            this.enemySpawnTimer=Math.max(0.5,2.5-this.time/300);
        }
        // difficulty scaling
        this.difficulty=1+this.time/60;
        // boss every 3 minutes
        const mins=Math.floor(this.time/60);
        if(mins>0&&mins%3===0&&!this.bossSpawned) {
            this.bossSpawned=true;
            this.spawnEnemy('boss',5);
        }
        if(mins%3!==0) this.bossSpawned=false;
        // camera
        this.cam.x=lerp(this.cam.x, p.x-this.canvas.width/2, 0.08);
        this.cam.y=lerp(this.cam.y, p.y-this.canvas.height/2, 0.08);
        // shake
        if(this.shake>0) {
            this.shake-=dt;
            this.cam.x+=Math.sin(this.shake*50)*5*this.shake;
            this.cam.y+=Math.cos(this.shake*50)*5*this.shake;
        }
        // check player death
        if(p.dead) this.gameOver();
        // update HUD
        this.updateHUD();
    }

    spawnWave() {
        const count=Math.floor(2+this.time/25);
        for(let i=0;i<count;i++) {
            const types=['wraith','skeleton','zombie','demon'];
            const weights=[30,25,25,20];
            // adjust weights based on time
            if(this.time<30) { weights[0]=50; weights[1]=30; weights[2]=20; weights[3]=0; }
            else if(this.time<120) { weights[0]=30; weights[1]=30; weights[2]=25; weights[3]=15; }
            else { weights[0]=20; weights[1]=25; weights[2]=30; weights[3]=25; }
            const type=this.weightedRandom(types,weights);
            this.spawnEnemy(type,1);
        }
    }

    spawnEnemy(type, count) {
        for(let i=0;i<count;i++) {
            const a=rand(0,Math.PI*2);
            const r=Math.max(this.canvas.width,this.canvas.height)*0.9+rand(100,250);
            const x=this.player.x+Math.cos(a)*r;
            const y=this.player.y+Math.sin(a)*r;
            const ex=clamp(x,30,CFG.MAP_W-30);
            const ey=clamp(y,30,CFG.MAP_H-30);
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
        for(let i=0;i<count;i++) {
            this.pickups.push(new Pickup(
                x+rand(-10,10), y+rand(-10,10), 'xp', Math.ceil(value/count)
            ));
        }
    }

    spawnGold(x,y,value) {
        this.pickups.push(new Pickup(x,y,'gold',value));
    }

    getNearestEnemy(x,y) {
        let nearest=null, minD=Infinity;
        for(const e of this.enemies) { const d=dist(e,{x,y}); if(d<minD) { minD=d; nearest=e; } }
        return nearest;
    }

    render() {
        const ctx=this.ctx;
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        // background
        if(this.bgImage) {
            const sx=this.cam.x, sy=this.cam.y;
            const sw=this.canvas.width, sh=this.canvas.height;
            ctx.drawImage(this.bgImage, sx,sy,sw,sh, 0,0,sw,sh);
        } else {
            ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
        // entities
        for(const pk of this.pickups) pk.draw(ctx,this.cam);
        for(const e of this.enemies) e.draw(ctx,this.cam);
        if(this.player) this.player.draw(ctx,this.cam);
        for(const proj of this.projectiles) proj.draw(ctx,this.cam);
        for(const pt of this.particles) pt.draw(ctx,this.cam);
        // death aura visual
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
        document.getElementById('hpHpBar').style.width=(hpR*100)+'%';
        document.getElementById('hpText').textContent=Math.ceil(p.hp)+'/'+p.getTotalHp();
        const xpR=p.xp/p.xpToNext;
        document.getElementById('hudXpBar').style.width=(xpR*100)+'%';
        document.getElementById('hudLevel').textContent=p.level;
        const m=Math.floor(this.time/60), s=Math.floor(this.time%60);
        document.getElementById('hudTime').textContent=m+':'+String(s).padStart(2,'0');
        document.getElementById('hudKills').textContent=this.kills;
        document.getElementById('hudScore').textContent=Math.floor(this.score);
    }

    showLevelUp() {
        this.paused=true;
        const opts=this.generateLevelUpOptions();
        const container=document.getElementById('levelUpOptions');
        container.innerHTML='';
        opts.forEach(opt=>{
            const div=document.createElement('div');
            div.className='option-btn';
            const rarityLabel=opt.rarity?` [${opt.rarity==='rare'?'稀有':'罕见'}]`:'';
            div.innerHTML=`
                <span class="op-name">${opt.icon} ${opt.name}${rarityLabel}</span>
                <span class="op-desc">${opt.desc}</span>
            `;
            div.onclick=()=>{
                this.player.applyUpgrade(opt);
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
        // filter: don't offer new weapon if we have all
        const hasAll=Object.keys(CFG.WEAPONS).every(id=>this.player.weapons.hasWeapon(id));
        const hasUpgradeable=this.player.weapons.getUpgradeableWeapons().length>0;
        const filtered=pool.filter(o=>{
            if(o.type==='weapon'&&o.id==='newWeapon'&&hasAll) return false;
            if(o.type==='weapon'&&o.id==='upgradeWeapon'&&!hasUpgradeable) return false;
            return true;
        });
        // weighted random selection
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
        DB.data.totalKills+=this.kills;
        DB.data.totalGames++;
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
        // Main menu buttons
        document.getElementById('btnStart').onclick=()=>{
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('gameScreen').classList.remove('hidden');
            this.start();
        };
        document.getElementById('btnUpgrade').onclick=()=>this.showPermUpgrades();
        document.getElementById('btnGM').onclick=()=>{
            document.getElementById('gmGold').value=DB.getGold();
            document.getElementById('gmScreen').classList.remove('hidden');
        };
        // Game buttons
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
        document.getElementById('btnCloseUpgrade').onclick=()=>{
            document.getElementById('upgradeScreen').classList.add('hidden');
        };
        document.getElementById('btnCloseGM').onclick=()=>{
            document.getElementById('gmScreen').classList.add('hidden');
        };
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
            const lv=DB.getPermLv(key);
            const maxed=lv>=cfg.maxLv;
            const cost=DB.getPermCost(key);
            const div=document.createElement('div');
            div.className='upgrade-item';
            div.innerHTML=`
                <div class="ui-info">
                    <div class="ui-name">${cfg.name} Lv.${lv}/${cfg.maxLv}</div>
                    <div class="ui-desc">${cfg.desc}</div>
                </div>
                ${maxed?`<span class="ui-maxed">已满级</span>`:`<button class="ui-btn">💰 ${cost}</button>`}
            `;
            if(!maxed) {
                div.querySelector('.ui-btn').onclick=()=>{
                    if(DB.upgradePerm(key)) { this.showPermUpgrades(); this.updateMenuStats(); }
                    else alert('金币不足!');
                };
            }
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
    addGold(n) {
        DB.addGold(n);
        document.getElementById('gmGold').value=DB.getGold();
        if(window._game) window._game.updateMenuStats();
    },
    resetAll() {
        if(confirm('确定要重置所有数据吗?')) {
            DB.resetAll();
            if(window._game) window._game.updateMenuStats();
            alert('已重置');
        }
    },
    maxUpgrades() {
        DB.maxAll();
        if(window._game) window._game.updateMenuStats();
        alert('已满级所有永久强化');
    },
    unlockAll() {
        DB.data.unlockedWeapons=Object.keys(CFG.WEAPONS);
        DB.save();
        alert('已解锁全部武器');
    },
};

// ==================== 启动 ====================
DB.init();
const game = new Game();
game.init();

// prevent page scroll on mobile
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

})();