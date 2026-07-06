/**
 * 火柴人战斗 - RPG动作游戏 v1.0
 * 竖版 | 虚拟摇杆 | 攻击/跳跃/技能 | 场景推进 | BOSS护甲机制
 */
(function(){
'use strict';

// ==================== 绿幕抠图 ====================
const ChromaKey = {
    cache:{},
    process(img,key){
        if(this.cache[key]) return this.cache[key];
        const c=document.createElement('canvas');
        c.width=img.width; c.height=img.height;
        const ctx=c.getContext('2d');
        ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,c.width,c.height);
        const p=data.data;
        for(let i=0;i<p.length;i+=4){
            const r=p[i],g=p[i+1],b=p[i+2];
            if(g>100&&g>r*1.4&&g>b*1.2){
                const gn=Math.min(1,(g-Math.max(r,b))/80);
                p[i+3]=Math.round(255*(1-gn));
            }
        }
        ctx.putImageData(data,0,0);
        this.cache[key]=c;
        return c;
    },
    clear(){this.cache={};}
};

// ==================== 资源路径 ====================
const IMG={
    player:'assets/images/stickman_player.jpg',
    enemySword:'assets/images/stickman_enemy_sword.jpg',
    enemySpear:'assets/images/stickman_enemy_spear.jpg',
    enemyAxe:'assets/images/stickman_enemy_axe.jpg',
    boss:'assets/images/stickman_boss.jpg',
    weaponSword:'assets/images/weapon_sword.jpg',
    weaponStaff:'assets/images/weapon_staff.jpg',
    weaponKnife:'assets/images/weapon_knife.jpg',
    weaponSpear:'assets/images/weapon_spear.jpg',
};

// ==================== 配置 ====================
const CFG={
    PLAYER:{hp:100,atk:15,spd:3.5,jumpForce:12,atkCooldown:0.35,skillCooldown:5,skillDmgMul:2.5},
    WEAPONS:{
        sword:{name:'剑',atkMul:1.0,range:55,speed:1.0},
        staff:{name:'棍',atkMul:0.8,range:65,speed:1.2},
        knife:{name:'刀',atkMul:1.3,range:40,speed:0.85},
        spear:{name:'枪',atkMul:1.1,range:70,speed:0.9},
    },
    ENEMIES:{
        sword:{name:'剑士',hp:40,atk:8,spd:1.5,atkRange:50,sight:300,atkCd:1.5,dodge:0.3,xp:20},
        spear:{name:'枪兵',hp:35,atk:10,spd:1.8,atkRange:65,sight:320,atkCd:1.8,dodge:0.25,xp:25},
        axe:{name:'斧兵',hp:55,atk:14,spd:1.2,atkRange:40,sight:280,atkCd:2.0,dodge:0.15,xp:35},
    },
    BOSS_CFG:{hp:300,armor:150,atk:20,spd:1.0,atkRange:60,sight:400,atkCd:2.5,stunDuration:6,xp:200},
    SCENES:[
        {id:1,name:'草原',sky:'#87CEEB',ground:'#7ec850',enemies:[{type:'sword',count:3}],boss:false,width:1800},
        {id:2,name:'森林',sky:'#5a8a3c',ground:'#4a6a2c',enemies:[{type:'spear',count:3}],boss:false,width:2000},
        {id:3,name:'洞穴',sky:'#3a2a1a',ground:'#5a4a3a',enemies:[{type:'axe',count:4}],boss:false,width:2200},
        {id:4,name:'BOSS·暗影将军',sky:'#2a1a2a',ground:'#4a2a3a',enemies:[],boss:true,width:1600,bossName:'暗影将军'},
        {id:5,name:'山道',sky:'#8a8a7a',ground:'#6a6a5a',enemies:[{type:'sword',count:2},{type:'spear',count:2}],boss:false,width:2400},
        {id:6,name:'火山',sky:'#cc4400',ground:'#884422',enemies:[{type:'axe',count:4}],boss:false,width:2000},
        {id:7,name:'城堡',sky:'#4a4a6a',ground:'#3a3a5a',enemies:[{type:'spear',count:2},{type:'axe',count:2}],boss:false,width:2400},
        {id:8,name:'BOSS·暗影之王',sky:'#1a0000',ground:'#2a0a0a',enemies:[],boss:true,width:1600,bossName:'暗影之王',finalBoss:true},
    ],
    SAVE_KEY:'stickman_rpg_v1',
};

// ==================== 存档 ====================
const DB={
    data:{scene:1,weapon:'sword',maxScene:1},
    init(){
        try{
            const raw=localStorage.getItem(CFG.SAVE_KEY);
            if(raw) this.data=Object.assign(this.data,JSON.parse(raw));
            this.save();
        }catch(e){}
    },
    save(){try{localStorage.setItem(CFG.SAVE_KEY,JSON.stringify(this.data));}catch(e){}}
};

// ==================== 图片加载 ====================
const Assets={
    loaded:{},total:0,count:0,
    loadAll(){
        const urls=[];
        for(const k in IMG) urls.push({key:k,url:IMG[k]});
        this.total=urls.length;
        return Promise.all(urls.map(item=>this.loadImage(item.key,item.url)));
    },
    loadImage(key,url){
        return new Promise((resolve)=>{
            const img=new Image();
            img.onload=()=>{
                this.loaded[key]=img;
                ChromaKey.process(img,key);
                this.count++;
                const pct=Math.floor(this.progress()*100);
                const bar=document.getElementById('loadBar');
                const txt=document.getElementById('loadText');
                if(bar) bar.style.width=pct+'%';
                if(txt) txt.textContent='加载中... '+pct+'%';
                resolve();
            };
            img.onerror=()=>{this.count++;resolve();};
            img.src=url;
        });
    },
    getSprite(key){
        const img=this.loaded[key];
        if(!img) return null;
        return ChromaKey.process(img,key);
    },
    progress(){return this.total>0?this.count/this.total:0;}
};

// ==================== 工具 ====================
function rand(min,max){return Math.random()*(max-min)+min;}
function randInt(min,max){return Math.floor(rand(min,max+1));}
function clamp(v,min,max){return Math.max(min,Math.min(v,max));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}

// ==================== 粒子 ====================
class Particle{
    constructor(x,y,opts={}){
        this.x=x;this.y=y;this.vx=opts.vx||rand(-1,1);this.vy=opts.vy||rand(-1,1);
        this.life=opts.life||0.5;this.maxLife=this.life;this.color=opts.color||'#fff';
        this.size=opts.size||3;this.dead=false;this.gravity=opts.gravity||0;
        this.shrink=opts.shrink!==false;
    }
    update(dt){
        this.x+=this.vx*60*dt;this.y+=this.vy*60*dt;
        this.vy+=this.gravity*60*dt;
        this.life-=dt;if(this.life<=0) this.dead=true;
    }
    draw(ctx,camX){
        const a=this.life/this.maxLife;
        ctx.globalAlpha=a;ctx.fillStyle=this.color;
        const s=this.shrink?this.size*a:this.size;
        ctx.beginPath();ctx.arc(this.x-camX,this.y,s,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
    }
}

// ==================== 玩家 ====================
class Player{
    constructor(x,y){
        this.x=x;this.y=y;this.vx=0;this.vy=0;
        this.width=30;this.height=60;
        this.maxHp=CFG.PLAYER.hp;this.hp=this.maxHp;
        this.atk=CFG.PLAYER.atk;
        this.spd=CFG.PLAYER.spd;
        this.facingRight=true;
        this.grounded=false;
        this.atkTimer=0;this.skillTimer=0;
        this.invulnTimer=0;
        this.attacking=false;this.attackFrame=0;
        this.skilling=false;this.skillFrame=0;
        this.weapon='sword';
        this.sprite=Assets.getSprite('player');
        this.animTimer=0;
        this.hitFlash=0;
    }
    getWeaponCfg(){return CFG.WEAPONS[this.weapon]||CFG.WEAPONS.sword;}
    getAtk(){return Math.floor(this.atk*this.getWeaponCfg().atkMul);}
    getAtkRange(){return this.getWeaponCfg().range;}
    update(dt,joystick,gameW,gameH,worldW,groundY){
        this.animTimer+=dt;
        this.atkTimer=Math.max(0,this.atkTimer-dt);
        this.skillTimer=Math.max(0,this.skillTimer-dt);
        this.invulnTimer=Math.max(0,this.invulnTimer-dt);
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        // 移动
        const wcfg=this.getWeaponCfg();
        this.vx=joystick.dx*this.spd*wcfg.speed;
        if(Math.abs(this.vx)>0.1) this.facingRight=this.vx>0;
        // 跳跃
        if(joystick.jumpPressed&&this.grounded){
            this.vy=-CFG.PLAYER.jumpForce;
            this.grounded=false;
            joystick.jumpPressed=false;
        }
        // 重力
        this.vy+=25*dt;
        // 位置更新
        this.x+=this.vx*60*dt;
        this.y+=this.vy*60*dt;
        // 地面碰撞
        if(this.y+this.height/2>=groundY){
            this.y=groundY-this.height/2;
            this.vy=0;
            this.grounded=true;
        }else{
            this.grounded=false;
        }
        // 边界
        this.x=clamp(this.x,this.width/2,worldW-this.width/2);
        if(this.y<-100) this.y=-100;
        // 攻击动画
        if(this.attacking){
            this.attackFrame+=dt*12;
            if(this.attackFrame>=1){this.attacking=false;this.attackFrame=0;}
        }
        if(this.skilling){
            this.skillFrame+=dt*8;
            if(this.skillFrame>=1){this.skilling=false;this.skillFrame=0;}
        }
    }
    attack(){
        if(this.atkTimer>0||this.attacking) return null;
        this.atkTimer=this.getWeaponCfg().speed*CFG.PLAYER.atkCooldown;
        this.attacking=true;this.attackFrame=0;
        const dir=this.facingRight?1:-1;
        return {
            x:this.x+dir*25,
            y:this.y-5,
            w:this.getAtkRange(),
            h:40,
            damage:this.getAtk(),
            knockback:dir*4,
            color:'#ffdd44'
        };
    }
    skill(){
        if(this.skillTimer>0||this.skilling) return null;
        this.skillTimer=CFG.PLAYER.skillCooldown;
        this.skilling=true;this.skillFrame=0;
        const dir=this.facingRight?1:-1;
        return {
            x:this.x+dir*30,
            y:this.y-15,
            w:this.getAtkRange()*1.5,
            h:60,
            damage:Math.floor(this.getAtk()*CFG.PLAYER.skillDmgMul),
            knockback:dir*8,
            color:'#ff6644',
            isSkill:true
        };
    }
    takeDamage(dmg){
        if(this.invulnTimer>0) return;
        this.hp-=dmg;
        this.invulnTimer=0.3;
        this.hitFlash=0.15;
        this.vy=-3;
        if(this.hp<=0) this.hp=0;
    }
    heal(amount){
        this.hp=Math.min(this.maxHp,this.hp+amount);
    }
    draw(ctx,camX,groundY){
        if(this.invulnTimer>0&&Math.floor(this.invulnTimer*20)%2===0) return;
        const sx=this.x-camX;
        const sy=this.y;
        ctx.save();
        ctx.translate(sx,sy);
        if(!this.facingRight) ctx.scale(-1,1);
        if(this.hitFlash>0){ctx.globalAlpha=0.5+Math.sin(this.hitFlash*30)*0.3;}
        // 绘制火柴人
        this.drawStickman(ctx,0,0);
        ctx.restore();
    }
    drawStickman(ctx,ox,oy){
        const h=this.height;
        const bodyLen=h*0.25;
        // 身体
        ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.3);ctx.lineTo(ox,oy+bodyLen*0.7);ctx.stroke();
        // 头
        ctx.fillStyle='#222';ctx.beginPath();ctx.arc(ox,oy-bodyLen*0.3-8,9,0,Math.PI*2);ctx.fill();
        // 表情
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ox-3,oy-bodyLen*0.3-10,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(ox+3,oy-bodyLen*0.3-10,2,0,Math.PI*2);ctx.fill();
        // 腿
        ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);
        ctx.lineTo(ox-12,oy+h*0.45);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);
        ctx.lineTo(ox+12,oy+h*0.45);ctx.stroke();
        // 手臂
        const armAngle=this.attacking?0.5:this.skilling?0.8:0;
        const armLen=bodyLen*0.8;
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
        ctx.lineTo(ox+Math.cos(Math.PI*0.3+armAngle)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3+armAngle)*armLen);
        ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
        ctx.lineTo(ox-Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);
        ctx.stroke();
        // 武器
        if(this.attacking||this.skilling){
            ctx.strokeStyle=this.skilling?'#ff6644':'#ffdd44';ctx.lineWidth=4;
            const wx=ox+Math.cos(Math.PI*0.3+armAngle)*armLen*1.5;
            const wy=oy-bodyLen*0.1-Math.sin(Math.PI*0.3+armAngle)*armLen*1.5;
            ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
            ctx.lineTo(wx,wy);ctx.stroke();
            // 攻击特效
            ctx.strokeStyle=this.skilling?'rgba(255,100,50,0.6)':'rgba(255,220,80,0.5)';
            ctx.lineWidth=6;
            ctx.beginPath();ctx.arc(wx,wy,15,0,Math.PI*2);ctx.stroke();
        }
    }
}

