/**
 * 火柴人战斗 v2.0 - 动画系统 + 多点触控 + 背景场景
 */
(function(){
'use strict';

// ==================== 绿幕抠图 ====================
const ChromaKey={
  cache:{},
  process(img,key){
    if(this.cache[key]) return this.cache[key];
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,c.width,c.height);const p=data.data;
    for(let i=0;i<p.length;i+=4){
      const r=p[i],g=p[i+1],b=p[i+2];
      if(g>100&&g>r*1.4&&g>b*1.2){const gn=Math.min(1,(g-Math.max(r,b))/80);p[i+3]=Math.round(255*(1-gn));}
    }
    ctx.putImageData(data,0,0);this.cache[key]=c;return c;
  }
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
  efSwordSlash:'assets/images/effect_sword_slash.jpg',
  efStaffImpact:'assets/images/effect_staff_impact.jpg',
  efKnifeSlash:'assets/images/effect_knife_slash.jpg',
  efSpearThrust:'assets/images/effect_spear_thrust.jpg',
  efSkillSword:'assets/images/effect_skill_sword.jpg',
  efSkillStaff:'assets/images/effect_skill_staff.jpg',
  efSkillKnife:'assets/images/effect_skill_knife.jpg',
  efSkillSpear:'assets/images/effect_skill_spear.jpg',
};

// ==================== 配置 ====================
const CFG={
  PLAYER:{hp:100,atk:15,spd:3.5,jumpForce:12,atkCooldown:0.35,skillCooldown:5,skillDmgMul:2.5},
  WEAPONS:{
    sword:{name:'剑',atkMul:1.0,range:55,speed:1.0,color:'#ffdd44',efSlash:'efSwordSlash',efSkill:'efSkillSword'},
    staff:{name:'棍',atkMul:0.8,range:65,speed:1.2,color:'#ffaa44',efSlash:'efStaffImpact',efSkill:'efSkillStaff'},
    knife:{name:'刀',atkMul:1.3,range:40,speed:0.85,color:'#ff6644',efSlash:'efKnifeSlash',efSkill:'efSkillKnife'},
    spear:{name:'枪',atkMul:1.1,range:70,speed:0.9,color:'#88ccff',efSlash:'efSpearThrust',efSkill:'efSkillSpear'},
  },
  ENEMIES:{
    sword:{name:'剑士',hp:40,atk:8,spd:1.5,atkRange:50,sight:300,atkCd:1.5,dodge:0.3,xp:20,color:'#c22'},
    spear:{name:'枪兵',hp:35,atk:10,spd:1.8,atkRange:65,sight:320,atkCd:1.8,dodge:0.25,xp:25,color:'#c44'},
    axe:{name:'斧兵',hp:55,atk:14,spd:1.2,atkRange:40,sight:280,atkCd:2.0,dodge:0.15,xp:35,color:'#c55'},
  },
  BOSS_CFG:{hp:300,armor:150,atk:20,spd:1.0,atkRange:60,sight:400,atkCd:2.5,stunDuration:6,xp:200},
  SCENES:[
    {id:1,name:'草原',sky:'#87CEEB',ground:'#7ec850',enemies:[{type:'sword',count:3}],boss:false,width:1800,buildings:4},
    {id:2,name:'森林',sky:'#5a8a3c',ground:'#4a6a2c',enemies:[{type:'spear',count:3}],boss:false,width:2000,buildings:3},
    {id:3,name:'洞穴',sky:'#3a2a1a',ground:'#5a4a3a',enemies:[{type:'axe',count:4}],boss:false,width:2200,buildings:2},
    {id:4,name:'BOSS·暗影将军',sky:'#2a1a2a',ground:'#4a2a3a',enemies:[],boss:true,width:1600,bossName:'暗影将军',buildings:1},
    {id:5,name:'山道',sky:'#8a8a7a',ground:'#6a6a5a',enemies:[{type:'sword',count:2},{type:'spear',count:2}],boss:false,width:2400,buildings:3},
    {id:6,name:'火山',sky:'#cc4400',ground:'#884422',enemies:[{type:'axe',count:4}],boss:false,width:2000,buildings:2},
    {id:7,name:'城堡',sky:'#4a4a6a',ground:'#3a3a5a',enemies:[{type:'spear',count:2},{type:'axe',count:2}],boss:false,width:2400,buildings:5},
    {id:8,name:'BOSS·暗影之王',sky:'#1a0000',ground:'#2a0a0a',enemies:[],boss:true,width:1600,bossName:'暗影之王',finalBoss:true,buildings:1},
  ],
  SAVE_KEY:'stickman_rpg_v2',
};

// ==================== 存档 ====================
const DB={
  data:{scene:1,weapon:'sword',maxScene:1},
  init(){try{const raw=localStorage.getItem(CFG.SAVE_KEY);if(raw)this.data=Object.assign(this.data,JSON.parse(raw));this.save();}catch(e){}}
  ,save(){try{localStorage.setItem(CFG.SAVE_KEY,JSON.stringify(this.data));}catch(e){}}
};

// ==================== 图片加载 ====================
const Assets={
  loaded:{},total:0,count:0,
  loadAll(){
    const urls=[];for(const k in IMG) urls.push({key:k,url:IMG[k]});
    this.total=urls.length;
    return Promise.all(urls.map(item=>this.loadImage(item.key,item.url)));
  },
  loadImage(key,url){
    return new Promise((resolve)=>{
      const img=new Image();
      img.onload=()=>{this.loaded[key]=img;ChromaKey.process(img,key);this.count++;const pct=Math.floor(this.progress()*100);
        const bar=document.getElementById('loadBar'),txt=document.getElementById('loadText');
        if(bar)bar.style.width=pct+'%';if(txt)txt.textContent='加载中... '+pct+'%';resolve();};
      img.onerror=()=>{this.count++;resolve();};img.src=url;
    });
  },
  getSprite(key){const img=this.loaded[key];if(!img)return null;return ChromaKey.process(img,key);},
  progress(){return this.total>0?this.count/this.total:0;}
};

// ==================== 工具函数 ====================
function rand(min,max){return Math.random()*(max-min)+min;}
function randInt(min,max){return Math.floor(rand(min,max+1));}
function clamp(v,min,max){return Math.max(min,Math.min(v,max));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function lerp(a,b,t){return a+(b-a)*t;}

// ==================== 粒子系统 ====================
class Particle{
  constructor(x,y,opts={}){
    this.x=x;this.y=y;this.vx=opts.vx||rand(-1,1);this.vy=opts.vy||rand(-1,1);
    this.life=opts.life||0.5;this.maxLife=this.life;this.color=opts.color||'#fff';
    this.size=opts.size||3;this.dead=false;this.gravity=opts.gravity||0;this.shrink=opts.shrink!==false;
  }
  update(dt){this.x+=this.vx*60*dt;this.y+=this.vy*60*dt;this.vy+=this.gravity*60*dt;this.life-=dt;if(this.life<=0)this.dead=true;}
  draw(ctx,camX){
    const a=this.life/this.maxLife;ctx.globalAlpha=a;ctx.fillStyle=this.color;
    const s=this.shrink?this.size*a:this.size;ctx.beginPath();ctx.arc(this.x-camX,this.y,s,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
}

// ==================== 背景渲染器 ====================
class BackgroundRenderer{
  constructor(sceneCfg){
    this.scene=sceneCfg;
    this.buildings=[];
    this.clouds=[];
    this.trees=[];
    this.stars=[];
    this.lights=[];
    this.generateBuildings(sceneCfg.width,sceneCfg.buildings||3);
    this.generateClouds(sceneCfg.width);
    this.generateTrees(sceneCfg.width);
    this.generateStars(sceneCfg.width);
    this.time=0;
  }
  generateBuildings(worldW,count){
    this.buildings=[];
    for(let i=0;i<count;i++){
      this.buildings.push({
        x:worldW*0.2+i*(worldW*0.6/count)+rand(-30,30),
        w:randInt(60,140),h:randInt(80,200),
        color:`hsl(${rand(0,360)},${rand(10,30)}%,${rand(20,40)}%)`,
        windows:randInt(2,4),windowRows:randInt(2,5),
        roofColor:`hsl(${rand(0,360)},${rand(30,50)}%,${rand(15,30)}%)`,
        hasLight:Math.random()>0.3,
        lightFlicker:Math.random()*Math.PI*2
      });
    }
    this.buildings.sort((a,b)=>a.x-b.x);
  }
  generateClouds(worldW){
    this.clouds=[];
    for(let i=0;i<8;i++)this.clouds.push({x:rand(0,worldW),y:rand(30,180),w:rand(60,180),h:rand(20,50),speed:rand(0.1,0.3)});
  }
  generateTrees(worldW){
    this.trees=[];
    for(let i=0;i<12;i++)this.trees.push({x:rand(0,worldW),y:rand(0,30),size:rand(0.5,1.2)});
  }
  generateStars(worldW){
    this.stars=[];
    for(let i=0;i<30;i++)this.stars.push({x:rand(0,worldW),y:rand(0,300),size:rand(0.5,2),twinkle:rand(0,Math.PI*2),speed:rand(0.5,2)});
  }
  update(dt){this.time+=dt;}
  draw(ctx,camX,gameW,gameH,groundY,skyColor){
    // 天空
    const darkSky=this.scene.boss||this.scene.id>=6;
    if(darkSky){
      // 星空
      for(const s of this.stars){
        s.twinkle+=dt*s.speed;
        const alpha=0.3+Math.sin(s.twinkle)*0.3;
        ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.beginPath();
        ctx.arc(s.x-camX*0.1,s.y,s.size,0,Math.PI*2);ctx.fill();
      }
    }
    // 月亮
    if(darkSky){
      const mx=gameW*0.75-camX*0.05,my=80;
      ctx.fillStyle='#ffffcc';ctx.beginPath();ctx.arc(mx,my,30,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=skyColor;ctx.beginPath();ctx.arc(mx+8,my-5,26,0,Math.PI*2);ctx.fill();
    }
    // 云朵
    if(!darkSky){
      for(const c of this.clouds){
        const sx=c.x-camX*0.15;
        if(sx<-c.w||sx>gameW+c.w)continue;
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.beginPath();ctx.ellipse(sx,c.y,c.w/2,c.h/2,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(sx-c.w*0.2,c.y+c.h*0.2,c.w*0.35,c.h*0.4,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(sx+c.w*0.25,c.y-c.h*0.1,c.w*0.3,c.h*0.35,0,0,Math.PI*2);ctx.fill();
      }
    }
    // 远山
    ctx.fillStyle=this.darkenColor(skyColor,0.3);
    ctx.beginPath();ctx.moveTo(0,groundY);
    for(let i=0;i<=gameW+40;i+=40){
      const h=20+Math.sin((i+camX*0.3)*0.015)*25+Math.sin((i+camX*0.3)*0.04)*10;
      ctx.lineTo(i,groundY-h);
    }
    ctx.lineTo(gameW,groundY);ctx.closePath();ctx.fill();
    // 建筑
    for(const b of this.buildings){
      const sx=b.x-camX*0.6;
      if(sx<-b.w-20||sx>gameW+20)continue;
      const by=groundY-b.h;
      // 建筑主体
      ctx.fillStyle=b.color;ctx.fillRect(sx,by,b.w,b.h);
      // 屋顶
      ctx.fillStyle=b.roofColor;
      ctx.beginPath();ctx.moveTo(sx-5,by);ctx.lineTo(sx+b.w/2,by-25);ctx.lineTo(sx+b.w+5,by);ctx.closePath();ctx.fill();
      // 窗户
      const ww=b.w/(b.windows+1),wh=b.h/(b.windowRows+1);
      for(let r=0;r<b.windowRows;r++){
        for(let c=0;c<b.windows;c++){
          const wx=sx+ww*(c+1)-ww*0.5,wy=by+wh*(r+0.8);
          ctx.fillStyle='#1a1a2a';
          ctx.fillRect(wx-ww*0.3,wy-wh*0.3,ww*0.6,wh*0.4);
          if(b.hasLight&&Math.random()<0.7){
            b.lightFlicker+=0.05;
            const la=0.3+Math.sin(b.lightFlicker+this.time*2)*0.2+Math.sin(b.lightFlicker*1.7+this.time*1.5)*0.15;
            ctx.fillStyle=`rgba(255,220,150,${la})`;
            ctx.fillRect(wx-ww*0.25,wy-wh*0.25,ww*0.5,wh*0.3);
          }
        }
      }
      // 门
      ctx.fillStyle='#2a1a0a';ctx.fillRect(sx+b.w*0.35,by+b.h*0.6,b.w*0.3,b.h*0.4);
    }
    // 树木
    for(const t of this.trees){
      const sx=t.x-camX*0.5;
      if(sx<-40||sx>gameW+40)continue;
      const ty=groundY-60*t.size;
      ctx.fillStyle='#4a2a0a';ctx.fillRect(sx-5*t.size,ty,10*t.size,60*t.size);
      ctx.fillStyle='#3a6a2a';ctx.beginPath();ctx.arc(sx,ty-10*t.size,25*t.size,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#4a8a3a';ctx.beginPath();ctx.arc(sx-8*t.size,ty-5*t.size,18*t.size,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#2a5a2a';ctx.beginPath();ctx.arc(sx+8*t.size,ty-8*t.size,20*t.size,0,Math.PI*2);ctx.fill();
    }
  }
  darkenColor(hex,amount){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*(1-amount))},${Math.floor(g*(1-amount))},${Math.floor(b*(1-amount))})`;
  }
}

// ==================== 玩家类（完整动画系统） ====================
class Player{
  constructor(x,y){
    this.x=x;this.y=y;this.vx=0;this.vy=0;this.width=30;this.height=60;
    this.maxHp=CFG.PLAYER.hp;this.hp=this.maxHp;
    this.atk=CFG.PLAYER.atk;this.spd=CFG.PLAYER.spd;
    this.facingRight=true;this.grounded=false;
    this.atkTimer=0;this.skillTimer=0;this.invulnTimer=0;this.hitFlash=0;
    // 动画状态
    this.animState='idle'; // idle walk jump attack skill hurt
    this.animTimer=0;this.animFrame=0;
    this.attacking=false;this.attackPhase=0; // 0=待机, 1=前摇, 2=攻击判定, 3=后摇
    this.skilling=false;this.skillPhase=0;
    this.walkCycle=0;
    this.weapon='sword';
    this.sprite=Assets.getSprite('player');
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
    const wcfg=this.getWeaponCfg();
    // 移动
    this.vx=joystick.dx*this.spd*wcfg.speed;
    if(Math.abs(this.vx)>0.1)this.facingRight=this.vx>0;
    // 行走动画
    if(Math.abs(this.vx)>0.3&&this.grounded&&!this.attacking&&!this.skilling){
      this.walkCycle+=dt*8;
    }else if(this.grounded&&!this.attacking&&!this.skilling){
      this.walkCycle=lerp(this.walkCycle,0,0.3);
    }
    // 跳跃
    if(joystick.jumpPressed&&this.grounded&&!this.attacking&&!this.skilling){
      this.vy=-CFG.PLAYER.jumpForce;this.grounded=false;joystick.jumpPressed=false;
    }
    // 重力
    this.vy+=25*dt;
    this.x+=this.vx*60*dt;
    this.y+=this.vy*60*dt;
    // 地面
    if(this.y+this.height/2>=groundY){this.y=groundY-this.height/2;this.vy=0;this.grounded=true;}else{this.grounded=false;}
    this.x=clamp(this.x,this.width/2,worldW-this.width/2);
    if(this.y<-100)this.y=-100;
    // 攻击动画推进
    if(this.attacking){this.attackPhase+=dt*10;if(this.attackPhase>=3){this.attacking=false;this.attackPhase=0;}}
    if(this.skilling){this.skillPhase+=dt*6;if(this.skillPhase>=3){this.skilling=false;this.skillPhase=0;}}
    // 确定动画状态
    if(this.hitFlash>0)this.animState='hurt';
    else if(this.skilling)this.animState='skill';
    else if(this.attacking)this.animState='attack';
    else if(!this.grounded)this.animState='jump';
    else if(Math.abs(this.vx)>0.3)this.animState='walk';
    else this.animState='idle';
  }
  attack(){
    if(this.atkTimer>0||this.attacking)return null;
    this.atkTimer=this.getWeaponCfg().speed*CFG.PLAYER.atkCooldown;
    this.attacking=true;this.attackPhase=0;
    const dir=this.facingRight?1:-1;
    return {x:this.x+dir*25,y:this.y-5,w:this.getAtkRange(),h:40,damage:this.getAtk(),knockback:dir*4,color:this.getWeaponCfg().color,weapon:this.weapon};
  }
  skill(){
    if(this.skillTimer>0||this.skilling)return null;
    this.skillTimer=CFG.PLAYER.skillCooldown;
    this.skilling=true;this.skillPhase=0;
    const dir=this.facingRight?1:-1;
    return {x:this.x+dir*30,y:this.y-15,w:this.getAtkRange()*1.5,h:60,damage:Math.floor(this.getAtk()*CFG.PLAYER.skillDmgMul),knockback:dir*8,color:'#ff6644',isSkill:true,weapon:this.weapon};
  }
  takeDamage(dmg){if(this.invulnTimer>0)return;this.hp-=dmg;this.invulnTimer=0.3;this.hitFlash=0.15;this.vy=-3;if(this.hp<=0)this.hp=0;}
  heal(amount){this.hp=Math.min(this.maxHp,this.hp+amount);}
  draw(ctx,camX,groundY){
    if(this.invulnTimer>0&&Math.floor(this.invulnTimer*20)%2===0)return;
    const sx=this.x-camX,sy=this.y;
    ctx.save();ctx.translate(sx,sy);
    if(!this.facingRight)ctx.scale(-1,1);
    if(this.hitFlash>0){ctx.globalAlpha=0.5+Math.sin(this.hitFlash*30)*0.3;}
    this.drawStickman(ctx,0,0,groundY-this.y);
    ctx.restore();
    // 武器特效精灵
    if(this.attacking&&this.attackPhase>1.0&&this.attackPhase<1.3){
      this.drawWeaponEffect(ctx,camX,false);
    }
    if(this.skilling&&this.skillPhase>1.0&&this.skillPhase<1.5){
      this.drawWeaponEffect(ctx,camX,true);
    }
  }
  drawWeaponEffect(ctx,camX,isSkill){
    const wcfg=this.getWeaponCfg();
    const key=isSkill?wcfg.efSkill:wcfg.efSlash;
    const spr=Assets.getSprite(key);
    const dir=this.facingRight?1:-1;
    const ex=this.x+dir*40-camX,ey=this.y-15;
    if(spr){
      ctx.save();ctx.globalAlpha=0.8;
      if(!this.facingRight){ctx.translate(ex*2,0);ctx.scale(-1,1);}
      ctx.drawImage(spr,ex-40,ey-40,80,80);
      ctx.restore();
    }else{
      // fallback绘制
      ctx.save();ctx.globalAlpha=0.6;
      ctx.fillStyle=isSkill?'rgba(255,100,50,0.5)':'rgba(255,200,80,0.4)';
      ctx.beginPath();ctx.arc(ex,ey,isSkill?50:30,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  drawStickman(ctx,ox,oy,distToGround){
    const h=this.height,bodyLen=h*0.25;
    const wcfg=this.getWeaponCfg();
    // 身体
    ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.3);ctx.lineTo(ox,oy+bodyLen*0.7);ctx.stroke();
    // 头
    const headBob=this.animState==='idle'?Math.sin(this.animTimer*3)*2:0;
    ctx.fillStyle='#222';ctx.beginPath();ctx.arc(ox,oy-bodyLen*0.3-8+headBob,9,0,Math.PI*2);ctx.fill();
    // 眼睛
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ox-3,oy-bodyLen*0.3-10+headBob,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(ox+3,oy-bodyLen*0.3-10+headBob,2,0,Math.PI*2);ctx.fill();
    // 受伤表情
    if(this.animState==='hurt'){ctx.fillStyle='#f44';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('×',ox,oy-bodyLen*0.3-14+headBob);ctx.textAlign='start';}
    // 腿 - 根据动画状态
    let lLegX=-12,rLegX=12;
    if(this.animState==='walk'){const swing=Math.sin(this.walkCycle)*18;lLegX=-12+swing;rLegX=12-swing;}
    else if(this.animState==='jump'){lLegX=-8;rLegX=8;const legY=oy+h*0.45-5;}
    else if(this.animState==='attack'){lLegX=-15;rLegX=10;}
    else if(this.animState==='skill'){lLegX=-18;rLegX=14;}
    const legEndY=oy+h*0.45;
    if(this.animState==='jump'){ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+lLegX,legEndY-5);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+rLegX,legEndY-5);ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+lLegX,legEndY);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+rLegX,legEndY);ctx.stroke();}
    // 手臂 - 根据动画和武器
    const armLen=bodyLen*0.8;
    let armAngle=0.3,backArmAngle=0.3;
    if(this.animState==='walk'){const swing=Math.sin(this.walkCycle)*0.4;armAngle=0.3+swing;backArmAngle=0.3-swing;}
    else if(this.animState==='jump'){armAngle=0.6;backArmAngle=-0.3;}
    else if(this.animState==='attack'){
      if(this.attackPhase<1){armAngle=0.6;backArmAngle=-0.5;}
      else if(this.attackPhase<2){armAngle=1.5;backArmAngle=-0.2;}
      else{armAngle=0.3;backArmAngle=0.3;}
    }else if(this.animState==='skill'){
      if(this.skillPhase<1){armAngle=0.8;backArmAngle=-0.8;}
      else if(this.skillPhase<2){armAngle=2.0;backArmAngle=-0.3;}
      else{armAngle=0.3;backArmAngle=0.3;}
    }
    // 前臂
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
    ctx.lineTo(ox+Math.cos(Math.PI*armAngle)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*armAngle)*armLen);
    ctx.stroke();
    // 后臂
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
    ctx.lineTo(ox-Math.cos(Math.PI*backArmAngle)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*backArmAngle)*armLen);
    ctx.stroke();
    // 武器
    if(this.animState==='attack'||this.animState==='skill'){
      const isSkill=this.animState==='skill';
      const phase=isSkill?this.skillPhase:this.attackPhase;
      if(phase>0.4){
        const wx=ox+Math.cos(Math.PI*armAngle)*armLen*1.5;
        const wy=oy-bodyLen*0.1-Math.sin(Math.PI*armAngle)*armLen*1.5;
        ctx.strokeStyle=isSkill?'#ff4466':wcfg.color;ctx.lineWidth=isSkill?5:4;
        ctx.beginPath();ctx.moveTo(ox+Math.cos(Math.PI*armAngle)*armLen*0.6,oy-bodyLen*0.1-Math.sin(Math.PI*armAngle)*armLen*0.6);
        ctx.lineTo(wx,wy);ctx.stroke();
        // 特效光晕
        ctx.strokeStyle=isSkill?'rgba(255,100,50,0.4)':wcfg.color.replace(')','0.4)').replace('rgb','rgba').replace('#','rgba');
        if(ctx.strokeStyle.startsWith('#'))ctx.strokeStyle='rgba(255,200,100,0.4)';
        ctx.lineWidth=isSkill?12:7;
        ctx.beginPath();ctx.arc(wx,wy,isSkill?18:12,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#222';ctx.lineWidth=3;
      }
    }
  }
  drawHealthBar(ctx,camX){
    const sx=this.x-camX,sy=this.y-this.height/2-20;
    const bw=44,bh=5;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
    const hpR=this.hp/this.maxHp;
    const hpGrad=ctx.createLinearGradient(sx-bw/2,0,sx+bw/2,0);
    hpGrad.addColorStop(0,'#ff3333');hpGrad.addColorStop(0.5,'#ff8833');hpGrad.addColorStop(1,'#44cc44');
    ctx.fillStyle=hpGrad;ctx.fillRect(sx-bw/2,sy,bw*hpR,bh);
    ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText(Math.ceil(this.hp)+'/'+this.maxHp,sx,sy-2);ctx.textAlign='start';
  }
}

// ==================== 敌人类（完整动画系统） ====================
class Enemy{
  constructor(type,x,y,groundY,idx){
    const cfg=CFG.ENEMIES[type];this.cfg=cfg;this.type=type;this.name=cfg.name;
    this.x=x;this.y=y;this.groundY=groundY;
    this.maxHp=cfg.hp;this.hp=this.maxHp;this.atk=cfg.atk;this.spd=cfg.spd;
    this.atkRange=cfg.atkRange;this.sight=cfg.sight;this.atkCd=cfg.atkCd;this.dodge=cfg.dodge;
    this.width=30;this.height=58;this.facingRight=false;this.vx=0;this.vy=0;
    this.state='idle';this.stateTimer=rand(0.5,2);this.atkTimer=0;
    this.hitFlash=0;this.hitStunTimer=0;this.dead=false;this.deathTimer=0;
    this.attacking=false;this.attackPhase=0;
    this.patrolDir=rand(0,1)<0.5?-1:1;this.patrolBase=this.x;
    this.animTimer=rand(0,10);this.walkCycle=0;this.idx=idx||0;
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
    switch(this.state){
      case 'idle':
        this.vx=0;this.walkCycle=lerp(this.walkCycle,0,0.3);
        this.stateTimer-=dt;if(this.stateTimer<=0){this.state='patrol';this.stateTimer=rand(1,3);this.patrolDir=rand(0,1)<0.5?-1:1;}
        if(d<this.sight)this.state='chase';break;
      case 'patrol':
        this.vx=this.spd*this.patrolDir*0.5;this.walkCycle+=dt*6;
        this.stateTimer-=dt;if(this.stateTimer<=0){this.state='idle';this.stateTimer=rand(1,3);}
        if(d<this.sight)this.state='chase';
        if(Math.abs(this.x-this.patrolBase)>80)this.patrolDir*=-1;break;
      case 'chase':
        this.vx=(this.facingRight?1:-1)*this.spd;this.walkCycle+=dt*8;
        if(d<this.atkRange&&this.atkTimer<=0){this.state='attack';this.attacking=true;this.attackPhase=0;this.atkTimer=this.atkCd;}
        if(d>this.sight*1.2){this.state='idle';this.stateTimer=rand(1,2);}
        if(playerAttacking&&d<80&&Math.random()<this.dodge){this.state='dodge';this.stateTimer=0.4;this.vx=(this.facingRight?-1:1)*this.spd*2;}
        break;
      case 'attack':
        this.vx*=0.8;this.walkCycle=lerp(this.walkCycle,0,0.5);
        if(this.attacking){this.attackPhase+=dt*8;if(this.attackPhase>=3){this.attacking=false;this.attackPhase=0;}}
        if(!this.attacking&&this.attackPhase===0){this.state='chase';}break;
      case 'dodge':
        this.stateTimer-=dt;this.vx*=0.95;this.walkCycle+=dt*10;
        if(this.stateTimer<=0){this.state='chase';}break;
      case 'hitstun':this.walkCycle=0;break;
    }
    this.x+=this.vx*60*dt;this.y=this.groundY-this.height/2;
    if(this.attacking&&this.attackPhase>1.2&&this.attackPhase<1.5){this.doAttack(player);}
  }
  doAttack(player){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<this.atkRange+20){player.takeDamage(this.atk);}}
  takeDamage(dmg,knockback){this.hp-=dmg;this.hitFlash=0.1;this.hitStunTimer=0.15;this.vx=knockback||0;if(this.hp<=0){this.die();return true;}return false;}
  die(){this.dead=true;this.state='dead';this.deathTimer=0;}
  draw(ctx,camX){
    if(this.dead&&this.deathTimer>0.5)return;
    const sx=this.x-camX,sy=this.y;
    ctx.save();ctx.translate(sx,sy);
    if(this.dead){ctx.globalAlpha=1-this.deathTimer*2;ctx.rotate(this.deathTimer*3);}
    if(!this.facingRight)ctx.scale(-1,1);
    if(this.hitFlash>0)ctx.globalAlpha=0.5;
    this.drawStickman(ctx,0,0);
    ctx.restore();
    if(!this.dead)this.drawHealthBar(ctx,camX);
  }
  drawStickman(ctx,ox,oy){
    const h=this.height,bodyLen=h*0.25;
    ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.lineCap='round';
    // 身体
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.3);ctx.lineTo(ox,oy+bodyLen*0.7);ctx.stroke();
    // 头
    ctx.fillStyle=this.cfg.color;ctx.beginPath();ctx.arc(ox,oy-bodyLen*0.3-8,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ox-3,oy-bodyLen*0.3-9,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(ox+3,oy-bodyLen*0.3-9,2,0,Math.PI*2);ctx.fill();
    // 腿
    let lLeg=-12,rLeg=12;
    if(this.state==='patrol'||this.state==='chase'){const swing=Math.sin(this.walkCycle)*16;lLeg=-12+swing;rLeg=12-swing;}
    else if(this.state==='attack'){lLeg=-15;rLeg=10;}
    else if(this.state==='dodge'){lLeg=-18;rLeg=14;}
    const legEnd=oy+h*0.45;
    ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+lLeg,legEnd);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+rLeg,legEnd);ctx.stroke();
    // 手臂
    const armLen=bodyLen*0.8;
    let armA=0.3,backA=0.3;
    if(this.state==='patrol'||this.state==='chase'){const s=Math.sin(this.walkCycle)*0.3;armA=0.3+s;backA=0.3-s;}
    else if(this.state==='attack'){
      if(this.attackPhase<1){armA=0.6;backA=-0.5;}
      else if(this.attackPhase<2){armA=1.5;backA=-0.2;}
      else{armA=0.3;backA=0.3;}
    }
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);ctx.lineTo(ox+Math.cos(Math.PI*armA)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*armA)*armLen);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);ctx.lineTo(ox-Math.cos(Math.PI*backA)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*backA)*armLen);ctx.stroke();
    // 武器
    if(this.state==='attack'&&this.attackPhase>0.5){
      const wx=ox+Math.cos(Math.PI*armA)*armLen*1.8;
      const wy=oy-bodyLen*0.1-Math.sin(Math.PI*armA)*armLen*1.8;
      ctx.strokeStyle='#ff6644';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(ox+Math.cos(Math.PI*armA)*armLen*0.5,oy-bodyLen*0.1-Math.sin(Math.PI*armA)*armLen*0.5);
      ctx.lineTo(wx,wy);ctx.stroke();
    }
  }
  drawHealthBar(ctx,camX){
    const sx=this.x-camX,sy=this.y-this.height/2-15;
    const bw=36,bh=5;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
    ctx.fillStyle='#ff3333';ctx.fillRect(sx-bw/2,sy,bw*(this.hp/this.maxHp),bh);
    ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText(Math.ceil(this.hp)+'/'+this.maxHp,sx,sy-2);ctx.textAlign='start';
  }
}

// ==================== BOSS类（完整动画） ====================
class Boss extends Enemy{
  constructor(type,x,y,groundY,cfgOverride){
    super('sword',x,y,groundY,0);
    const bcfg=cfgOverride||CFG.BOSS_CFG;
    this.maxHp=bcfg.hp;this.hp=this.maxHp;this.armor=bcfg.armor;this.armorMax=bcfg.armor;
    this.atk=bcfg.atk;this.spd=bcfg.spd;this.atkRange=bcfg.atkRange;this.sight=bcfg.sight;this.atkCd=bcfg.atkCd;
    this.stunDuration=bcfg.stunDuration;this.width=40;this.height=80;
    this.stunned=false;this.stunTimer=0;this.name=bcfg.bossName||'BOSS';
    this.armorHitFlash=0;
  }
  update(dt,player,playerAttacking){
    if(this.dead){this.deathTimer+=dt;return;}
    this.animTimer+=dt;this.atkTimer=Math.max(0,this.atkTimer-dt);
    this.hitFlash=Math.max(0,this.hitFlash-dt);this.armorHitFlash=Math.max(0,this.armorHitFlash-dt);
    if(this.stunned){this.stunTimer-=dt;if(this.stunTimer<=0){this.stunned=false;this.armor=this.armorMax;}return;}
    const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
    this.facingRight=player.x>this.x;
    this.vx=(this.facingRight?1:-1)*this.spd;this.walkCycle+=dt*5;
    if(d<this.atkRange&&this.atkTimer<=0){this.attacking=true;this.attackPhase=0;this.atkTimer=this.atkCd;}
    this.x+=this.vx*60*dt;this.y=this.groundY-this.height/2;
    if(this.attacking){this.attackPhase+=dt*6;if(this.attackPhase>=3){this.attacking=false;this.attackPhase=0;}}
    if(this.attacking&&this.attackPhase>1.0&&this.attackPhase<1.4){this.doAttack(player);}
  }
  doAttack(player){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<this.atkRange+30){player.takeDamage(this.atk);}}
  takeDamage(dmg,knockback){
    if(this.stunned){this.hp-=dmg;this.hitFlash=0.1;if(this.hp<=0){this.die();return true;}return false;}
    if(this.armor>0){this.armor-=dmg;this.armorHitFlash=0.08;if(this.armor<=0){this.armor=0;this.stunned=true;this.stunTimer=this.stunDuration;}return false;}
    this.hp-=dmg;this.hitFlash=0.1;if(this.hp<=0){this.die();return true;}return false;
  }
  draw(ctx,camX){
    if(this.dead&&this.deathTimer>0.5)return;
    const sx=this.x-camX,sy=this.y;
    ctx.save();ctx.translate(sx,sy);
    if(this.dead){ctx.globalAlpha=1-this.deathTimer*2;ctx.rotate(this.deathTimer*3);}
    if(!this.facingRight)ctx.scale(-1,1);
    if(this.hitFlash>0&&!this.stunned)ctx.globalAlpha=0.5;
    if(this.stunned)ctx.globalAlpha=0.4+Math.sin(this.animTimer*10)*0.3;
    if(this.armorHitFlash>0)ctx.fillStyle='rgba(100,150,255,0.3)';
    this.drawBossStickman(ctx,0,0);
    ctx.restore();
    if(!this.dead)this.drawBossBars(ctx,camX);
  }
  drawBossStickman(ctx,ox,oy){
    const h=this.height,bodyLen=h*0.28;
    ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.3);ctx.lineTo(ox,oy+bodyLen*0.7);ctx.stroke();
    // 护甲
    ctx.strokeStyle=this.armorHitFlash>0?'#88aaff':'#555';ctx.lineWidth=2;
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
    let lLeg=-16,rLeg=16;const swing=Math.sin(this.walkCycle)*12;
    if(!this.stunned){lLeg=-16+swing;rLeg=16-swing;}
    ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+lLeg,oy+h*0.45);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy+bodyLen*0.7);ctx.lineTo(ox+rLeg,oy+h*0.45);ctx.stroke();
    // 手臂
    const armLen=bodyLen*0.9;let armA=0.3;
    if(this.attacking){if(this.attackPhase<1)armA=0.6;else if(this.attackPhase<2)armA=1.8;else armA=0.3;}
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);ctx.lineTo(ox+Math.cos(Math.PI*armA)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*armA)*armLen);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);ctx.lineTo(ox-Math.cos(Math.PI*0.3)*armLen,oy-bodyLen*0.1-Math.sin(Math.PI*0.3)*armLen);ctx.stroke();
    if(this.attacking&&this.attackPhase>0.8){
      ctx.strokeStyle='#ff4444';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(ox,oy-bodyLen*0.1);
      ctx.lineTo(ox+Math.cos(Math.PI*armA)*armLen*2,oy-bodyLen*0.1-Math.sin(Math.PI*armA)*armLen*2);ctx.stroke();
    }
  }
  drawBossBars(ctx,camX){
    const sx=this.x-camX,sy=this.y-this.height/2-20;const bw=50,bh=5;
    if(this.armorMax>0){
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
      ctx.fillStyle='#4488ff';ctx.fillRect(sx-bw/2,sy,bw*(this.armor/this.armorMax),bh);
      ctx.fillStyle='#fff';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.fillText('护甲',sx,sy-2);
    }
    const sy2=sy-8;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy2,bw,bh);
    ctx.fillStyle='#ff3333';ctx.fillRect(sx-bw/2,sy2,bw*(this.hp/this.maxHp),bh);
    ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText(this.name+' '+Math.ceil(this.hp)+'/'+this.maxHp,sx,sy2-2);
    if(this.stunned){ctx.fillStyle='#ffcc00';ctx.font='bold 12px sans-serif';ctx.fillText('眩晕 '+Math.ceil(this.stunTimer)+'s',sx,sy-30);}
    ctx.textAlign='start';
  }
}

// ==================== 多点触控虚拟摇杆 ====================
class Joystick{
  constructor(){this.baseX=0;this.baseY=0;this.thumbX=0;this.thumbY=0;this.active=false;this.touchId=null;this.dx=0;this.dy=0;this.jumpPressed=false;}
  setBase(x,y){this.baseX=x;this.baseY=y;this.thumbX=x;this.thumbY=y;}
  handleDown(tx,ty,touchId){const jd=dist({x:tx,y:ty},{x:this.baseX,y:this.baseY});if(jd<80){this.active=true;this.touchId=touchId;this.updateThumb(tx,ty);}return this.active;}
  handleMove(tx,ty,touchId){if(this.active&&this.touchId===touchId){this.updateThumb(tx,ty);return true;}return false;}
  handleUp(touchId){if(this.touchId===touchId){this.active=false;this.touchId=null;this.thumbX=this.baseX;this.thumbY=this.baseY;this.dx=0;this.dy=0;return true;}return false;}
  updateThumb(tx,ty){let dx=tx-this.baseX,dy=ty-this.baseY;const d=Math.sqrt(dx*dx+dy*dy),maxR=60;if(d>maxR){dx=dx/d*maxR;dy=dy/d*maxR;}this.thumbX=this.baseX+dx;this.thumbY=this.baseY+dy;this.dx=dx/maxR;this.dy=dy/maxR;}
  draw(ctx){
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(this.baseX,this.baseY,60,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.arc(this.baseX,this.baseY,40,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.beginPath();ctx.arc(this.thumbX,this.thumbY,22,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.arc(this.thumbX,this.thumbY,22,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(this.baseX-10,this.baseY);ctx.lineTo(this.baseX+10,this.baseY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(this.baseX,this.baseY-10);ctx.lineTo(this.baseX,this.baseY+10);ctx.stroke();
  }
}

// ==================== 游戏主类 ====================
class Game{
  constructor(){
    this.canvas=document.getElementById('gameCanvas');
    this.ctx=this.canvas.getContext('2d');
    this.joystick=new Joystick();
    this.resize();
    this.sceneIdx=DB.data.scene-1;
    this.sceneCfg=CFG.SCENES[this.sceneIdx];
    this.worldW=this.sceneCfg.width;
    this.groundY=this.gameH*0.82;
    this.camX=0;
    this.player=new Player(150,this.groundY-60);
    this.player.weapon=DB.data.weapon;
    this.enemies=[];this.boss=null;this.particles=[];
    this.state='playing';this.victoryScene=false;this.gameOverCause='';this.sceneClear=false;
    this.time=0;this.lastTime=0;this.shakeTimer=0;this.shakeIntensity=0;
    this.bgRenderer=new BackgroundRenderer(this.sceneCfg);
    // 多点触控
    this.activeTouches={};
    this.touchButtonMap={};
    this.initScene();
    this.setupInput();
    this.running=true;
    this.lastTime=performance.now();
    requestAnimationFrame(t=>this.gameLoop(t));
  }
  resize(){
    const scrEl=document.getElementById('gameScreen');
    const scrRect=scrEl?scrEl.getBoundingClientRect():{width:window.innerWidth,height:window.innerHeight};
    const scrW=scrRect.width||window.innerWidth,scrH=scrRect.height||window.innerHeight;
    const ratio=Math.min(scrW/480,scrH/800);
    this.gameW=480;this.gameH=800;
    this.canvas.width=480;this.canvas.height=800;
    const cw=Math.floor(480*ratio),ch=Math.floor(800*ratio);
    this.canvas.style.width=cw+'px';this.canvas.style.height=ch+'px';
    this.canvas.style.position='absolute';
    this.canvas.style.left=Math.floor((scrW-cw)/2)+'px';this.canvas.style.top=Math.floor((scrH-ch)/2)+'px';
    this.scale=ratio;
    this.joystick.setBase(90,this.gameH*0.72);
    this.btnAreas={
      skill:{x:this.gameW*0.85,y:this.gameH*0.55,r:this.gameW*0.07},
      jump:{x:this.gameW*0.85,y:this.gameH*0.68,r:this.gameW*0.07},
      attack:{x:this.gameW*0.85,y:this.gameH*0.82,r:this.gameW*0.1},
    };
  }
  initScene(){
    this.enemies=[];this.boss=null;this.sceneClear=false;
    const cfg=this.sceneCfg;
    this.bgRenderer=new BackgroundRenderer(cfg);
    const spawnArea=this.worldW*0.4;
    if(cfg.boss){
      this.boss=new Boss('sword',spawnArea+rand(0,200),this.groundY-40,this.groundY,{
        hp:CFG.BOSS_CFG.hp+(this.sceneIdx>=7?200:0),armor:CFG.BOSS_CFG.armor+(this.sceneIdx>=7?100:0),
        atk:CFG.BOSS_CFG.atk+(this.sceneIdx>=7?10:0),spd:CFG.BOSS_CFG.spd,atkRange:CFG.BOSS_CFG.atkRange,
        sight:CFG.BOSS_CFG.sight,atkCd:CFG.BOSS_CFG.atkCd,stunDuration:CFG.BOSS_CFG.stunDuration,
        xp:CFG.BOSS_CFG.xp,bossName:cfg.bossName||'BOSS',finalBoss:cfg.finalBoss||false,
      });
    }else{
      let idx=0;
      for(const group of cfg.enemies){for(let i=0;i<group.count;i++){this.enemies.push(new Enemy(group.type,spawnArea+rand(i*120,i*120+100),this.groundY-29,this.groundY,idx++));}}
    }
    this.player.x=100;this.player.y=this.groundY-30;this.player.vx=0;this.player.vy=0;this.player.grounded=true;this.camX=0;
  }
  setupInput(){
    this.canvas.addEventListener('touchstart',e=>this.onTouchStart(e),{passive:false});
    this.canvas.addEventListener('touchmove',e=>this.onTouchMove(e),{passive:false});
    this.canvas.addEventListener('touchend',e=>this.onTouchEnd(e),{passive:false});
    this.canvas.addEventListener('touchcancel',e=>this.onTouchEnd(e),{passive:false});
    this.canvas.addEventListener('mousedown',e=>this.onMouseDown(e));
    window.addEventListener('mousemove',e=>this.onMouseMove(e));
    window.addEventListener('mouseup',e=>this.onMouseUp(e));
    window.addEventListener('keydown',e=>this.onKeyDown(e));
    window.addEventListener('keyup',e=>this.onKeyUp(e));
    window.addEventListener('resize',()=>this.resize());
  }
  screenToGame(clientX,clientY){const rect=this.canvas.getBoundingClientRect();return{x:(clientX-rect.left)/this.scale,y:(clientY-rect.top)/this.scale};}
  onTouchStart(e){
    e.preventDefault();
    for(const t of e.changedTouches){
      const p=this.screenToGame(t.clientX,t.clientY);
      this.activeTouches[t.identifier]=p;
      if(this.state==='gameover'||this.state==='victory'){this.handleClick(p.x,p.y);continue;}
      if(this.joystick.handleDown(p.x,p.y,t.identifier))continue;
      const btn=this.checkButton(p.x,p.y);
      if(btn){this.touchButtonMap[t.identifier]=btn;this.handleButton(btn);}
    }
  }
  onTouchMove(e){
    e.preventDefault();
    for(const t of e.changedTouches){
      const p=this.screenToGame(t.clientX,t.clientY);
      this.activeTouches[t.identifier]=p;
      this.joystick.handleMove(p.x,p.y,t.identifier);
    }
  }
  onTouchEnd(e){
    for(const t of e.changedTouches){
      this.joystick.handleUp(t.identifier);
      delete this.activeTouches[t.identifier];
      delete this.touchButtonMap[t.identifier];
    }
  }
  onMouseDown(e){
    const p=this.screenToGame(e.clientX,e.clientY);
    if(this.state==='gameover'||this.state==='victory'){this.handleClick(p.x,p.y);return;}
    if(this.joystick.handleDown(p.x,p.y,'mouse'))return;
    const btn=this.checkButton(p.x,p.y);if(btn)this.handleButton(btn);
  }
  onMouseMove(e){if(!e.buttons)return;const p=this.screenToGame(e.clientX,e.clientY);this.joystick.handleMove(p.x,p.y,'mouse');}
  onMouseUp(e){this.joystick.handleUp('mouse');}
  onKeyDown(e){
    switch(e.key){case'ArrowLeft':case'a':this.joystick.dx=-1;break;case'ArrowRight':case'd':this.joystick.dx=1;break;case'ArrowUp':case'w':this.joystick.dy=-1;break;case'ArrowDown':case's':this.joystick.dy=1;break;case'j':case'J':this.handleButton('attack');break;case'k':case'K':this.handleButton('jump');break;case'l':case'L':this.handleButton('skill');break;}
  }
  onKeyUp(e){
    switch(e.key){case'ArrowLeft':case'a':case'ArrowRight':case'd':if(!e.ctrlKey&&!e.metaKey)this.joystick.dx=0;break;case'ArrowUp':case'w':case'ArrowDown':case's':if(!e.ctrlKey&&!e.metaKey)this.joystick.dy=0;break;}
  }
  checkButton(gx,gy){for(const k in this.btnAreas){const b=this.btnAreas[k];if(dist({x:gx,y:gy},{x:b.x,y:b.y})<b.r)return k;}return null;}
  handleButton(btn){if(this.state!=='playing')return;switch(btn){case'attack':this.playerAttack();break;case'jump':this.joystick.jumpPressed=true;break;case'skill':this.playerSkill();break;}}
  playerAttack(){if(this.state!=='playing')return;const hit=this.player.attack();if(!hit)return;this.checkHit(hit);}
  playerSkill(){if(this.state!=='playing')return;const hit=this.player.skill();if(!hit)return;this.checkHit(hit);this.shakeTimer=0.15;this.shakeIntensity=4;
    for(let i=0;i<20;i++)this.particles.push(new Particle(hit.x+hit.w/2,hit.y+hit.h/2,{vx:rand(-3,3),vy:rand(-3,1),color:'#ff6644',life:0.5,size:rand(3,6),gravity:1}));}
  checkHit(hit){
    for(const enemy of this.enemies){if(enemy.dead)continue;if(this.hitOverlap(hit,enemy)){const killed=enemy.takeDamage(hit.damage,hit.knockback);this.spawnHitParticles(enemy.x,enemy.y,hit.color);if(killed)this.spawnDeathParticles(enemy.x,enemy.y);}}
    if(this.boss&&!this.boss.dead){if(this.hitOverlap(hit,this.boss)){const killed=this.boss.takeDamage(hit.damage,hit.knockback);this.spawnHitParticles(this.boss.x,this.boss.y,hit.color);if(killed)this.spawnDeathParticles(this.boss.x,this.boss.y);}}
  }
  hitOverlap(hit,entity){return hit.x-hit.w/2<entity.x+entity.width/2&&hit.x+hit.w/2>entity.x-entity.width/2&&hit.y-hit.h/2<entity.y+entity.height/2&&hit.y+hit.h/2>entity.y-entity.height/2;}
  spawnHitParticles(x,y,color){for(let i=0;i<8;i++)this.particles.push(new Particle(x,y,{vx:rand(-2,2),vy:rand(-2,1),color:color,life:0.3,size:rand(2,4)}));}
  spawnDeathParticles(x,y){for(let i=0;i<15;i++)this.particles.push(new Particle(x,y,{vx:rand(-3,3),vy:rand(-3,1),color:'#ffaa00',life:0.6,size:rand(2,5),gravity:0.5}));}
  checkSceneClear(){
    if(this.sceneClear)return;
    if(this.boss){if(this.boss.dead&&this.boss.deathTimer>0.5){this.sceneClear=true;this.onSceneVictory();}}
    else{const allDead=this.enemies.every(e=>e.dead);if(allDead&&this.enemies.length>0){this.sceneClear=true;this.onSceneVictory();}}
  }
  onSceneVictory(){
    if(this.sceneCfg.boss&&this.sceneCfg.finalBoss){this.state='victory';this.victoryScene=true;return;}
    if(this.sceneIdx>=CFG.SCENES.length-1){this.state='victory';this.victoryScene=true;return;}
    setTimeout(()=>{if(this.state==='victory')return;this.sceneIdx++;if(this.sceneIdx>=CFG.SCENES.length){this.state='victory';this.victoryScene=true;return;}
      this.sceneCfg=CFG.SCENES[this.sceneIdx];this.worldW=this.sceneCfg.width;DB.data.scene=this.sceneIdx+1;
      if(this.sceneIdx+1>DB.data.maxScene)DB.data.maxScene=this.sceneIdx+1;DB.save();this.initScene();},1500);
  }
  gameLoop(timestamp){
    if(!this.running)return;
    try{const dt=Math.min(0.05,(timestamp-this.lastTime)/1000);this.lastTime=timestamp;this.time+=dt;if(this.state==='playing')this.update(dt);this.render();}catch(e){console.error('Game loop error:',e&&e.message?e.message:e,e&&e.stack?e.stack:'');}
    requestAnimationFrame(t=>this.gameLoop(t));
  }
  update(dt){
    if(this.shakeTimer>0)this.shakeTimer=Math.max(0,this.shakeTimer-dt);
    this.bgRenderer.update(dt);
    const playerAttacking=this.player.attacking||this.player.skilling;
    this.player.update(dt,this.joystick,this.gameW,this.gameH,this.worldW,this.groundY);
    const targetCamX=this.player.x-this.gameW/2;this.camX+=lerp(this.camX,targetCamX,0.1)-this.camX+targetCamX*0.1;this.camX=clamp(this.camX,0,this.worldW-this.gameW);
    for(const enemy of this.enemies){if(!enemy.dead)enemy.update(dt,this.player,playerAttacking);}
    if(this.boss&&!this.boss.dead)this.boss.update(dt,this.player,playerAttacking);
    for(const p of this.particles)p.update(dt);this.particles=this.particles.filter(p=>!p.dead);
    this.checkSceneClear();
    if(this.player.hp<=0){this.state='gameover';this.gameOverCause='被敌人击败';}
    if(!this.player.grounded)this.joystick.jumpPressed=false;
  }
  render(){
    const ctx=this.ctx,w=this.gameW,h=this.gameH;
    ctx.clearRect(0,0,w,h);
    let sx=0,sy=0;if(this.shakeTimer>0){sx=rand(-this.shakeIntensity,this.shakeIntensity);sy=rand(-this.shakeIntensity,this.shakeIntensity);}
    ctx.save();ctx.translate(sx,sy);
    // 天空
    ctx.fillStyle=this.sceneCfg.sky;ctx.fillRect(0,0,w,h);
    // 背景（建筑/云/树/灯光）
    this.bgRenderer.draw(ctx,this.camX,w,h,this.groundY,this.sceneCfg.sky);
    // 地面
    ctx.fillStyle=this.sceneCfg.ground;ctx.fillRect(0,this.groundY,w,h-this.groundY);
    ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,this.groundY);ctx.lineTo(w,this.groundY);ctx.stroke();
    // 地面纹理
    ctx.fillStyle='rgba(0,0,0,0.04)';for(let i=0;i<w;i+=40)ctx.fillRect(i-this.camX*0.1,this.groundY+10,20,2);
    // 边界标记
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='bold 14px sans-serif';ctx.textAlign='center';
    if(this.camX<=5)ctx.fillText('◀',30,h/2);
    if(this.camX>=this.worldW-w-5){const sc=this.sceneClear||this.sceneCfg.boss;ctx.fillStyle=sc?'rgba(255,255,255,0.3)':'rgba(255,100,100,0.5)';ctx.fillText(sc?'▶ 进入下一关':'▶ 击败敌人',w-30,h/2);}
    ctx.textAlign='start';
    // 场景名
    ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='bold 12px sans-serif';ctx.textAlign='right';ctx.fillText('第'+(this.sceneIdx+1)+'关 '+this.sceneCfg.name,w-15,25);ctx.textAlign='start';
    // 敌人
    for(const enemy of this.enemies){if(!enemy.dead||enemy.deathTimer<0.5)enemy.draw(ctx,this.camX);}
    if(this.boss&&(!this.boss.dead||this.boss.deathTimer<0.5))this.boss.draw(ctx,this.camX);
    // 玩家
    this.player.draw(ctx,this.camX,this.groundY);
    this.player.drawHealthBar(ctx,this.camX);
    // 粒子
    for(const p of this.particles)p.draw(ctx,this.camX);
    ctx.restore();
    // UI
    this.joystick.draw(ctx);
    this.drawButtons(ctx);
    this.drawPlayerHUD(ctx);
    this.drawWeaponInfo(ctx);
    if(this.sceneClear){ctx.fillStyle='rgba(255,204,0,0.8)';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('敌人已清除!',w/2,h/2-40);ctx.textAlign='start';}
    if(this.state==='gameover'){
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#ff4444';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('战斗失败',w/2,h/2-30);
      ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText(this.gameOverCause,w/2,h/2+10);
      ctx.fillStyle='#ffcc00';ctx.font='14px sans-serif';ctx.fillText('点击重新开始',w/2,h/2+50);ctx.textAlign='start';
    }
    if(this.state==='victory'){
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#ffcc00';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('恭喜通关!',w/2,h/2-20);
      ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('所有敌人已被击败',w/2,h/2+20);
      ctx.fillStyle='#ffcc00';ctx.font='14px sans-serif';ctx.fillText('点击返回主菜单',w/2,h/2+60);ctx.textAlign='start';
    }
  }
  drawButtons(ctx){
    const ba=this.btnAreas;
    // 攻击
    ctx.fillStyle='rgba(255,80,60,0.3)';ctx.strokeStyle='rgba(255,80,60,0.6)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(ba.attack.x,ba.attack.y,ba.attack.r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('攻击',ba.attack.x,ba.attack.y+5);
    // 跳跃
    ctx.fillStyle='rgba(80,180,255,0.3)';ctx.strokeStyle='rgba(80,180,255,0.6)';
    ctx.beginPath();ctx.arc(ba.jump.x,ba.jump.y,ba.jump.r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.fillText('跳跃',ba.jump.x,ba.jump.y+5);
    // 技能
    ctx.fillStyle='rgba(255,180,60,0.3)';ctx.strokeStyle='rgba(255,180,60,0.6)';
    ctx.beginPath();ctx.arc(ba.skill.x,ba.skill.y,ba.skill.r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.fillText('技能',ba.skill.x,ba.skill.y+5);
    if(this.player.skillTimer>0){
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.arc(ba.skill.x,ba.skill.y,ba.skill.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.fillText(Math.ceil(this.player.skillTimer)+'s',ba.skill.x,ba.skill.y+5);
    }
    ctx.textAlign='start';
  }
  drawPlayerHUD(ctx){
    const px=15,py=15;const bw=120,bh=10;
    ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.fillText('火柴人战士',px,py+12);
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px,py+20,bw,bh);
    const hpR=this.player.hp/this.player.maxHp;
    const hpGrad=ctx.createLinearGradient(px,0,px+bw,0);hpGrad.addColorStop(0,'#ff3333');hpGrad.addColorStop(0.5,'#ff8833');hpGrad.addColorStop(1,'#44cc44');
    ctx.fillStyle=hpGrad;ctx.fillRect(px,py+20,bw*hpR,bh);
    ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.fillText(Math.ceil(this.player.hp)+'/'+this.player.maxHp,px+bw/2-15,py+29);
  }
  drawWeaponInfo(ctx){
    const wcfg=this.player.getWeaponCfg();
    ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='bold 11px sans-serif';ctx.textAlign='right';
    ctx.fillText('武器: '+wcfg.name,this.gameW-15,this.gameH-140);ctx.textAlign='start';
  }
  handleClick(gx,gy){if(this.state==='gameover'){this.restart();}else if(this.state==='victory'){this.goToMenu();}}
  restart(){
    this.sceneIdx=DB.data.scene-1;this.sceneCfg=CFG.SCENES[this.sceneIdx];this.worldW=this.sceneCfg.width;
    this.player.hp=this.player.maxHp;this.state='playing';this.gameOverCause='';this.victoryScene=false;this.initScene();
  }
  goToMenu(){
    this.running=false;document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');updateMenuDisplay();
  }
}

// ==================== 菜单 ====================
function updateMenuDisplay(){
  document.getElementById('menuMaxScene').textContent=DB.data.maxScene;
  document.getElementById('menuWeapon').textContent=CFG.WEAPONS[DB.data.weapon]?.name||'剑';
  const wg=document.getElementById('weaponGrid');
  if(wg){wg.innerHTML='';for(const k in CFG.WEAPONS){const wcfg=CFG.WEAPONS[k];const div=document.createElement('div');div.className='weapon-btn'+(DB.data.weapon===k?' selected':'');div.textContent=wcfg.name;div.onclick=()=>{DB.data.weapon=k;DB.save();updateMenuDisplay();};wg.appendChild(div);}}
  const sg=document.getElementById('sceneGrid');
  if(sg){sg.innerHTML='';for(let i=0;i<CFG.SCENES.length;i++){const scene=CFG.SCENES[i];const locked=i>=DB.data.maxScene;const div=document.createElement('div');div.className='scene-btn'+(locked?' locked':'');div.innerHTML='<span class="sc-num">'+(i+1)+'</span><span class="sc-name">'+(scene.boss?'BOSS':scene.name)+'</span>';if(!locked){div.onclick=()=>{DB.data.scene=i+1;DB.save();document.getElementById('mainMenu').classList.add('hidden');document.getElementById('gameScreen').classList.remove('hidden');new Game();};}sg.appendChild(div);}}
}

// ==================== 启动 ====================
let _game=null;
function startGame(){
  const lo=document.getElementById('loadOverlay');if(lo)lo.style.display='none';
  try{document.getElementById('mainMenu').classList.add('hidden');document.getElementById('gameScreen').classList.remove('hidden');if(_game){_game.running=false;}_game=new Game();}catch(e){console.error('startGame error:',e&&e.message?e.message:e,e&&e.stack?e.stack:'');}
}
window.startGame=startGame;
document.addEventListener('DOMContentLoaded',()=>{DB.init();updateMenuDisplay();Assets.loadAll().then(()=>{const el=document.getElementById('loadOverlay');if(el){el.classList.add('load-done');el.style.display='none';}}).catch(()=>{const el=document.getElementById('loadOverlay');if(el){el.classList.add('load-done');el.style.display='none';}});});
})();