// ==================== 敌人 ====================
class Enemy{
    constructor(type,x,y,groundY,idx){
        const cfg=CFG.ENEMIES[type];
        this.cfg=cfg;this.type=type;this.name=cfg.name;
        this.x=x;this.y=y;this.groundY=groundY;
        this.maxHp=cfg.hp;this.hp=this.maxHp;
        this.atk=cfg.atk;this.spd=cfg.spd;
        this.atkRange=cfg.atkRange;this.sight=cfg.sight;
        this.atkCd=cfg.atkCd;this.dodge=cfg.dodge;
        this.width=30;this.height=58;
        this.facingRight=false;
        this.vx=0;this.vy=0;
        this.state='idle'; // idle patrol chase attack dodge hitstun dead
        this.stateTimer=rand(0.5,2);
        this.atkTimer=0;
        this.hitFlash=0;this.hitStunTimer=0;
        this.dead=false;this.deathTimer=0;
        this.attacking=false;this.attackFrame=0;
        this.patrolDir=rand(0,1)<0.5?-1:1;
        this.patrolBase=this.x;
        this.animTimer=rand(0,10);
        this.idx=idx||0;
        this.sprite=Assets.getSprite('enemy'+type.charAt(0).toUpperCase()+type.slice(1));
    }
    update(dt,player,playerAttacking){
        if(this.dead){this.deathTimer+=dt;return;}
        this.animTimer+=dt;
        this.atkTimer=Math.max(0,this.atkTimer-dt);
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        this.hitStunTimer=Math.max(0,this.hitStunTimer-dt);
        if(this.hitStunTimer>0){this.state='hitstun';this.vx*=0.9;this.x+=this.vx*60*dt;return;}
        const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
        this.facingRight=player.x>this.x;
        // AI状态机
        switch(this.state){
            case 'idle':
                this.stateTimer-=dt;
                if(this.stateTimer<=0){this.state='patrol';this.stateTimer=rand(1,3);this.patrolDir=rand(0,1)<0.5?-1:1;}
                if(d<this.sight) this.state='chase';
                break;
            case 'patrol':
                this.vx=this.spd*this.patrolDir*0.5;
                this.stateTimer-=dt;
                if(this.stateTimer<=0){this.state='idle';this.stateTimer=rand(1,3);}
                if(d<this.sight) this.state='chase';
                if(Math.abs(this.x-this.patrolBase)>80) this.patrolDir*=-1;
                break;
            case 'chase':
                this.vx=(this.facingRight?1:-1)*this.spd;
                if(d<this.atkRange&&this.atkTimer<=0){
                    this.state='attack';this.attacking=true;this.attackFrame=0;this.atkTimer=this.atkCd;
                }
                if(d>this.sight*1.2){this.state='idle';this.stateTimer=rand(1,2);}
                if(playerAttacking&&d<80&&Math.random()<this.dodge){
                    this.state='dodge';this.stateTimer=0.4;
                    this.vx=(this.facingRight?-1:1)*this.spd*2;
                }
                break;
            case 'attack':
                this.vx*=0.8;
                if(this.attacking){this.attackFrame+=dt*8;if(this.attackFrame>=1){this.attacking=false;this.attackFrame=0;}}
                if(!this.attacking&&this.attackFrame===0){this.state='chase';}
                break;
            case 'dodge':
                this.stateTimer-=dt;this.vx*=0.95;
                if(this.stateTimer<=0){this.state='chase';}
                break;
        }
        this.x+=this.vx*60*dt;
        this.y=this.groundY-this.height/2;
        // 攻击动画
        if(this.attacking&&this.attackFrame>0.6&&this.attackFrame<0.65){
            // 攻击判定在动画中间帧
            this.doAttack(player);
        }
    }
    doAttack(player){
        const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
        if(d<this.atkRange+20){
            player.takeDamage(this.atk);
        }
    }
    takeDamage(dmg,knockback){
        this.hp-=dmg;this.hitFlash=0.1;this.hitStunTimer=0.15;
        this.vx=knockback||0;
        if(this.hp<=0){this.die();return true;}
        return false;
    }
    die(){
        this.dead=true;this.state='dead';
        this.deathTimer=0;
    }
    draw(ctx,camX){
        if(this.dead&&this.deathTimer>0.5) return;
        const sx=this.x-camX;const sy=this.y;
        ctx.save();
        ctx.translate(sx,sy);
        if(this.dead){ctx.globalAlpha=1-this.deathTimer*2;ctx.rotate(this.deathTimer*3);}
        if(!this.facingRight) ctx.scale(-1,1);
        if(this.hitFlash>0){ctx.globalAlpha=0.5;}
        this.drawStickman(ctx,0,0);
        ctx.restore();
        // 血条
        if(!this.dead) this.drawHealthBar(ctx,camX);
    }
    drawStickman(ctx,ox,oy){
        const h=this.height;
        const bodyLen=h*0.25;
        ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.3);ctx.lineTo(ox,oy+bodyLen*0.7);ctx.stroke();
        // 头
        ctx.fillStyle='#c22';ctx.beginPath();ctx.arc(ox,oy-bodyLen*0.3-8,9,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ox-3,oy-bodyLen*0.3-9,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(ox+3,oy-bodyLen*0.3-9,2,0,Math.PI*2);ctx.fill();
        // 腿
        ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);
        ctx.lineTo(ox-12,oy+h*0.45);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);
        ctx.lineTo(ox+12,oy+h*0.45);ctx.stroke();
        // 手臂
        const armLen=bodyLen*0.8;
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
        ctx.lineTo(ox+Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);
        ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
        ctx.lineTo(ox-Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);
        ctx.stroke();
        // 武器标记
        ctx.strokeStyle='#666';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(ox+Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);
        ctx.lineTo(ox+Math.cos(Math.PI*0.3)*armLen*1.8,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen*1.8);
        ctx.stroke();
    }
    drawHealthBar(ctx,camX){
        const sx=this.x-camX;const sy=this.y-this.height/2-15;
        const bw=36,bh=5;
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
        const hpR=this.hp/this.maxHp;
        const hpGrad=ctx.createLinearGradient(sx-bw/2,0,sx+bw/2,0);
        hpGrad.addColorStop(0,'#ff3333');hpGrad.addColorStop(1,'#ff3333');
        ctx.fillStyle=hpGrad;ctx.fillRect(sx-bw/2,sy,bw*hpR,bh);
        ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
        ctx.fillText(Math.ceil(this.hp)+'/'+this.maxHp,sx,sy-2);
        ctx.textAlign='start';
    }
}

// ==================== BOSS ====================
class Boss extends Enemy{
    constructor(type,x,y,groundY,cfgOverride){
        super('sword',x,y,groundY,0);
        const bcfg=cfgOverride||CFG.BOSS_CFG;
        this.maxHp=bcfg.hp;this.hp=this.maxHp;
        this.armor=bcfg.armor;this.armorMax=bcfg.armor;
        this.atk=bcfg.atk;this.spd=bcfg.spd;
        this.atkRange=bcfg.atkRange;this.sight=bcfg.sight;
        this.atkCd=bcfg.atkCd;
        this.stunDuration=bcfg.stunDuration;
        this.width=40;this.height=80;
        this.stunned=false;this.stunTimer=0;
        this.name=cfgOverride.bossName||'BOSS';
        this.sprite=Assets.getSprite('boss');
    }
    update(dt,player,playerAttacking){
        if(this.dead){this.deathTimer+=dt;return;}
        this.animTimer+=dt;
        this.atkTimer=Math.max(0,this.atkTimer-dt);
        this.hitFlash=Math.max(0,this.hitFlash-dt);
        // 眩晕
        if(this.stunned){
            this.stunTimer-=dt;
            if(this.stunTimer<=0){
                this.stunned=false;
                this.armor=this.armorMax;
            }
            return;
        }
        const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
        this.facingRight=player.x>this.x;
        // 追逐
        this.vx=(this.facingRight?1:-1)*this.spd;
        if(d<this.atkRange&&this.atkTimer<=0){
            this.attacking=true;this.attackFrame=0;this.atkTimer=this.atkCd;
        }
        this.x+=this.vx*60*dt;
        this.y=this.groundY-this.height/2;
        // 攻击
        if(this.attacking){this.attackFrame+=dt*6;if(this.attackFrame>=1){this.attacking=false;this.attackFrame=0;}}
        if(this.attacking&&this.attackFrame>0.5&&this.attackFrame<0.55){
            this.doAttack(player);
        }
    }
    doAttack(player){
        const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
        if(d<this.atkRange+30){
            player.takeDamage(this.atk);
        }
    }
    takeDamage(dmg,knockback){
        if(this.stunned){
            this.hp-=dmg;this.hitFlash=0.1;
            if(this.hp<=0){this.die();return true;}
            return false;
        }
        if(this.armor>0){
            this.armor-=dmg;this.hitFlash=0.08;
            if(this.armor<=0){
                this.armor=0;
                this.stunned=true;
                this.stunTimer=this.stunDuration;
            }
            return false;
        }
        this.hp-=dmg;this.hitFlash=0.1;
        if(this.hp<=0){this.die();return true;}
        return false;
    }
    draw(ctx,camX){
        if(this.dead&&this.deathTimer>0.5) return;
        const sx=this.x-camX;const sy=this.y;
        ctx.save();
        ctx.translate(sx,sy);
        if(this.dead){ctx.globalAlpha=1-this.deathTimer*2;ctx.rotate(this.deathTimer*3);}
        if(!this.facingRight) ctx.scale(-1,1);
        if(this.hitFlash>0&&!this.stunned){ctx.globalAlpha=0.5;}
        if(this.stunned){
            ctx.globalAlpha=0.4+Math.sin(Date.now()*0.02)*0.3;
        }
        this.drawBossStickman(ctx,0,0);
        ctx.restore();
        // 血条和护甲条
        if(!this.dead) this.drawBossBars(ctx,camX);
    }
    drawBossStickman(ctx,ox,oy){
        const h=this.height;
        const bodyLen=h*0.28;
        // 身体
        ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.3);ctx.lineTo(ox,oy+bodyLen*0.7);ctx.stroke();
        // 护甲外框
        ctx.strokeStyle='#555';ctx.lineWidth=2;
        ctx.strokeRect(ox-12,oy-bodyLen*0.2-2,24,bodyLen*1.1);
        // 头
        ctx.fillStyle='#111';ctx.beginPath();ctx.arc(ox,oy-bodyLen*0.3-12,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#f00';ctx.beginPath();ctx.arc(ox-4,oy-bodyLen*0.3-14,3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(ox+4,oy-bodyLen*0.3-14,3,0,Math.PI*2);ctx.fill();
        // 角
        ctx.strokeStyle='#111';ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(ox-8,oy-bodyLen*0.3-22);ctx.lineTo(ox-14,oy-bodyLen*0.3-32);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox+8,oy-bodyLen*0.3-22);ctx.lineTo(ox+14,oy-bodyLen*0.3-32);ctx.stroke();
        // 腿
        ctx.lineWidth=5;
        ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox-16,oy+h*0.45);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+16,oy+h*0.45);ctx.stroke();
        // 手臂
        const armLen=bodyLen*0.9;
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
        ctx.lineTo(ox+Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);
        ctx.stroke();
        ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
        ctx.lineTo(ox-Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);
        ctx.stroke();
        // 大武器
        if(this.attacking){
            ctx.strokeStyle='#ff4444';ctx.lineWidth=6;
            ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
            ctx.lineTo(ox+Math.cos(Math.PI*0.3)*armLen*2,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen*2);
            ctx.stroke();
        }
    }
    drawBossBars(ctx,camX){
        const sx=this.x-camX;const sy=this.y-this.height/2-20;
        const bw=50,bh=5;
        // 护甲条
        if(this.armorMax>0){
            ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
            const arR=this.armor/this.armorMax;
            ctx.fillStyle='#4488ff';ctx.fillRect(sx-bw/2,sy,bw*arR,bh);
            ctx.fillStyle='#fff';ctx.font='bold 7px sans-serif';ctx.textAlign='center';
            ctx.fillText('护甲',sx,sy-2);
        }
        // 血条
        const sy2=sy-8;
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy2,bw,bh);
        const hpR=this.hp/this.maxHp;
        ctx.fillStyle='#ff3333';ctx.fillRect(sx-bw/2,sy2,bw*hpR,bh);
        ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
        ctx.fillText(this.name+' '+Math.ceil(this.hp)+'/'+this.maxHp,sx,sy2-2);
        if(this.stunned){
            ctx.fillStyle='#ffcc00';ctx.font='bold 12px sans-serif';
            ctx.fillText('眩晕 '+Math.ceil(this.stunTimer)+'s',sx,sy-30);
        }
        ctx.textAlign='start';
    }
}

// ==================== 虚拟摇杆 ====================
class Joystick{
    constructor(){
        this.baseX=0;this.baseY=0;this.thumbX=0;this.thumbY=0;
        this.active=false;this.touchId=null;
        this.dx=0;this.dy=0;
        this.jumpPressed=false;
    }
    setBase(x,y){
        this.baseX=x;this.baseY=y;this.thumbX=x;this.thumbY=y;
    }
    handleDown(tx,ty,touchId){
        const jd=dist({x:tx,y:ty},{x:this.baseX,y:this.baseY});
        if(jd<80){
            this.active=true;this.touchId=touchId;
            this.updateThumb(tx,ty);
        }
        return this.active;
    }
    handleMove(tx,ty,touchId){
        if(this.active&&this.touchId===touchId){
            this.updateThumb(tx,ty);
            return true;
        }
        return false;
    }
    handleUp(touchId){
        if(this.touchId===touchId){
            this.active=false;this.touchId=null;
            this.thumbX=this.baseX;this.thumbY=this.baseY;
            this.dx=0;this.dy=0;
            return true;
        }
        return false;
    }
    updateThumb(tx,ty){
        let dx=tx-this.baseX;let dy=ty-this.baseY;
        const d=Math.sqrt(dx*dx+dy*dy);const maxR=60;
        if(d>maxR){dx=dx/d*maxR;dy=dy/d*maxR;}
        this.thumbX=this.baseX+dx;this.thumbY=this.baseY+dy;
        this.dx=dx/maxR;this.dy=dy/maxR;
    }
    draw(ctx){
        // 底座
        ctx.fillStyle='rgba(255,255,255,0.1)';ctx.strokeStyle='rgba(255,255,255,0.25)';
        ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(this.baseX,this.baseY,60,0,Math.PI*2);ctx.fill();ctx.stroke();
        // 内圈
        ctx.fillStyle='rgba(255,255,255,0.05)';
        ctx.beginPath();ctx.arc(this.baseX,this.baseY,40,0,Math.PI*2);ctx.fill();
        // 拇指
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.beginPath();ctx.arc(this.thumbX,this.thumbY,22,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.5)';
        ctx.beginPath();ctx.arc(this.thumbX,this.thumbY,22,0,Math.PI*2);ctx.stroke();
        // 十字标记
        ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(this.baseX-10,this.baseY);ctx.lineTo(this.baseX+10,this.baseY);ctx.stroke();
        ctx.beginPath();ctx.moveTo(this.baseX,this.baseY-10);ctx.lineTo(this.baseX,this.baseY+10);ctx.stroke();
    }
}

// ==================== 游戏主类 ====================
class Game{
    constructor(){
        this.canvas=document.getElementById('gameCanvas');
        this.ctx=this.canvas.getContext('2d');
        this.resize();
        this.sceneIdx=DB.data.scene-1;
        this.sceneCfg=CFG.SCENES[this.sceneIdx];
        this.worldW=this.sceneCfg.width;
        this.groundY=this.gameH*0.82;
        this.camX=0;
        this.joystick=new Joystick();
        this.player=new Player(150,this.groundY-60);
        this.player.weapon=DB.data.weapon;
        this.enemies=[];
        this.boss=null;
        this.particles=[];
        this.state='playing'; // playing victory gameover
        this.victoryScene=false;
        this.gameOverCause='';
        this.sceneClear=false;
        this.time=0;
        this.lastTime=0;
        this.shakeTimer=0;
        this.shakeIntensity=0;
        this.initScene();
        this.setupInput();
        this.running=true;
        this.lastTime=performance.now();
        requestAnimationFrame(t=>this.gameLoop(t));
    }
    resize(){
        const w=window.innerWidth;const h=window.innerHeight;
        const ratio=Math.min(w/480,h/800);
        this.gameW=480;this.gameH=800;
        this.canvas.width=480;this.canvas.height=800;
        this.canvas.style.width=(480*ratio)+'px';
        this.canvas.style.height=(800*ratio)+'px';
        this.canvas.style.position='absolute';
        this.canvas.style.left=((w-480*ratio)/2)+'px';
        this.canvas.style.top=((h-800*ratio)/2)+'px';
        this.scale=ratio;
        this.joystick.setBase(90,this.gameH*0.72);
    }
    initScene(){
        this.enemies=[];
        this.boss=null;
        this.sceneClear=false;
        const cfg=this.sceneCfg;
        const spawnArea=this.worldW*0.4;
        if(cfg.boss){
            this.boss=new Boss('sword',spawnArea+rand(0,200),this.groundY-40,this.groundY,{
                hp:CFG.BOSS_CFG.hp+(this.sceneIdx>=7?200:0),
                armor:CFG.BOSS_CFG.armor+(this.sceneIdx>=7?100:0),
                atk:CFG.BOSS_CFG.atk+(this.sceneIdx>=7?10:0),
                spd:CFG.BOSS_CFG.spd,
                atkRange:CFG.BOSS_CFG.atkRange,
                sight:CFG.BOSS_CFG.sight,
                atkCd:CFG.BOSS_CFG.atkCd,
                stunDuration:CFG.BOSS_CFG.stunDuration,
                xp:CFG.BOSS_CFG.xp,
                bossName:cfg.bossName||'BOSS',
                finalBoss:cfg.finalBoss||false,
            });
        }else{
            let idx=0;
            for(const group of cfg.enemies){
                for(let i=0;i<group.count;i++){
                    const ex=spawnArea+rand(i*120,i*120+100);
                    this.enemies.push(new Enemy(group.type,ex,this.groundY-29,this.groundY,idx++));
                }
            }
        }
        // 玩家位置
        this.player.x=100;
        this.player.y=this.groundY-30;
        this.player.vx=0;this.player.vy=0;
        this.player.grounded=true;
        this.camX=0;
    }
    setupInput(){
        // 触摸
        this.canvas.addEventListener('touchstart',e=>this.onTouchStart(e),{passive:false});
        this.canvas.addEventListener('touchmove',e=>this.onTouchMove(e),{passive:false});
        this.canvas.addEventListener('touchend',e=>this.onTouchEnd(e),{passive:false});
        this.canvas.addEventListener('touchcancel',e=>this.onTouchEnd(e),{passive:false});
        // 鼠标
        this.canvas.addEventListener('mousedown',e=>this.onMouseDown(e));
        window.addEventListener('mousemove',e=>this.onMouseMove(e));
        window.addEventListener('mouseup',e=>this.onMouseUp(e));
        // 键盘
        window.addEventListener('keydown',e=>this.onKeyDown(e));
        window.addEventListener('keyup',e=>this.onKeyUp(e));
        // 窗口大小变化
        window.addEventListener('resize',()=>this.resize());
        // 按钮区域
        this.btnAreas={
            skill:{x:this.gameW*0.85,y:this.gameH*0.55,r:this.gameW*0.07},
            jump:{x:this.gameW*0.85,y:this.gameH*0.68,r:this.gameW*0.07},
            attack:{x:this.gameW*0.85,y:this.gameH*0.82,r:this.gameW*0.1},
        };
    }
    screenToGame(clientX,clientY){
        const rect=this.canvas.getBoundingClientRect();
        return {
            x:(clientX-rect.left)/this.scale,
            y:(clientY-rect.top)/this.scale
        };
    }
    onTouchStart(e){
        e.preventDefault();
        for(const t of e.changedTouches){
            const p=this.screenToGame(t.clientX,t.clientY);
            // 游戏结束/胜利点击
            if(this.state==='gameover'||this.state==='victory'){
                this.handleClick(p.x,p.y);
                return;
            }
            if(this.joystick.handleDown(p.x,p.y,t.identifier)) continue;
            const btn=this.checkButton(p.x,p.y);
            if(btn) this.handleButton(btn);
        }
    }
    onTouchMove(e){
        e.preventDefault();
        for(const t of e.changedTouches){
            const p=this.screenToGame(t.clientX,t.clientY);
            this.joystick.handleMove(p.x,p.y,t.identifier);
        }
    }
    onTouchEnd(e){
        for(const t of e.changedTouches){
            this.joystick.handleUp(t.identifier);
        }
    }
    onMouseDown(e){
        const p=this.screenToGame(e.clientX,e.clientY);
        // 游戏结束/胜利点击
        if(this.state==='gameover'||this.state==='victory'){
            this.handleClick(p.x,p.y);
            return;
        }
        if(this.joystick.handleDown(p.x,p.y,'mouse')) return;
        const btn=this.checkButton(p.x,p.y);
        if(btn) this.handleButton(btn);
    }
    onMouseMove(e){
        if(!e.buttons) return;
        const p=this.screenToGame(e.clientX,e.clientY);
        this.joystick.handleMove(p.x,p.y,'mouse');
    }
    onMouseUp(e){
        this.joystick.handleUp('mouse');
    }
    onKeyDown(e){
        switch(e.key){
            case 'ArrowLeft':case 'a':this.joystick.dx=-1;break;
            case 'ArrowRight':case 'd':this.joystick.dx=1;break;
            case 'ArrowUp':case 'w':this.joystick.dy=-1;break;
            case 'ArrowDown':case 's':this.joystick.dy=1;break;
            case 'j':case 'J':this.handleButton('attack');break;
            case 'k':case 'K':this.handleButton('jump');break;
            case 'l':case 'L':this.handleButton('skill');break;
        }
    }
    onKeyUp(e){
        switch(e.key){
            case 'ArrowLeft':case 'a':case 'ArrowRight':case 'd':
                if(!e.ctrlKey&&!e.metaKey) this.joystick.dx=0;break;
            case 'ArrowUp':case 'w':case 'ArrowDown':case 's':
                if(!e.ctrlKey&&!e.metaKey) this.joystick.dy=0;break;
        }
    }
    checkButton(gx,gy){
        for(const k in this.btnAreas){
            const b=this.btnAreas[k];
            if(dist({x:gx,y:gy},{x:b.x,y:b.y})<b.r) return k;
        }
        return null;
    }
    handleButton(btn){
        if(this.state!=='playing') return;
        switch(btn){
            case 'attack':this.playerAttack();break;
            case 'jump':this.joystick.jumpPressed=true;break;
            case 'skill':this.playerSkill();break;
        }
    }
    playerAttack(){
        if(this.state!=='playing') return;
        const hit=this.player.attack();
        if(!hit) return;
        this.checkHit(hit);
    }
    playerSkill(){
        if(this.state!=='playing') return;
        const hit=this.player.skill();
        if(!hit) return;
        this.checkHit(hit);
        this.shakeTimer=0.15;this.shakeIntensity=4;
        for(let i=0;i<20;i++){
            this.particles.push(new Particle(hit.x+hit.w/2,hit.y+hit.h/2,{
                vx:rand(-3,3),vy:rand(-3,1),color:'#ff6644',life:0.5,size:rand(3,6),gravity:1
            }));
        }
    }
    checkHit(hit){
        // 检查敌人
        for(const enemy of this.enemies){
            if(enemy.dead) continue;
            if(this.hitOverlap(hit,enemy)){
                const killed=enemy.takeDamage(hit.damage,hit.knockback);
                this.spawnHitParticles(enemy.x,enemy.y,hit.color);
                if(killed) this.spawnDeathParticles(enemy.x,enemy.y);
            }
        }
        // 检查BOSS
        if(this.boss&&!this.boss.dead){
            if(this.hitOverlap(hit,this.boss)){
                const killed=this.boss.takeDamage(hit.damage,hit.knockback);
                this.spawnHitParticles(this.boss.x,this.boss.y,hit.color);
                if(killed) this.spawnDeathParticles(this.boss.x,this.boss.y);
            }
        }
    }
    hitOverlap(hit,entity){
        return hit.x-hit.w/2<entity.x+entity.width/2&&
               hit.x+hit.w/2>entity.x-entity.width/2&&
               hit.y-hit.h/2<entity.y+entity.height/2&&
               hit.y+hit.h/2>entity.y-entity.height/2;
    }
    spawnHitParticles(x,y,color){
        for(let i=0;i<8;i++){
            this.particles.push(new Particle(x,y,{
                vx:rand(-2,2),vy:rand(-2,1),color:color,life:0.3,size:rand(2,4)
            }));
        }
    }
    spawnDeathParticles(x,y){
        for(let i=0;i<15;i++){
            this.particles.push(new Particle(x,y,{
                vx:rand(-3,3),vy:rand(-3,1),color:'#ffaa00',life:0.6,size:rand(2,5),gravity:0.5
            }));
        }
    }
    checkSceneClear(){
        if(this.sceneClear) return;
        if(this.boss){
            if(this.boss.dead&&this.boss.deathTimer>0.5){
                this.sceneClear=true;
                this.onSceneVictory();
            }
        }else{
            const allDead=this.enemies.every(e=>e.dead);
            if(allDead&&this.enemies.length>0){
                this.sceneClear=true;
                this.onSceneVictory();
            }
        }
    }
    onSceneVictory(){
        if(this.sceneCfg.boss){
            if(this.sceneCfg.finalBoss){
                this.state='victory';
                this.victoryScene=true;
            }
        }
        if(this.sceneIdx>=CFG.SCENES.length-1){
            this.state='victory';this.victoryScene=true;
        }
        // 自动进入下一场景
        setTimeout(()=>{
            if(this.state==='victory') return;
            this.sceneIdx++;
            if(this.sceneIdx>=CFG.SCENES.length){
                this.state='victory';this.victoryScene=true;
                return;
            }
            this.sceneCfg=CFG.SCENES[this.sceneIdx];
            this.worldW=this.sceneCfg.width;
            DB.data.scene=this.sceneIdx+1;
            if(this.sceneIdx+1>DB.data.maxScene) DB.data.maxScene=this.sceneIdx+1;
            DB.save();
            this.initScene();
        },1500);
    }
    gameLoop(timestamp){
        if(!this.running) return;
        const dt=Math.min(0.05,(timestamp-this.lastTime)/1000);
        this.lastTime=timestamp;
        this.time+=dt;
        if(this.state==='playing') this.update(dt);
        this.render();
        requestAnimationFrame(t=>this.gameLoop(t));
    }
    update(dt){
        // 屏幕震动
        if(this.shakeTimer>0) this.shakeTimer=Math.max(0,this.shakeTimer-dt);
        // 玩家
        const playerAttacking=this.player.attacking||this.player.skilling;
        this.player.update(dt,this.joystick,this.gameW,this.gameH,this.worldW,this.groundY);
        // 相机跟随
        const targetCamX=this.player.x-this.gameW/2;
        this.camX+=(targetCamX-this.camX)*0.1;
        this.camX=clamp(this.camX,0,this.worldW-this.gameW);
        // 敌人
        for(const enemy of this.enemies){
            if(!enemy.dead) enemy.update(dt,this.player,playerAttacking);
        }
        if(this.boss&&!this.boss.dead) this.boss.update(dt,this.player,playerAttacking);
        // 粒子
        for(const p of this.particles) p.update(dt);
        this.particles=this.particles.filter(p=>!p.dead);
        // 场景检测
        this.checkSceneClear();
        // 玩家死亡
        if(this.player.hp<=0){
            this.state='gameover';this.gameOverCause='被敌人击败';
        }
        // 重置跳跃
        if(!this.player.grounded) this.joystick.jumpPressed=false;
    }
    render(){
        const ctx=this.ctx;
        const w=this.gameW,h=this.gameH;
        ctx.clearRect(0,0,w,h);
        // 震动偏移
        let sx=0,sy=0;
        if(this.shakeTimer>0){
            sx=rand(-this.shakeIntensity,this.shakeIntensity);
            sy=rand(-this.shakeIntensity,this.shakeIntensity);
        }
        ctx.save();
        ctx.translate(sx,sy);
        // 天空
        ctx.fillStyle=this.sceneCfg.sky;
        ctx.fillRect(0,0,w,h);
        // 远山
        ctx.fillStyle=this.alphaColor(this.sceneCfg.sky,0.7);
        this.drawHills(ctx,0.2);
        // 地面
        ctx.fillStyle=this.sceneCfg.ground;
        ctx.fillRect(0,this.groundY,w,h-this.groundY);
        // 地面线
        ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(0,this.groundY);ctx.lineTo(w,this.groundY);ctx.stroke();
        // 地面纹理
        ctx.fillStyle='rgba(0,0,0,0.05)';
        for(let i=0;i<w;i+=40){
            ctx.fillRect(i-this.camX*0.1,this.groundY+10,20,2);
        }
        // 边界标记
        if(this.camX<=5){
            ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='bold 14px sans-serif';ctx.textAlign='center';
            ctx.fillText('◀',30,h/2);
        }
        if(this.camX>=this.worldW-w-5){
            ctx.fillStyle=(this.sceneClear||this.sceneCfg.boss)?'rgba(255,255,255,0.3)':'rgba(255,100,100,0.5)';
            ctx.font='bold 14px sans-serif';ctx.textAlign='center';
            ctx.fillText(this.sceneClear?'▶ 进入下一关':'▶ 击败敌人',w-30,h/2);
        }
        ctx.textAlign='start';
        // 场景名称
        ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='bold 12px sans-serif';ctx.textAlign='right';
        ctx.fillText('第'+(this.sceneIdx+1)+'关 '+this.sceneCfg.name,w-15,25);
        ctx.textAlign='start';
        // 敌人
        for(const enemy of this.enemies){
            if(!enemy.dead||enemy.deathTimer<0.5) enemy.draw(ctx,this.camX);
        }
        if(this.boss&&(!this.boss.dead||this.boss.deathTimer<0.5)) this.boss.draw(ctx,this.camX);
        // 玩家
        this.player.draw(ctx,this.camX,this.groundY);
        // 粒子
        for(const p of this.particles) p.draw(ctx,this.camX);
        ctx.restore();
        // UI（不受震动影响）
        // 摇杆
        this.joystick.draw(ctx);
        // 按钮
        this.drawButtons(ctx);
        // 玩家血条
        this.drawPlayerHUD(ctx);
        // 武器信息
        this.drawWeaponInfo(ctx);
        // 场景进度
        if(this.sceneClear){
            ctx.fillStyle='rgba(255,204,0,0.8)';ctx.font='bold 20px sans-serif';ctx.textAlign='center';
            ctx.fillText('敌人已清除!',w/2,h/2-40);
            ctx.textAlign='start';
        }
        // 游戏结束
        if(this.state==='gameover'){
            ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,w,h);
            ctx.fillStyle='#ff4444';ctx.font='bold 28px sans-serif';ctx.textAlign='center';
            ctx.fillText('战斗失败',w/2,h/2-30);
            ctx.fillStyle='#fff';ctx.font='16px sans-serif';
            ctx.fillText(this.gameOverCause,w/2,h/2+10);
            ctx.fillStyle='#ffcc00';ctx.font='14px sans-serif';
            ctx.fillText('点击重新开始',w/2,h/2+50);
            ctx.textAlign='start';
        }
        if(this.state==='victory'){
            ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,w,h);
            ctx.fillStyle='#ffcc00';ctx.font='bold 28px sans-serif';ctx.textAlign='center';
            ctx.fillText('恭喜通关!',w/2,h/2-20);
            ctx.fillStyle='#fff';ctx.font='16px sans-serif';
            ctx.fillText('所有敌人已被击败',w/2,h/2+20);
            ctx.fillStyle='#ffcc00';ctx.font='14px sans-serif';
            ctx.fillText('点击返回主菜单',w/2,h/2+60);
            ctx.textAlign='start';
        }
    }
    drawButtons(ctx){
        const ba=this.btnAreas;
        // 攻击按钮
        ctx.fillStyle='rgba(255,80,60,0.3)';ctx.strokeStyle='rgba(255,80,60,0.6)';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(ba.attack.x,ba.attack.y,ba.attack.r,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.textAlign='center';
        ctx.fillText('攻击',ba.attack.x,ba.attack.y+5);
        // 跳跃按钮
        ctx.fillStyle='rgba(80,180,255,0.3)';ctx.strokeStyle='rgba(80,180,255,0.6)';
        ctx.beginPath();ctx.arc(ba.jump.x,ba.jump.y,ba.jump.r,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#fff';ctx.fillText('跳跃',ba.jump.x,ba.jump.y+5);
        // 技能按钮
        ctx.fillStyle='rgba(255,180,60,0.3)';ctx.strokeStyle='rgba(255,180,60,0.6)';
        ctx.beginPath();ctx.arc(ba.skill.x,ba.skill.y,ba.skill.r,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#fff';ctx.fillText('技能',ba.skill.x,ba.skill.y+5);
        // 技能冷却
        if(this.player.skillTimer>0){
            const cdR=this.player.skillTimer/CFG.PLAYER.skillCooldown;
            ctx.fillStyle='rgba(0,0,0,0.5)';
            ctx.beginPath();ctx.arc(ba.skill.x,ba.skill.y,ba.skill.r,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';
            ctx.fillText(Math.ceil(this.player.skillTimer)+'s',ba.skill.x,ba.skill.y+5);
        }
        ctx.textAlign='start';
    }
    drawPlayerHUD(ctx){
        const px=15,py=15;
        // 名字
        ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';
        ctx.fillText('火柴人战士',px,py+12);
        // 血条
        const bw=120,bh=10;
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px,py+20,bw,bh);
        const hpR=this.player.hp/this.player.maxHp;
        const hpGrad=ctx.createLinearGradient(px,0,px+bw,0);
        hpGrad.addColorStop(0,'#ff3333');hpGrad.addColorStop(0.5,'#ff8833');hpGrad.addColorStop(1,'#44cc44');
        ctx.fillStyle=hpGrad;ctx.fillRect(px,py+20,bw*hpR,bh);
        ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';
        ctx.fillText(Math.ceil(this.player.hp)+'/'+this.player.maxHp,px+bw/2-15,py+29);
    }
    drawWeaponInfo(ctx){
        const wcfg=this.player.getWeaponCfg();
        ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='bold 11px sans-serif';ctx.textAlign='right';
        ctx.fillText('武器: '+wcfg.name,this.gameW-15,this.gameH-140);
        ctx.textAlign='start';
    }
    alphaColor(hex,alpha){
        const r=parseInt(hex.slice(1,3),16);
        const g=parseInt(hex.slice(3,5),16);
        const b=parseInt(hex.slice(5,7),16);
        return 'rgba('+r+','+g+','+b+','+alpha+')';
    }
    drawHills(ctx,parallax){
        const offset=this.camX*parallax;
        ctx.beginPath();ctx.moveTo(0,this.groundY);
        for(let i=0;i<this.gameW+100;i+=80){
            const h=20+Math.sin(i*0.02+offset*0.005)*30;
            ctx.lineTo(i,this.groundY-h);
        }
        ctx.lineTo(this.gameW,this.groundY);ctx.closePath();ctx.fill();
    }
    handleClick(gx,gy){
        if(this.state==='gameover'){
            this.restart();
            return;
        }
        if(this.state==='victory'){
            this.goToMenu();
            return;
        }
    }
    restart(){
        this.sceneIdx=DB.data.scene-1;
        this.sceneCfg=CFG.SCENES[this.sceneIdx];
        this.worldW=this.sceneCfg.width;
        this.player.hp=this.player.maxHp;
        this.player.weapon=DB.data.weapon;
        this.state='playing';
        this.gameOverCause='';
        this.victoryScene=false;
        this.initScene();
    }
    goToMenu(){
        this.running=false;
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        updateMenuDisplay();
    }
}

// ==================== 菜单 ====================
function updateMenuDisplay(){
    document.getElementById('menuMaxScene').textContent=DB.data.maxScene;
    document.getElementById('menuWeapon').textContent=CFG.WEAPONS[DB.data.weapon]?.name||'剑';
    // 武器选择
    const wg=document.getElementById('weaponGrid');
    if(wg){
        wg.innerHTML='';
        for(const k in CFG.WEAPONS){
            const wcfg=CFG.WEAPONS[k];
            const div=document.createElement('div');
            div.className='weapon-btn'+(DB.data.weapon===k?' selected':'');
            div.textContent=wcfg.name;
            div.onclick=()=>{
                DB.data.weapon=k;DB.save();
                updateMenuDisplay();
            };
            wg.appendChild(div);
        }
    }
    // 场景选择
    const sg=document.getElementById('sceneGrid');
    if(sg){
        sg.innerHTML='';
        for(let i=0;i<CFG.SCENES.length;i++){
            const scene=CFG.SCENES[i];
            const locked=i>=DB.data.maxScene;
            const div=document.createElement('div');
            div.className='scene-btn'+(locked?' locked':'');
            div.innerHTML='<span class="sc-num">'+(i+1)+'</span><span class="sc-name">'+(scene.boss?'BOSS':scene.name)+'</span>';
            if(!locked){
                div.onclick=()=>{
                    DB.data.scene=i+1;DB.save();
                    document.getElementById('mainMenu').classList.add('hidden');
                    document.getElementById('gameScreen').classList.remove('hidden');
                    new Game();
                };
            }
            sg.appendChild(div);
        }
    }
}

// ==================== 启动 ====================
let _game=null;
function startGame(){
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    _game=new Game();
}
window.startGame=startGame;

document.addEventListener('DOMContentLoaded',()=>{
    DB.init();
    updateMenuDisplay();
    // 加载资源
    Assets.loadAll().then(()=>{
        const el=document.getElementById('loadOverlay');
        if(el){el.classList.add('load-done');setTimeout(()=>{if(el)el.style.display='none';},600);}
    });
});

})();