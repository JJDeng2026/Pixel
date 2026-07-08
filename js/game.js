/**
 * 忍者战士 v8.0 - AI精灵图动画系统 + 参考《忍者必须死》风格
 */
(function(){
'use strict';

// ==================== 精灵贴图系统（自动抠背景） ====================
const Sprite={
  _imgs:{},
  _cleaned:{},
  _loaded:false,
  _loading:false,
  _loadPromise:null,
  
  load(){
    if(this._loading)return this._loadPromise;
    this._loading=true;
    const map={
      playerIdle:'assets/sprites/player_idle_1.jpg',
      playerRun:'assets/sprites/player_run.jpg',
      playerJump:'assets/sprites/player_jump_1.jpg',
      playerAtkSword:'assets/sprites/player_atk_sword_1.jpg',
      playerAtkKnife:'assets/sprites/player_atk_knife.jpg',
      playerAtkStaff:'assets/sprites/player_atk_staff.jpg',
      playerAtkSpear:'assets/sprites/player_atk_spear.jpg',
      playerSkill:'assets/sprites/player_skill_1.jpg',
      enemyIdle:'assets/sprites/enemy_idle_1.jpg',
      enemyRun:'assets/sprites/enemy_run_1.jpg',
      enemyAttack:'assets/sprites/enemy_attack.jpg',
      bossIdle:'assets/sprites/boss_idle.jpg',
      bossRun:'assets/sprites/boss_run.jpg',
      bossSkill:'assets/sprites/boss_skill.jpg',
    };
    const total=Object.keys(map).length;
    let loaded=0;
    this._loadPromise=new Promise(resolve=>{
      const check=()=>{loaded++;if(loaded>=total){this._loaded=true;resolve();}};
      for(const[k,src]of Object.entries(map)){
        const img=new Image();
        img.onload=()=>{this._removeBg(k,img);check();};
        img.onerror=check;img.src=src;
        this._imgs[k]=img;
      }
    });
    return this._loadPromise;
  },
  
  // 自动检测并去除背景色
  _removeBg(key,img){
    try{
      const w=img.naturalWidth,h=img.naturalHeight;
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
      try{
        const data=ctx.getImageData(0,0,w,h);
        const px=data.data;
        // 采样四个角+四个边中点，取平均作为背景色
        let bgR=0,bgG=0,bgB=0,samples=0;
        const samplePts=[
          [0,0],[w-1,0],[0,h-1],[w-1,h-1],
          [Math.floor(w/2),0],[Math.floor(w/2),h-1],
          [0,Math.floor(h/2)],[w-1,Math.floor(h/2)]
        ];
        for(const[sx,sy]of samplePts){
          const si=(sy*w+sx)*4;
          bgR+=px[si];bgG+=px[si+1];bgB+=px[si+2];samples++;
        }
        bgR=Math.round(bgR/samples);bgG=Math.round(bgG/samples);bgB=Math.round(bgB/samples);
        // 把接近背景色的像素变透明（容差30）
        const tol=30;
        for(let i=0;i<px.length;i+=4){
          const dr=Math.abs(px[i]-bgR),dg=Math.abs(px[i+1]-bgG),db=Math.abs(px[i+2]-bgB);
          if(dr<tol&&dg<tol&&db<tol){
            px[i+3]=0;
          }else if(dr<tol*1.5&&dg<tol*1.5&&db<tol*1.5){
            const dist=Math.max(dr,dg,db)/tol;
            px[i+3]=Math.floor(255*(1-dist));
          }
        }
        ctx.putImageData(data,0,0);
        this._cleaned[key]=c;
      }catch(e2){
        this._cleaned[key]=c;
      }
    }catch(e){
      this._cleaned[key]=null;
    }
  },
  
  // 返回抠底后的图片（fallback到原始图片）
  get(key){return this._cleaned[key]||this._imgs[key]||null;}
};

// ==================== 配置 ====================
const CFG={
  PLAYER:{hp:120,baseAtk:18,spd:4.0,jumpForce:12,atkCooldown:0.35,skillCooldown:5,skillDmgMul:2.5},
  WEAPONS:{
    sword:{name:'剑',atkMul:1.0,range:60,speed:1.0,color:'#ffdd44',anim:'playerAtkSword',wLen:26,wWid:5},
    staff:{name:'棍',atkMul:0.8,range:70,speed:1.2,color:'#ffaa44',anim:'playerAtkStaff',wLen:32,wWid:4},
    knife:{name:'刀',atkMul:1.3,range:45,speed:0.85,color:'#ff6644',anim:'playerAtkKnife',wLen:22,wWid:6},
    spear:{name:'枪',atkMul:1.1,range:75,speed:0.9,color:'#88ccff',anim:'playerAtkSpear',wLen:34,wWid:4},
  },
  ENEMIES:{
    sword:{name:'剑士',hp:40,atk:8,spd:1.5,atkRange:50,sight:450,atkCd:1.5,dodge:0.3,color:'#c22',jumpChance:0.15,gold:10},
    spear:{name:'枪兵',hp:35,atk:10,spd:1.8,atkRange:65,sight:480,atkCd:1.8,dodge:0.25,color:'#c44',jumpChance:0.2,gold:12},
    axe:{name:'斧兵',hp:55,atk:14,spd:1.2,atkRange:40,sight:430,atkCd:2.0,dodge:0.15,color:'#c55',jumpChance:0.1,gold:15},
  },
  CHAPTERS:[
    {id:1,name:'草原',sky:'#87CEEB',ground:'#7ec850',subLevels:[
      {id:1,name:'草原·1',enemies:[{type:'sword',count:5},{type:'spear',count:1}],boss:false,width:2200},
      {id:2,name:'草原·2',enemies:[{type:'sword',count:3},{type:'spear',count:2}],boss:false,width:2300},
      {id:3,name:'草原·3',enemies:[{type:'spear',count:4},{type:'sword',count:1}],boss:false,width:2400},
      {id:4,name:'草原·4',enemies:[{type:'sword',count:3},{type:'axe',count:3}],boss:false,width:2500},
      {id:5,name:'草原·BOSS',enemies:[{type:'sword',count:2},{type:'spear',count:2}],boss:true,bossName:'草原之王',width:2000},
    ]},
    {id:2,name:'森林',sky:'#5a8a3c',ground:'#4a6a2c',subLevels:[
      {id:1,name:'森林·1',enemies:[{type:'spear',count:4},{type:'sword',count:2}],boss:false,width:2300},
      {id:2,name:'森林·2',enemies:[{type:'spear',count:3},{type:'sword',count:3}],boss:false,width:2400},
      {id:3,name:'森林·3',enemies:[{type:'axe',count:5},{type:'spear',count:1}],boss:false,width:2500},
      {id:4,name:'森林·4',enemies:[{type:'spear',count:3},{type:'axe',count:3}],boss:false,width:2600},
      {id:5,name:'森林·BOSS',enemies:[{type:'spear',count:2},{type:'axe',count:2}],boss:true,bossName:'森林守护者',width:2000},
    ]},
    {id:3,name:'洞穴',sky:'#3a2a1a',ground:'#5a4a3a',subLevels:[
      {id:1,name:'洞穴·1',enemies:[{type:'axe',count:4},{type:'spear',count:2}],boss:false,width:2400},
      {id:2,name:'洞穴·2',enemies:[{type:'axe',count:3},{type:'spear',count:3}],boss:false,width:2500},
      {id:3,name:'洞穴·3',enemies:[{type:'sword',count:3},{type:'axe',count:3}],boss:false,width:2600},
      {id:4,name:'洞穴·4',enemies:[{type:'spear',count:4},{type:'axe',count:3}],boss:false,width:2800},
      {id:5,name:'洞穴·BOSS',enemies:[{type:'axe',count:3}],boss:true,bossName:'洞穴巨兽',width:2000},
    ]},
    {id:4,name:'火山',sky:'#cc4400',ground:'#884422',subLevels:[
      {id:1,name:'火山·1',enemies:[{type:'axe',count:5},{type:'sword',count:2}],boss:false,width:2400},
      {id:2,name:'火山·2',enemies:[{type:'sword',count:4},{type:'axe',count:3}],boss:false,width:2500},
      {id:3,name:'火山·3',enemies:[{type:'spear',count:4},{type:'axe',count:3}],boss:false,width:2600},
      {id:4,name:'火山·4',enemies:[{type:'sword',count:3},{type:'spear',count:3},{type:'axe',count:2}],boss:false,width:2800},
      {id:5,name:'火山·BOSS',enemies:[{type:'axe',count:2},{type:'spear',count:2}],boss:true,bossName:'熔岩领主',width:2000},
    ]},
    {id:5,name:'暗影城堡',sky:'#1a0000',ground:'#2a0a0a',subLevels:[
      {id:1,name:'城堡·1',enemies:[{type:'sword',count:4},{type:'spear',count:3}],boss:false,width:2400},
      {id:2,name:'城堡·2',enemies:[{type:'axe',count:5},{type:'sword',count:2}],boss:false,width:2500},
      {id:3,name:'城堡·3',enemies:[{type:'spear',count:4},{type:'axe',count:3}],boss:false,width:2600},
      {id:4,name:'城堡·4',enemies:[{type:'sword',count:3},{type:'spear',count:3},{type:'axe',count:3}],boss:false,width:2800},
      {id:5,name:'城堡·BOSS',enemies:[{type:'sword',count:2},{type:'axe',count:2},{type:'spear',count:2}],boss:true,bossName:'暗影之王',finalBoss:true,width:2000},
    ]},
  ],
  BOSS_CFG:{hp:300,armor:150,atk:20,spd:1.0,atkRange:60,sight:500,atkCd:2.5,stunDuration:2,gold:80},
  BOSS_SKILLS:{cooldown:8,groundSlam:{range:120,dmg:30,name:'地震踩踏'},charge:{range:200,dmg:25,name:'冲锋撞击'},projectile:{range:300,dmg:20,name:'能量弹'}},
  LEVEL_COSTS:[0,50,120,250,500,1000,2000,4000,8000,16000],
  MAX_LEVEL:10,
  SAVE_KEY:'stickman_rpg_v8',
};

// ==================== 装备 ====================
const EQUIP={
  armor:[
    {id:'armor1',name:'布甲',def:10,desc:'减少10%伤害'},
    {id:'armor2',name:'铁甲',def:20,desc:'减少20%伤害'},
    {id:'armor3',name:'重甲',def:30,desc:'减少30%伤害'},
    {id:'armor4',name:'龙鳞甲',def:40,desc:'减少40%伤害'},
  ],
  bracelet:[
    {id:'brac1',name:'铜镯',regen:1,desc:'秒回1血'},
    {id:'brac2',name:'银镯',regen:3,desc:'秒回3血'},
    {id:'brac3',name:'金镯',regen:5,desc:'秒回5血'},
    {id:'brac4',name:'玉镯',regen:8,desc:'秒回8血'},
  ],
  shoes:[
    {id:'shoes1',name:'草鞋',spdBonus:5,desc:'速度+5%'},
    {id:'shoes2',name:'皮靴',spdBonus:10,desc:'速度+10%'},
    {id:'shoes3',name:'铁靴',spdBonus:15,desc:'速度+15%'},
    {id:'shoes4',name:'风行者',spdBonus:25,desc:'速度+25%'},
  ],
  dropChance:0.12,bossDropChance:0.6,
};

// ==================== 存档 ====================
const DB={
  data:{chapter:1,subLevel:1,maxChapter:1,maxSubLevel:1,weapon:'sword',gold:0,playerLevel:1,weaponSkills:{},unlockedWeapons:{sword:true},equippedArmor:null,equippedBracelet:null,equippedShoes:null,inventory:{}},
  init(){
    try{const raw=localStorage.getItem(CFG.SAVE_KEY);if(raw){const d=JSON.parse(raw);this.data=Object.assign(this.data,d);}this.save();}catch(e){}
    try{const oldRaw=localStorage.getItem('stickman_rpg_v6');if(oldRaw){const od=JSON.parse(oldRaw);if(od.inventory&&(!this.data.inventory||Object.keys(this.data.inventory||{}).length===0)){this.data.inventory=od.inventory;this.data.equippedArmor=od.equippedArmor;this.data.equippedBracelet=od.equippedBracelet;this.data.equippedShoes=od.equippedShoes;}this.save();}}catch(e){}
    if(!this.data.weaponSkills)this.data.weaponSkills={};
    if(!this.data.unlockedWeapons)this.data.unlockedWeapons={sword:true};
    if(!this.data.inventory)this.data.inventory={};
  },
  save(){try{localStorage.setItem(CFG.SAVE_KEY,JSON.stringify(this.data));}catch(e){}},
  addGold(amount){this.data.gold+=amount;this.save();},
  spendGold(amount){if(this.data.gold<amount)return false;this.data.gold-=amount;this.save();return true;},
  addItem(category,itemId){if(!this.data.inventory[category])this.data.inventory[category]=[];if(!this.data.inventory[category].includes(itemId))this.data.inventory[category].push(itemId);this.save();},
  hasItem(category,itemId){return this.data.inventory[category]&&this.data.inventory[category].includes(itemId);},
  getEquipped(category){if(category==='weapon')return this.data.weapon;const key={armor:'equippedArmor',bracelet:'equippedBracelet',shoes:'equippedShoes'}[category];return key?this.data[key]:null;},
  equipItem(category,itemId){if(category==='weapon'){this.data.weapon=itemId;this.save();return;}const key={armor:'equippedArmor',bracelet:'equippedBracelet',shoes:'equippedShoes'}[category];if(key){this.data[key]=itemId;this.save();}},
  getDefense(){const e=this.data.equippedArmor?EQUIP.armor.find(x=>x.id===this.data.equippedArmor):null;return e?e.def:0;},
  getRegen(){const e=this.data.equippedBracelet?EQUIP.bracelet.find(x=>x.id===this.data.equippedBracelet):null;return e?e.regen:0;},
  getSpdBonus(){const e=this.data.equippedShoes?EQUIP.shoes.find(x=>x.id===this.data.equippedShoes):null;return e?e.spdBonus:0;},
};

// ==================== 工具函数 ====================
function rand(min,max){return Math.random()*(max-min)+min;}
function randInt(min,max){return Math.floor(rand(min,max+1));}
function clamp(v,min,max){return Math.max(min,Math.min(v,max));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function lerp(a,b,t){return a+(b-a)*t;}
function getChapterScale(c){return 1+(c-1)*0.5;}

// ==================== 粒子/飘字/掉落 ====================
class Particle{
  constructor(x,y,opts={}){this.x=x;this.y=y;this.vx=opts.vx||rand(-1,1);this.vy=opts.vy||rand(-1,1);this.life=opts.life||0.5;this.maxLife=this.life;this.color=opts.color||'#fff';this.size=opts.size||3;this.dead=false;this.gravity=opts.gravity||0;this.shrink=opts.shrink!==false;}
  update(dt){this.x+=this.vx*60*dt;this.y+=this.vy*60*dt;this.vy+=this.gravity*60*dt;this.life-=dt;if(this.life<=0)this.dead=true;}
  draw(ctx,camX){const a=this.life/this.maxLife;ctx.globalAlpha=a;ctx.fillStyle=this.color;const s=this.shrink?this.size*a:this.size;ctx.beginPath();ctx.arc(this.x-camX,this.y,s,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
}
class FloatingText{
  constructor(x,y,text,color){this.x=x;this.y=y;this.text=text;this.color=color;this.life=1.2;this.vy=-2.5;this.dead=false;}
  update(dt){this.y+=this.vy*60*dt;this.life-=dt;if(this.life<=0)this.dead=true;}
  draw(ctx,camX){const a=this.life;ctx.globalAlpha=a;ctx.fillStyle=this.color;ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(this.text,this.x-camX,this.y);ctx.textAlign='start';ctx.globalAlpha=1;}
}
class DropItem{
  constructor(x,y,category,itemId){this.x=x;this.y=y;this.category=category;this.itemId=itemId;this.life=10;this.dead=false;this.pickupRange=40;const item=EQUIP[category].find(e=>e.id===itemId);this.name=item?item.name:'?';this.color={armor:'#4488ff',bracelet:'#ffcc00',shoes:'#44ff88'}[category]||'#fff';}
  update(dt,player){this.life-=dt;if(this.life<=0){this.dead=true;return;}const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<this.pickupRange){this.dead=true;this.pickup(player);}else if(d<120){const dx=player.x-this.x,dy=player.y-this.y;const mag=Math.sqrt(dx*dx+dy*dy);this.x+=dx/mag*2*60*dt;this.y+=dy/mag*2*60*dt;}}
  pickup(player){player.pickupItem(this.category,this.itemId);}
  draw(ctx,camX){const a=this.life<1?this.life:1;ctx.globalAlpha=a;const sx=this.x-camX,sy=this.y;ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(this.name,sx,sy-12);ctx.textAlign='start';ctx.globalAlpha=1;}
}

// ==================== 背景渲染器 ====================
class Background{
  constructor(scene){this.scene=scene;this.buildings=[];this.clouds=[];this.trees=[];this.stars=[];this.generate(scene.width);}
  generate(w){this.buildings=[];this.clouds=[];this.trees=[];this.stars=[];for(let i=0;i<4;i++)this.buildings.push({x:w*0.15+i*(w*0.6/4)+rand(-30,30),w:randInt(60,140),h:randInt(80,200),col:`hsl(${rand(0,360)},${rand(10,30)}%,${rand(20,40)}%)`});for(let i=0;i<8;i++)this.clouds.push({x:rand(0,w),y:rand(30,180),w:rand(60,180),h:rand(20,50)});for(let i=0;i<12;i++)this.trees.push({x:rand(0,w),size:rand(0.5,1.2)});for(let i=0;i<30;i++)this.stars.push({x:rand(0,w),y:rand(0,300),size:rand(0.5,2),tw:rand(0,Math.PI*2)});}
  draw(ctx,camX,gameW,gameH,groundY,sky){
    if(this.scene.id>=4){for(const s of this.stars){s.tw+=0.016;ctx.fillStyle=`rgba(255,255,255,${0.3+Math.sin(s.tw)*0.3})`;ctx.beginPath();ctx.arc(s.x-camX*0.1,s.y,s.size,0,Math.PI*2);ctx.fill();}}
    for(const c of this.clouds){const sx=c.x-camX*0.15;if(sx<-c.w||sx>gameW+c.w)continue;ctx.fillStyle='rgba(255,255,255,0.3)';ctx.beginPath();ctx.ellipse(sx,c.y,c.w/2,c.h/2,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=sky;ctx.fillRect(0,groundY-20,gameW,20);
    for(const b of this.buildings){const sx=b.x-camX*0.6;if(sx<-b.w-20||sx>gameW+20)continue;const by=groundY-b.h;ctx.fillStyle=b.col;ctx.fillRect(sx,by,b.w,b.h);ctx.fillStyle='#2a1a0a';ctx.fillRect(sx+b.w*0.35,by+b.h*0.6,b.w*0.3,b.h*0.4);}
    for(const t of this.trees){const sx=t.x-camX*0.5;if(sx<-40||sx>gameW+40)continue;const ty=groundY-60*t.size;ctx.fillStyle='#4a2a0a';ctx.fillRect(sx-5*t.size,ty,10*t.size,60*t.size);ctx.fillStyle='#3a6a2a';ctx.beginPath();ctx.arc(sx,ty-10*t.size,25*t.size,0,Math.PI*2);ctx.fill();}
  }
}

// ==================== 玩家 ====================
class Player{
  constructor(x,y,level,hp){
    this.x=x;this.y=y;this.vx=0;this.vy=0;this.w=60;this.h=100;
    this.level=level||1;this.maxHp=CFG.PLAYER.hp+this.level*10;
    this.hp=(hp!==undefined&&hp>0)?hp:this.maxHp;
    this.spd=CFG.PLAYER.spd;this.facingRight=true;this.grounded=false;
    this.atkTimer=0;this.skillTimer=0;this.invulnTimer=0;this.hitFlash=0;
    this.state='idle';this.animTimer=0;this.frameIdx=0;this.frameSpeed=8;
    this.attacking=false;this.skilling=false;
    this.weapon='sword';
  }
  getWeaponCfg(){return CFG.WEAPONS[this.weapon]||CFG.WEAPONS.sword;}
  getAtk(){return Math.floor(CFG.PLAYER.baseAtk*(1+(this.level-1)*0.1)*this.getWeaponCfg().atkMul);}
  getAtkRange(){return this.getWeaponCfg().range;}
  getSpdBonus(){return 1+DB.getSpdBonus()/100;}
  getSkillMul(){return CFG.PLAYER.skillDmgMul*(DB.data.weaponSkills&&DB.data.weaponSkills[this.weapon]?1.3:1.0);}
  
  update(dt,joystick,worldW,groundY){
    this.animTimer+=dt;this.atkTimer=Math.max(0,this.atkTimer-dt);
    this.skillTimer=Math.max(0,this.skillTimer-dt);
    this.invulnTimer=Math.max(0,this.invulnTimer-dt);this.hitFlash=Math.max(0,this.hitFlash-dt);
    const wcfg=this.getWeaponCfg();
    this.vx=joystick.dx*this.spd*wcfg.speed*this.getSpdBonus();
    if(Math.abs(this.vx)>0.1)this.facingRight=this.vx>0;
    if(joystick.jumpPressed&&this.grounded&&!this.attacking&&!this.skilling){this.vy=-CFG.PLAYER.jumpForce;this.grounded=false;joystick.jumpPressed=false;}
    this.vy+=25*dt;this.x+=this.vx*60*dt;this.y+=this.vy*60*dt;
    if(this.y+this.h/2>=groundY){this.y=groundY-this.h/2;this.vy=0;this.grounded=true;}else this.grounded=false;
    this.x=clamp(this.x,this.w/2,worldW-this.w/2);
    // 状态机
    if(this.hitFlash>0)this.state='hurt';
    else if(this.skilling)this.state='skill';
    else if(this.attacking)this.state='attack';
    else if(!this.grounded)this.state='jump';
    else if(Math.abs(this.vx)>0.3)this.state='run';
    else this.state='idle';
    // 帧更新
    this.frameIdx+=dt*this.frameSpeed;
    if(this.frameIdx>=99)this.frameIdx-=99;
    if(this.attacking&&this.frameIdx>=this.frameSpeed*6){this.attacking=false;this.frameIdx=0;}
    if(this.skilling&&this.frameIdx>=this.frameSpeed*8){this.skilling=false;this.frameIdx=0;}
  }
  
  attack(){if(this.atkTimer>0||this.attacking)return null;this.atkTimer=this.getWeaponCfg().speed*CFG.PLAYER.atkCooldown;this.attacking=true;this.frameIdx=0;const dir=this.facingRight?1:-1;return {x:this.x+dir*30,y:this.y-5,w:this.getAtkRange(),h:40,damage:this.getAtk(),knockback:dir*5,color:this.getWeaponCfg().color};}
  skill(){if(this.skillTimer>0||this.skilling)return null;this.skillTimer=CFG.PLAYER.skillCooldown;this.skilling=true;this.frameIdx=0;const dir=this.facingRight?1:-1;return {x:this.x+dir*35,y:this.y-15,w:this.getAtkRange()*1.5,h:60,damage:Math.floor(this.getAtk()*this.getSkillMul()),knockback:dir*10,color:'#ff6644',isSkill:true};}
  takeDamage(dmg){if(this.invulnTimer>0)return;const def=DB.getDefense();this.hp-=Math.floor(dmg*(1-def/100));this.invulnTimer=0.3;this.hitFlash=0.15;this.vy=-3;if(this.hp<=0)this.hp=0;}
  pickupItem(category,itemId){DB.addItem(category,itemId);const items=EQUIP[category];const currentId=DB.getEquipped(category);const newIdx=items.findIndex(e=>e.id===itemId);const curIdx=currentId?items.findIndex(e=>e.id===currentId):-1;if(newIdx>curIdx)DB.equipItem(category,itemId);}
  
  draw(ctx,camX){
    if(this.invulnTimer>0&&Math.floor(this.invulnTimer*20)%2===0)return;
    const img=this.getSprite();
    const sx=this.x-camX-this.w/2,sy=this.y-this.h/2;
    ctx.save();
    if(!this.facingRight){ctx.translate(this.x-camX,0);ctx.scale(-1,1);ctx.translate(-(this.x-camX),0);}
    if(this.hitFlash>0&&this.state!=='hurt')ctx.globalAlpha=0.5;
    if(img&&img.complete&&img.naturalWidth>0){
      const iw=img.naturalWidth,ih=img.naturalHeight;
      const scale=this.h/ih;
      const dw=Math.min(iw*scale,this.w);
      const dx=(this.w-dw)/2;
      const bob=this.state==='run'?Math.abs(Math.sin(this.frameIdx*0.8))*4:(this.state==='idle'?Math.sin(this.frameIdx*0.5)*2:0);
      const atkShift=this.state==='attack'?(Math.sin(this.frameIdx*1.2)*4):0;
      ctx.drawImage(img,sx+dx,sy+bob+atkShift,dw,this.h);
      // 技能特效：旋转光环
      if(this.state==='skill'){
        ctx.globalAlpha=0.3+Math.sin(this.frameIdx*2)*0.2;
        ctx.strokeStyle='#ffaa00';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(this.x-camX,this.y-this.h*0.3,this.w*0.7,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#ff6600';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(this.x-camX,this.y-this.h*0.3,this.w*0.6+Math.sin(this.frameIdx*4)*8,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=1;
      }
    }
    ctx.restore();
    this.drawHealthBar(ctx,camX);
  }
  getSprite(){
    switch(this.state){
      case'attack':return Sprite.get(this.getWeaponCfg().anim||'playerAtkSword');
      case'skill':return Sprite.get('playerSkill');
      case'run':return Sprite.get('playerRun');
      case'jump':return Sprite.get('playerJump');
      default:return Sprite.get('playerIdle');
    }
  }
  
  drawHealthBar(ctx,camX){
    const sx=this.x-camX,sy=this.y-this.h/2-20;const bw=50,bh=6;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
    const hpR=this.hp/this.maxHp;ctx.fillStyle=hpR>0.5?'#44cc44':hpR>0.25?'#ff8833':'#ff3333';
    ctx.fillRect(sx-bw/2,sy,bw*hpR,bh);
    ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(this.hp),sx,sy-2);ctx.textAlign='start';
  }
}

// ==================== 敌人 ====================
class Enemy{
  constructor(type,x,y,groundY,idx,chapterId){
    const cfg=CFG.ENEMIES[type];this.cfg=cfg;this.type=type;this.name=cfg.name;
    const scale=getChapterScale(chapterId||1);
    this.x=x;this.y=y;this.groundY=groundY;this.w=52;this.h=90;
    this.maxHp=Math.floor(cfg.hp*scale);this.hp=this.maxHp;
    this.atk=Math.floor(cfg.atk*scale);this.spd=cfg.spd;this.atkRange=cfg.atkRange;
    this.sight=cfg.sight;this.atkCd=cfg.atkCd;this.dodge=cfg.dodge;
    this.jumpChance=cfg.jumpChance||0.15;this.goldReward=cfg.gold||10;
    this.facingRight=false;this.vx=0;this.vy=0;
    this.state='patrol';this.stateTimer=rand(0.2,0.6);this.atkTimer=0;
    this.hitFlash=0;this.hitStunTimer=0;this.dead=false;this.deathTimer=0;this.fullyRemoved=false;
    this.attacking=false;this.grounded=true;
    this.patrolDir=rand(0,1)<0.5?-1:1;this.patrolBase=this.x;
    this.idx=idx||0;this.walkCycle=0;this.breathCycle=rand(0,6);
    this.jumpCooldown=0;this.flankDir=rand(0,1)<0.5?-1:1;this.aggressiveTimer=rand(0,1);
    this.animTimer=0;this.frameIdx=0;this.frameSpeed=8;
  }
  
  update(dt,player,playerAttacking,worldW){
    if(this.dead){this.deathTimer+=dt;if(this.deathTimer>0.6)this.fullyRemoved=true;return;}
    this.animTimer+=dt;this.breathCycle+=dt*2.5;
    this.atkTimer=Math.max(0,this.atkTimer-dt);
    this.hitFlash=Math.max(0,this.hitFlash-dt);this.hitStunTimer=Math.max(0,this.hitStunTimer-dt);
    this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);this.aggressiveTimer-=dt;
    if(this.hitStunTimer>0){this.state='hitstun';this.vx*=0.9;this.x+=this.vx*60*dt;
      this.x=clamp(this.x,this.w,worldW-this.w);return;}
    const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
    this.facingRight=player.x>this.x;
    const playerClose=d<70;let flankOffset=this.flankDir*50;
    if(this.aggressiveTimer<=0&&d<this.sight){this.aggressiveTimer=rand(1,3);this.flankDir=rand(0,1)<0.5?-1:1;}
    switch(this.state){
      case 'idle':
        this.vx=0;this.stateTimer-=dt;if(this.stateTimer<=0){this.state='patrol';this.stateTimer=rand(0.8,2.5);this.patrolDir=rand(0,1)<0.5?-1:1;}
        if(d<this.sight)this.state='chase';break;
      case 'patrol':
        // 巡逻时限制在世界边界内
        if(this.x<=this.w+10)this.patrolDir=1;
        if(this.x>=worldW-this.w-10)this.patrolDir=-1;
        this.vx=this.spd*this.patrolDir*0.6;
        this.stateTimer-=dt;if(this.stateTimer<=0){this.state='idle';this.stateTimer=rand(0.5,2);}
        if(d<this.sight)this.state='chase';
        if(Math.abs(this.x-this.patrolBase)>200)this.patrolDir*=-1;break;
      case 'chase':
        // 更智能的追击：保持攻击距离，不会越界
        let targetX=player.x+flankOffset;
        // 限制目标位置在世界内
        targetX=clamp(targetX,this.w+20,worldW-this.w-20);
        const dx=targetX-this.x;
        this.vx=clamp(dx*0.12,-1,1)*this.spd;
        // 如果快到边界了就不要继续往外跑
        if(this.x<=this.w+30&&this.vx<0)this.vx=0;
        if(this.x>=worldW-this.w-30&&this.vx>0)this.vx=0;
        if(playerAttacking&&playerClose&&this.jumpCooldown<=0&&Math.random()<this.jumpChance){this.vy=-9;this.grounded=false;this.jumpCooldown=2.0;}
        if(d<this.atkRange&&this.atkTimer<=0&&this.grounded){this.state='attack';this.attacking=true;this.frameIdx=0;this.atkTimer=this.atkCd;}
        if(d>this.sight*1.2){this.state='idle';this.stateTimer=rand(0.5,1.5);}
        if(playerAttacking&&d<100&&Math.random()<this.dodge){
          // 闪避方向优先往世界内部，不会闪出去
          const dodgeDir=(this.x<worldW/2)?1:-1;
          this.state='dodge';this.stateTimer=0.35;this.vx=dodgeDir*this.spd*3;
        }
        break;
      case 'attack':
        this.vx*=0.7;this.frameIdx+=dt*this.frameSpeed;if(this.frameIdx>=6){this.attacking=false;this.frameIdx=0;this.state='chase';this.doAttack(player);}break;
      case 'dodge':this.stateTimer-=dt;this.vx*=0.95;
        if(this.x<=this.w+20)this.vx=Math.abs(this.vx)*0.5;
        if(this.x>=worldW-this.w-20)this.vx=-Math.abs(this.vx)*0.5;
        if(this.stateTimer<=0)this.state='chase';break;
      case 'hitstun':break;
    }
    if(!this.grounded){this.vy+=25*dt;}
    this.x+=this.vx*60*dt;this.y+=this.vy*60*dt;
    // 严格限制敌人不离开世界边界
    this.x=clamp(this.x,this.w*0.6,worldW-this.w*0.6);
    if(this.y+this.h/2>=this.groundY){this.y=this.groundY-this.h/2;this.vy=0;this.grounded=true;}else this.grounded=false;
    // 更新帧
    if(this.state==='patrol'||this.state==='chase'){this.frameIdx+=dt*this.frameSpeed;if(this.frameIdx>=8)this.frameIdx-=8;}
    else if(this.state==='idle'){this.frameIdx+=dt*4;if(this.frameIdx>=8)this.frameIdx-=8;}
    else if(this.state==='dodge'){this.frameIdx+=dt*12;if(this.frameIdx>=8)this.frameIdx-=8;}
  }
  
  doAttack(player){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<this.atkRange+25)player.takeDamage(this.atk);}
  takeDamage(dmg,knockback){this.hp-=dmg;this.hitFlash=0.1;this.hitStunTimer=0.15;this.vx=knockback||0;if(this.hp<=0){this.die();return true;}return false;}
  die(){this.dead=true;this.state='dead';this.deathTimer=0;}
  
  draw(ctx,camX){
    if(this.fullyRemoved)return;
    let img;
    if(this.attacking)img=Sprite.get('enemyAttack');
    else if(this.state==='patrol'||this.state==='chase'||this.state==='dodge')img=Sprite.get('enemyRun');
    else img=Sprite.get('enemyIdle');
    const sx=this.x-camX-this.w/2,sy=this.y-this.h/2;
    ctx.save();
    if(this.dead){ctx.globalAlpha=Math.max(0,1-this.deathTimer*2.5);ctx.translate(this.x-camX,this.y);ctx.rotate(this.deathTimer*4);ctx.translate(-(this.x-camX),-this.y);}
    if(!this.facingRight){ctx.translate(this.x-camX,0);ctx.scale(-1,1);ctx.translate(-(this.x-camX),0);}
    if(this.hitFlash>0)ctx.globalAlpha=0.5;
    if(img&&img.complete&&img.naturalWidth>0){
      const iw=img.naturalWidth,ih=img.naturalHeight;
      const scale=this.h/ih;
      const dw=Math.min(iw*scale,this.w);
      const dx=(this.w-dw)/2;
      const bob=this.state==='chase'||this.state==='patrol'?Math.abs(Math.sin(this.frameIdx*0.8))*3:(this.state==='idle'?Math.sin(this.frameIdx*0.5)*1.5:0);
      ctx.drawImage(img,sx+dx,sy+bob,dw,this.h);
    }
    ctx.restore();
    if(!this.dead)this.drawHealthBar(ctx,camX);
  }
  
  drawHealthBar(ctx,camX){
    const sx=this.x-camX,sy=this.y-this.h/2-18;const bw=40,bh=5;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);
    ctx.fillStyle='#ff3333';ctx.fillRect(sx-bw/2,sy,bw*(this.hp/this.maxHp),bh);
  }
}

// ==================== BOSS ====================
class Boss extends Enemy{
  constructor(type,x,y,groundY,cfgOverride,chapterId){
    super('sword',x,y,groundY,0,chapterId);
    const bcfg=cfgOverride||CFG.BOSS_CFG;
    const scale=getChapterScale(chapterId||1);
    this.w=72;this.h=120;
    this.maxHp=Math.floor(bcfg.hp*scale);this.hp=this.maxHp;
    this.armor=Math.floor(bcfg.armor*scale);this.armorMax=this.armor;
    this.atk=Math.floor(bcfg.atk*scale);this.spd=bcfg.spd;
    this.atkRange=bcfg.atkRange;this.sight=bcfg.sight;this.atkCd=bcfg.atkCd;
    this.stunDuration=bcfg.stunDuration;this.name=bcfg.bossName||'BOSS';this.armorHitFlash=0;
    this.goldReward=bcfg.gold||80;this.stunned=false;this.stunTimer=0;
    this.skillCooldown=CFG.BOSS_SKILLS.cooldown;this.skillTimer=rand(3,6);
    this.skilling=false;this.skillType='';this.skillWarning=0;
    this.skillTypes=['groundSlam','charge','projectile'];
    this.skillChargeDir=0;this.finalBoss=bcfg.finalBoss||false;
    this.frameSpeed=4;
  }
  
  update(dt,player,playerAttacking,worldW){
    if(this.dead){this.deathTimer+=dt;if(this.deathTimer>0.6)this.fullyRemoved=true;return;}
    this.animTimer+=dt;this.atkTimer=Math.max(0,this.atkTimer-dt);
    this.hitFlash=Math.max(0,this.hitFlash-dt);this.armorHitFlash=Math.max(0,this.armorHitFlash-dt);
    if(this.stunned){this.stunTimer-=dt;if(this.stunTimer<=0){this.stunned=false;this.armor=this.armorMax;this.skillTimer=rand(3,6);}return;}
    const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});
    this.facingRight=player.x>this.x;
    if(!this.skilling){
      this.skillTimer-=dt;
      if(this.skillTimer<=0&&d<this.sight&&!this.attacking){this.startSkill(player);}
    }
    if(this.skilling){this.executeSkill(dt,player,worldW);return;}
    this.vx=(this.facingRight?1:-1)*this.spd;
    if(d<this.atkRange&&this.atkTimer<=0){this.attacking=true;this.frameIdx=0;this.atkTimer=this.atkCd;}
    this.x+=this.vx*60*dt;this.y=this.groundY-this.h/2;
    // BOSS边界限制
    this.x=clamp(this.x,this.w,worldW-this.w);
    if(this.attacking){this.frameIdx+=dt*6;if(this.frameIdx>=6){this.attacking=false;this.frameIdx=0;this.doAttack(player);}}
    if(this.state!=='patrol'&&this.state!=='chase')this.state='chase';
    this.frameIdx+=dt*this.frameSpeed;if(this.frameIdx>=8)this.frameIdx-=8;
  }
  
  startSkill(player){this.skilling=true;this.frameIdx=0;this.skillWarning=0.8;const idx=this.chapterId>=4?randInt(0,2):(this.chapterId>=2?randInt(0,1):0);this.skillType=this.skillTypes[idx];this.skillChargeDir=this.facingRight?1:-1;this.vx=0;}
  
  executeSkill(dt,player,worldW){
    if(this.skillWarning>0){this.skillWarning-=dt;return;}
    this.frameIdx+=dt*this.frameSpeed;
    const skillCfg=CFG.BOSS_SKILLS[this.skillType];
    if(this.skillType==='groundSlam'){if(this.frameIdx>=3&&this.frameIdx<4){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<skillCfg.range)player.takeDamage(skillCfg.dmg);}if(this.frameIdx>=8)this.endSkill();}
    else if(this.skillType==='charge'){this.vx=this.skillChargeDir*this.spd*3;this.x+=this.vx*60*dt;
      // 冲锋技能边界限制
      this.x=clamp(this.x,this.w,worldW-this.w);
      if(this.x<=this.w||this.x>=worldW-this.w){this.endSkill();return;}
      if(this.frameIdx>=3&&this.frameIdx<5){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<this.atkRange+30)player.takeDamage(skillCfg.dmg);}if(this.frameIdx>=8)this.endSkill();}
    else if(this.skillType==='projectile'){if(this.frameIdx>=3&&this.frameIdx<4){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<skillCfg.range)player.takeDamage(skillCfg.dmg);}if(this.frameIdx>=6)this.endSkill();}
  }
  
  endSkill(){this.skilling=false;this.frameIdx=0;this.skillType='';this.skillTimer=CFG.BOSS_SKILLS.cooldown+rand(0,3);}
  doAttack(player){const d=dist({x:this.x,y:this.y},{x:player.x,y:player.y});if(d<this.atkRange+35)player.takeDamage(this.atk);}
  
  takeDamage(dmg,knockback){
    if(this.stunned){this.hp-=dmg;this.hitFlash=0.1;if(this.hp<=0){this.die();return true;}return false;}
    if(this.armor>0){this.armor-=dmg;this.armorHitFlash=0.08;if(this.armor<=0){this.armor=0;this.stunned=true;this.stunTimer=this.stunDuration;}return false;}
    this.hp-=dmg;this.hitFlash=0.1;if(this.hp<=0){this.die();return true;}return false;
  }
  
  draw(ctx,camX){
    if(this.fullyRemoved)return;
    let img;
    if(this.skilling)img=Sprite.get('bossSkill');
    else if(this.attacking)img=Sprite.get('bossIdle');
    else img=Sprite.get('bossRun');
    const sx=this.x-camX-this.w/2,sy=this.y-this.h/2;
    ctx.save();
    if(this.dead){ctx.globalAlpha=Math.max(0,1-this.deathTimer*2.5);ctx.translate(this.x-camX,this.y);ctx.rotate(this.deathTimer*4);ctx.translate(-(this.x-camX),-this.y);}
    if(!this.facingRight){ctx.translate(this.x-camX,0);ctx.scale(-1,1);ctx.translate(-(this.x-camX),0);}
    if(this.stunned)ctx.globalAlpha=0.4+Math.sin(this.animTimer*10)*0.3;
    else if(this.hitFlash>0)ctx.globalAlpha=0.5;
    // BOSS技能预警效果
    if(this.skillWarning>0){ctx.globalAlpha=0.5+Math.sin(this.animTimer*15)*0.3;ctx.fillStyle='rgba(255,0,0,0.2)';ctx.beginPath();ctx.arc(this.x-camX,this.y,this.w*0.9,0,Math.PI*2);ctx.fill();}
    if(img&&img.complete&&img.naturalWidth>0){
      const iw=img.naturalWidth,ih=img.naturalHeight;
      const scale=this.h/ih;
      const dw=Math.min(iw*scale,this.w);
      const dx=(this.w-dw)/2;
      const bob=Math.sin(this.frameIdx*0.5)*2;
      ctx.drawImage(img,sx+dx,sy+bob,dw,this.h);
    }
    ctx.restore();
    if(!this.dead)this.drawBars(ctx,camX);
    if(this.skilling&&this.skillWarning>0)this.drawSkillWarning(ctx,camX);
    if(this.skilling&&this.skillWarning<=0)this.drawSkillEffect(ctx,camX);
  }
  
  drawSkillWarning(ctx,camX){
    const sx=this.x-camX;const alpha=0.5+Math.sin(this.animTimer*12)*0.3;
    ctx.fillStyle='rgba(255,80,80,'+alpha+')';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
    const names={groundSlam:'地震踩踏!',charge:'冲锋撞击!',projectile:'能量弹!'};
    ctx.fillText('⚠ '+names[this.skillType]+' ⚠',sx,this.y-this.h/2-30);
    const skillCfg=CFG.BOSS_SKILLS[this.skillType];
    ctx.strokeStyle='rgba(255,80,80,'+alpha+')';ctx.lineWidth=2;ctx.setLineDash([5,5]);
    ctx.beginPath();ctx.arc(sx,this.y,skillCfg.range,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.textAlign='start';
  }
  
  drawSkillEffect(ctx,camX){
    const sx=this.x-camX,sy=this.y;
    const skillCfg=CFG.BOSS_SKILLS[this.skillType];
    if(this.skillType==='groundSlam'&&this.frameIdx>=2&&this.frameIdx<5){
      ctx.fillStyle='rgba(255,136,68,0.4)';ctx.beginPath();ctx.ellipse(sx,sy+this.h/2,skillCfg.range*0.8,15,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(255,136,68,0.8)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sx,sy+this.h/2,skillCfg.range*0.8,15,0,0,Math.PI*2);ctx.stroke();
    }else if(this.skillType==='charge'&&this.frameIdx>=2&&this.frameIdx<6){
      ctx.fillStyle='rgba(255,68,68,0.3)';ctx.beginPath();ctx.arc(sx,sy,35,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(255,68,68,0.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy,35,0,Math.PI*2);ctx.stroke();
    }else if(this.skillType==='projectile'&&this.frameIdx>=2&&this.frameIdx<5){
      ctx.fillStyle='rgba(255,68,255,0.4)';ctx.beginPath();ctx.arc(sx,sy-20,15,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(255,68,255,0.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy-20,15,0,Math.PI*2);ctx.stroke();
    }
  }
  
  drawBars(ctx,camX){
    const sx=this.x-camX,sy=this.y-this.h/2-25;const bw=60,bh=6;
    if(this.armorMax>0){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy,bw,bh);ctx.fillStyle='#4488ff';ctx.fillRect(sx-bw/2,sy,bw*(this.armor/this.armorMax),bh);}
    const sy2=sy-10;ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(sx-bw/2,sy2,bw,bh);ctx.fillStyle='#ff3333';ctx.fillRect(sx-bw/2,sy2,bw*(this.hp/this.maxHp),bh);
    ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(this.name+':'+Math.ceil(this.hp),sx,sy2-2);
    if(this.stunned){ctx.fillStyle='#ffcc00';ctx.font='bold 14px sans-serif';ctx.fillText('眩晕 '+Math.ceil(this.stunTimer)+'s',sx,sy-40);}ctx.textAlign='start';
  }
}

// ==================== 虚拟摇杆 ====================
class Joystick{
  constructor(){this.baseX=0;this.baseY=0;this.thumbX=0;this.thumbY=0;this.active=false;this.touchId=null;this.dx=0;this.dy=0;this.jumpPressed=false;}
  setBase(x,y){this.baseX=x;this.baseY=y;this.thumbX=x;this.thumbY=y;}
  handleDown(x,y,id){const jd=dist({x:x,y:y},{x:this.baseX,y:this.baseY});if(jd<90){this.active=true;this.touchId=id;this.updateThumb(x,y);}return this.active;}
  handleMove(x,y,id){if(this.active&&this.touchId===id){this.updateThumb(x,y);return true;}return false;}
  handleUp(id){if(this.touchId===id){this.active=false;this.touchId=null;this.thumbX=this.baseX;this.thumbY=this.baseY;this.dx=0;this.dy=0;return true;}return false;}
  updateThumb(x,y){let dx=x-this.baseX,dy=y-this.baseY;const d=Math.sqrt(dx*dx+dy*dy),maxR=65;if(d>maxR){dx=dx/d*maxR;dy=dy/d*maxR;}this.thumbX=this.baseX+dx;this.thumbY=this.baseY+dy;this.dx=dx/maxR;this.dy=dy/maxR;}
  draw(ctx){
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(this.baseX,this.baseY,65,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.arc(this.baseX,this.baseY,45,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.beginPath();ctx.arc(this.thumbX,this.thumbY,24,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.arc(this.thumbX,this.thumbY,24,0,Math.PI*2);ctx.stroke();
  }
}

// ==================== 游戏主类 ====================
class Game{
  constructor(chapterId,subLevelId,playerHp){
    this.canvas=document.getElementById('gameCanvas');this.ctx=this.canvas.getContext('2d');
    this.joystick=new Joystick();this.resize();
    this.chapterId=chapterId||DB.data.chapter;
    this.subLevelIdx=(subLevelId||DB.data.subLevel)-1;
    this.chapterCfg=CFG.CHAPTERS[this.chapterId-1];
    this.sceneCfg=this.chapterCfg.subLevels[this.subLevelIdx];
    this.worldW=this.sceneCfg.width;this.groundY=this.gameH*0.82;this.camX=0;
    this.player=new Player(150,this.groundY-80,DB.data.playerLevel,playerHp);
    this.player.weapon=DB.data.weapon;
    this.enemies=[];this.boss=null;this.particles=[];this.floatingTexts=[];this.drops=[];
    this.state='playing';this.victoryScene=false;this.gameOverCause='';this.sceneClear=false;
    this.paused=false;this.time=0;this.lastTime=0;this.shakeTimer=0;this.shakeIntensity=0;
    this.bg=new Background(this.sceneCfg);
    this.activeTouches={};this.touchButtonMap={};this.transitionTimer=0;this.killedGold=0;this.hasEnemies=false;
    this.joystickTouchId=null;this.keyStates={};this.victoryTimer=0;this.victoryAutoReturn=false;
    this.pauseBtn={x:25,y:25,w:36,h:36};
    this._bound={};this._rafId=null;
    this.initScene();this.setupInput();this.running=true;
    this.lastTime=performance.now();this._rafId=requestAnimationFrame(t=>this.gameLoop(t));
  }
  
  resize(){
    const scrEl=document.getElementById('gameScreen');const scrRect=scrEl?scrEl.getBoundingClientRect():{width:window.innerWidth,height:window.innerHeight};
    const scrW=scrRect.width||window.innerWidth,scrH=scrRect.height||window.innerHeight;
    const ratio=Math.min(scrW/480,scrH/800);this.gameW=480;this.gameH=800;
    this.canvas.width=480;this.canvas.height=800;
    const cw=Math.floor(480*ratio),ch=Math.floor(800*ratio);
    this.canvas.style.width=cw+'px';this.canvas.style.height=ch+'px';
    this.canvas.style.position='absolute';this.canvas.style.left=Math.floor((scrW-cw)/2)+'px';this.canvas.style.top=Math.floor((scrH-ch)/2)+'px';
    this.scale=ratio;this.joystick.setBase(90,this.gameH*0.72);
    this.btnAreas={skill:{x:this.gameW*0.85,y:this.gameH*0.55,r:this.gameW*0.08},jump:{x:this.gameW*0.85,y:this.gameH*0.68,r:this.gameW*0.08},attack:{x:this.gameW*0.85,y:this.gameH*0.82,r:this.gameW*0.11}};
  }
  
  initScene(){
    this.enemies=[];this.boss=null;this.sceneClear=false;this.transitionTimer=0;this.killedGold=0;this.drops=[];
    this.victoryTimer=0;this.victoryAutoReturn=false;
    this.bg=new Background(this.sceneCfg);
    const spawnStart=this.worldW*0.15,spawnEnd=this.worldW*0.55;
    if(this.sceneCfg.boss){
      const extraScale=this.chapterId>=5?1.5:1;
      this.boss=new Boss('sword',spawnStart+rand(100,300),this.groundY-50,this.groundY,{
        hp:Math.floor(CFG.BOSS_CFG.hp*getChapterScale(this.chapterId)*extraScale),
        armor:Math.floor(CFG.BOSS_CFG.armor*getChapterScale(this.chapterId)*extraScale),
        atk:Math.floor(CFG.BOSS_CFG.atk*getChapterScale(this.chapterId)),
        spd:CFG.BOSS_CFG.spd,atkRange:CFG.BOSS_CFG.atkRange,sight:CFG.BOSS_CFG.sight,
        atkCd:CFG.BOSS_CFG.atkCd,stunDuration:CFG.BOSS_CFG.stunDuration,
        gold:80+this.chapterId*20,bossName:this.sceneCfg.bossName||'BOSS',finalBoss:this.sceneCfg.finalBoss||false
      },this.chapterId);
    }
    let idx=0;this.hasEnemies=false;
    for(const group of this.sceneCfg.enemies){
      for(let i=0;i<group.count;i++){
        const ex=spawnStart+rand(i*100,i*100+120)+(spawnEnd-spawnStart)*rand(0,0.8);
        this.enemies.push(new Enemy(group.type,ex,this.groundY-35,this.groundY,idx++,this.chapterId));
        this.hasEnemies=true;
      }
    }
    if(this.sceneCfg.boss)this.hasEnemies=true;
    this.player.x=100;this.player.y=this.groundY-40;this.player.vx=0;this.player.vy=0;this.player.grounded=true;
    this.player.attacking=false;this.player.skilling=false;this.player.state='idle';
    this.player.atkTimer=0;this.player.skillTimer=0;this.player.frameIdx=0;
    this.player.invulnTimer=0;this.player.hitFlash=0;
    this.camX=0;this.player.weapon=DB.data.weapon;
  }
  
  setupInput(){
    this._bound.ts=this.onTouchStart.bind(this);this._bound.tm=this.onTouchMove.bind(this);
    this._bound.te=this.onTouchEnd.bind(this);this._bound.tc=this.onTouchEnd.bind(this);
    this._bound.md=this.onMouseDown.bind(this);this._bound.mm=this.onMouseMove.bind(this);
    this._bound.mu=this.onMouseUp.bind(this);this._bound.kd=this.onKeyDown.bind(this);
    this._bound.ku=this.onKeyUp.bind(this);this._bound.rs=this.resize.bind(this);
    this.canvas.addEventListener('touchstart',this._bound.ts,{passive:false});
    this.canvas.addEventListener('touchmove',this._bound.tm,{passive:false});
    this.canvas.addEventListener('touchend',this._bound.te,{passive:false});
    this.canvas.addEventListener('touchcancel',this._bound.tc,{passive:false});
    this.canvas.addEventListener('mousedown',this._bound.md);
    window.addEventListener('mousemove',this._bound.mm);
    window.addEventListener('mouseup',this._bound.mu);
    window.addEventListener('keydown',this._bound.kd);
    window.addEventListener('keyup',this._bound.ku);
    window.addEventListener('resize',this._bound.rs);
  }
  
  cleanupInput(){
    const b=this._bound;const c=this.canvas;
    if(b.ts)c.removeEventListener('touchstart',b.ts);if(b.tm)c.removeEventListener('touchmove',b.tm);
    if(b.te)c.removeEventListener('touchend',b.te);if(b.tc)c.removeEventListener('touchcancel',b.tc);
    if(b.md)c.removeEventListener('mousedown',b.md);
    if(b.mm)window.removeEventListener('mousemove',b.mm);
    if(b.mu)window.removeEventListener('mouseup',b.mu);
    if(b.kd)window.removeEventListener('keydown',b.kd);
    if(b.ku)window.removeEventListener('keyup',b.ku);
    if(b.rs)window.removeEventListener('resize',b.rs);
  }
  
  screenToGame(cx,cy){const r=this.canvas.getBoundingClientRect();return{x:(cx-r.left)/this.scale,y:(cy-r.top)/this.scale};}
  
  onTouchStart(e){e.preventDefault();for(const t of e.changedTouches){const p=this.screenToGame(t.clientX,t.clientY);this.activeTouches[t.identifier]=p;if(this.state==='gameover'||this.state==='victory'){this.handleClick(p.x,p.y);continue;}if(this.paused){this.handlePauseClick(p.x,p.y);continue;}if(this.checkPauseBtn(p.x,p.y)){this.togglePause();continue;}if(this.joystick.handleDown(p.x,p.y,t.identifier)){this.joystickTouchId=t.identifier;}else{const btn=this.checkButton(p.x,p.y);if(btn){this.touchButtonMap[t.identifier]=btn;this.handleButton(btn);}}}}
  
  onTouchMove(e){e.preventDefault();for(const t of e.changedTouches){const p=this.screenToGame(t.clientX,t.clientY);this.activeTouches[t.identifier]=p;if(!this.joystick.handleMove(p.x,p.y,t.identifier)){const btn=this.checkButton(p.x,p.y);if(btn&&!this.touchButtonMap[t.identifier]){this.touchButtonMap[t.identifier]=btn;this.handleButton(btn);}}}}
  
  onTouchEnd(e){for(const t of e.changedTouches){this.joystick.handleUp(t.identifier);if(this.touchButtonMap[t.identifier])delete this.touchButtonMap[t.identifier];delete this.activeTouches[t.identifier];if(this.joystickTouchId===t.identifier)this.joystickTouchId=null;}}
  
  onMouseDown(e){const p=this.screenToGame(e.clientX,e.clientY);if(this.state==='gameover'||this.state==='victory'){this.handleClick(p.x,p.y);return;}if(this.paused){this.handlePauseClick(p.x,p.y);return;}if(this.checkPauseBtn(p.x,p.y)){this.togglePause();return;}if(this.joystick.handleDown(p.x,p.y,'mouse')){this.joystickTouchId='mouse';return;}const btn=this.checkButton(p.x,p.y);if(btn)this.handleButton(btn);}
  
  onMouseMove(e){if(!e.buttons)return;const p=this.screenToGame(e.clientX,e.clientY);this.joystick.handleMove(p.x,p.y,'mouse');}
  onMouseUp(e){this.joystick.handleUp('mouse');this.joystickTouchId=null;}
  
  onKeyDown(e){if(e.key==='Escape'){this.togglePause();return;}if(this.paused)return;this.keyStates[e.key]=true;switch(e.key){case'ArrowLeft':case'a':this.joystick.dx=-1;break;case'ArrowRight':case'd':this.joystick.dx=1;break;case'ArrowUp':case'w':this.joystick.dy=-1;break;case'ArrowDown':case's':this.joystick.dy=1;break;case'j':case'J':this.handleButton('attack');break;case'k':case'K':this.handleButton('jump');break;case'l':case'L':this.handleButton('skill');break;}}
  
  onKeyUp(e){this.keyStates[e.key]=false;switch(e.key){case'ArrowLeft':case'a':if(!this.keyStates['ArrowRight']&&!this.keyStates['d'])this.joystick.dx=0;break;case'ArrowRight':case'd':if(!this.keyStates['ArrowLeft']&&!this.keyStates['a'])this.joystick.dx=0;break;case'ArrowUp':case'w':if(!this.keyStates['ArrowDown']&&!this.keyStates['s'])this.joystick.dy=0;break;case'ArrowDown':case's':if(!this.keyStates['ArrowUp']&&!this.keyStates['w'])this.joystick.dy=0;break;}}
  
  checkPauseBtn(gx,gy){return gx>=this.pauseBtn.x&&gx<=this.pauseBtn.x+this.pauseBtn.w&&gy>=this.pauseBtn.y&&gy<=this.pauseBtn.y+this.pauseBtn.h;}
  togglePause(){this.paused=!this.paused;}
  handlePauseClick(gx,gy){if(gx>this.gameW*0.25&&gx<this.gameW*0.75){if(gy>this.gameH*0.4&&gy<this.gameH*0.52)this.paused=false;if(gy>this.gameH*0.55&&gy<this.gameH*0.67)this.goToMenu();}}
  checkButton(gx,gy){for(const k in this.btnAreas){const b=this.btnAreas[k];if(dist({x:gx,y:gy},{x:b.x,y:b.y})<b.r)return k;}return null;}
  handleButton(btn){if(this.state!=='playing'||this.paused)return;switch(btn){case'attack':this.playerAttack();break;case'jump':this.joystick.jumpPressed=true;break;case'skill':this.playerSkill();break;}}
  playerAttack(){if(this.state!=='playing')return;const hit=this.player.attack();if(!hit)return;this.checkHit(hit);this.shakeTimer=0.06;this.shakeIntensity=3;}
  playerSkill(){if(this.state!=='playing')return;const hit=this.player.skill();if(!hit)return;this.checkHit(hit);this.shakeTimer=0.15;this.shakeIntensity=6;for(let i=0;i<20;i++)this.particles.push(new Particle(hit.x+hit.w/2,hit.y+hit.h/2,{vx:rand(-4,4),vy:rand(-3,1),color:'#ff6644',life:0.5,size:rand(3,7),gravity:1}));}
  
  checkHit(hit){
    let hitAny=false;
    for(const enemy of this.enemies){if(enemy.dead)continue;if(this.hitOverlap(hit,enemy)){const killed=enemy.takeDamage(hit.damage,hit.knockback);this.spawnHitParticles(enemy.x,enemy.y,hit.color);if(killed){this.onEnemyKilled(enemy);}hitAny=true;}}
    if(this.boss&&!this.boss.dead){if(this.hitOverlap(hit,this.boss)){const killed=this.boss.takeDamage(hit.damage,hit.knockback);this.spawnHitParticles(this.boss.x,this.boss.y,hit.color);if(killed){this.onEnemyKilled(this.boss);}hitAny=true;}}
    if(hitAny&&hit.isSkill){this.shakeTimer=0.15;this.shakeIntensity=8;}
    else if(hitAny){this.shakeTimer=0.06;this.shakeIntensity=3;}
  }
  
  onEnemyKilled(enemy){this.spawnDeathParticles(enemy.x,enemy.y);this.killedGold+=enemy.goldReward;this.floatingTexts.push(new FloatingText(enemy.x,enemy.y-20,'+'+enemy.goldReward+'💰','#ffcc00'));this.tryDropItem(enemy);}
  
  tryDropItem(enemy){
    const isBoss=enemy instanceof Boss;const chance=isBoss?EQUIP.bossDropChance:EQUIP.dropChance;
    if(Math.random()<chance){const categories=['armor','bracelet','shoes'];const cat=categories[randInt(0,2)];const items=EQUIP[cat];let maxIdx=Math.min(1,items.length-1);if(this.chapterId>=3)maxIdx=Math.min(2,items.length-1);if(this.chapterId>=5||isBoss)maxIdx=items.length-1;const itemIdx=randInt(0,maxIdx);const item=items[itemIdx];this.drops.push(new DropItem(enemy.x,enemy.y-30,cat,item.id));this.floatingTexts.push(new FloatingText(enemy.x,enemy.y-40,item.name+' 掉落!','#44ff88'));}
  }
  
  hitOverlap(hit,entity){return hit.x-hit.w/2<entity.x+entity.w/2&&hit.x+hit.w/2>entity.x-entity.w/2&&hit.y-hit.h/2<entity.y+entity.h/2&&hit.y+hit.h/2>entity.y-entity.h/2;}
  spawnHitParticles(x,y,color){for(let i=0;i<10;i++)this.particles.push(new Particle(x,y,{vx:rand(-3,3),vy:rand(-3,1),color:color,life:0.3,size:rand(2,5)}));}
  spawnDeathParticles(x,y){for(let i=0;i<15;i++)this.particles.push(new Particle(x,y,{vx:rand(-4,4),vy:rand(-4,2),color:'#ffaa00',life:0.6,size:rand(2,6),gravity:0.5}));}
  
  checkSceneClear(){if(this.sceneClear)return;const allDead=this.enemies.every(e=>e.dead);const bossDead=!this.boss||this.boss.dead;if(allDead&&bossDead&&this.hasEnemies){this.sceneClear=true;this.onSceneVictory();}}
  
  onSceneVictory(){
    if(this.killedGold>0)DB.addGold(this.killedGold);
    if(this.sceneCfg.boss){this.state='victory';this.victoryScene=true;this.victoryTimer=0;this.victoryAutoReturn=true;if(this.sceneCfg.finalBoss&&this.chapterId+1>DB.data.maxChapter){DB.data.maxChapter=this.chapterId+1;DB.data.maxSubLevel=1;}else if(this.chapterId+1>DB.data.maxChapter){DB.data.maxChapter=this.chapterId+1;DB.data.maxSubLevel=1;}DB.save();return;}
    this.transitionTimer=1.5;
  }
  
  gameLoop(timestamp){
    if(!this.running||this._rafId===null)return;
    try{const dt=Math.min(0.05,(timestamp-this.lastTime)/1000);this.lastTime=timestamp;this.time+=dt;if(this.state==='playing'&&!this.paused)this.update(dt);this.render();}catch(e){console.error('loop',e&&e.message?e.message:e);}
    if(this._rafId!==null)this._rafId=requestAnimationFrame(t=>this.gameLoop(t));
  }
  
  update(dt){
    if(this.state==='victory'&&this.victoryAutoReturn){this.victoryTimer+=dt;if(this.victoryTimer>=3.0){this.goToMenu();return;}}
    if(this.shakeTimer>0)this.shakeTimer=Math.max(0,this.shakeTimer-dt);
    const playerAttacking=this.player.attacking||this.player.skilling;
    this.player.update(dt,this.joystick,this.worldW,this.groundY);
    const targetCamX=this.player.x-this.gameW/2;this.camX=lerp(this.camX,targetCamX,0.12);this.camX=clamp(this.camX,0,this.worldW-this.gameW);
    // 批量更新敌人，仅处理视野内敌人
    const camLeft=this.camX-100,camRight=this.camX+this.gameW+100;
    for(const enemy of this.enemies){
      if(enemy.fullyRemoved)continue;
      // 视野外敌人降低更新频率（隔帧更新）
      if(enemy.x<camLeft||enemy.x>camRight){
        enemy._offscreen=(enemy._offscreen||0)+1;
        if(enemy._offscreen<2)continue;
        enemy._offscreen=0;
      }
      enemy.update(dt,this.player,playerAttacking,this.worldW);
    }
    if(this.boss&&!this.boss.fullyRemoved)this.boss.update(dt,this.player,playerAttacking,this.worldW);
    // 粒子数量限制，避免性能问题
    if(this.particles.length>80){this.particles.splice(0,this.particles.length-80);}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.update(dt);if(p.dead)this.particles.splice(i,1);}
    if(this.floatingTexts.length>30){this.floatingTexts.splice(0,this.floatingTexts.length-30);}
    for(let i=this.floatingTexts.length-1;i>=0;i--){const t=this.floatingTexts[i];t.update(dt);if(t.dead)this.floatingTexts.splice(i,1);}
    if(this.drops.length>15){this.drops.splice(0,this.drops.length-15);}
    for(let i=this.drops.length-1;i>=0;i--){const d=this.drops[i];if(!d.dead)d.update(dt,this.player);else this.drops.splice(i,1);}
    this.checkSceneClear();
    if(this.transitionTimer>0){this.transitionTimer-=dt;if(this.transitionTimer<=0)this.doNextSubLevel();}
    if(this.player.hp<=0){this.state='gameover';this.gameOverCause='被敌人击败';}
    if(!this.player.grounded)this.joystick.jumpPressed=false;
  }
  
  doNextSubLevel(){
    this.subLevelIdx++;
    if(this.subLevelIdx>=this.chapterCfg.subLevels.length){
      this.state='victory';this.victoryScene=true;this.victoryTimer=0;this.victoryAutoReturn=true;
      if(this.chapterId+1>DB.data.maxChapter){DB.data.maxChapter=this.chapterId+1;DB.data.maxSubLevel=1;}
      DB.save();return;
    }
    this.sceneCfg=this.chapterCfg.subLevels[this.subLevelIdx];this.worldW=this.sceneCfg.width;
    DB.data.subLevel=this.subLevelIdx+1;if(this.subLevelIdx+1>DB.data.maxSubLevel&&this.chapterId===DB.data.chapter)DB.data.maxSubLevel=this.subLevelIdx+1;DB.save();
    const currentHp=this.player.hp;
    // 确保场景宽度有效
    if(!this.worldW||this.worldW<500)this.worldW=2000;
    this.initScene();
    this.player.hp=currentHp>0?currentHp:this.player.maxHp;
    this.player.x=100;this.player.y=this.groundY-40;
    this.state='playing';this.sceneClear=false;this.transitionTimer=0;
  }
  
  render(){
    const ctx=this.ctx,w=this.gameW,h=this.gameH;ctx.clearRect(0,0,w,h);
    let sx=0,sy=0;if(this.shakeTimer>0){sx=rand(-this.shakeIntensity,this.shakeIntensity);sy=rand(-this.shakeIntensity,this.shakeIntensity);}
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=this.sceneCfg.sky||this.chapterCfg.sky;ctx.fillRect(0,0,w,h);
    this.bg.draw(ctx,this.camX,w,h,this.groundY,this.sceneCfg.sky||this.chapterCfg.sky);
    ctx.fillStyle=this.sceneCfg.ground||this.chapterCfg.ground;ctx.fillRect(0,this.groundY,w,h-this.groundY);
    ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,this.groundY);ctx.lineTo(w,this.groundY);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='bold 12px sans-serif';ctx.textAlign='right';
    ctx.fillText('第'+this.chapterId+'章 '+this.chapterCfg.name+' - '+this.sceneCfg.name,w-15,25);ctx.textAlign='start';
    // 视野剔除：只绘制屏幕内的敌人
    const cL=this.camX-80,cR=this.camX+w+80;
    for(const enemy of this.enemies){if(!enemy.fullyRemoved&&enemy.x>cL&&enemy.x<cR)enemy.draw(ctx,this.camX);}
    if(this.boss&&!this.boss.fullyRemoved)this.boss.draw(ctx,this.camX);
    for(const d of this.drops)if(!d.dead&&d.x>cL&&d.x<cR)d.draw(ctx,this.camX);
    this.player.draw(ctx,this.camX);
    for(const p of this.particles)if(p.x>cL&&p.x<cR)p.draw(ctx,this.camX);
    for(const t of this.floatingTexts)if(t.x>cL&&t.x<cR)t.draw(ctx,this.camX);
    ctx.restore();
    this.joystick.draw(ctx);this.drawButtons(ctx);this.drawHUD(ctx);this.drawPauseBtn(ctx);
    if(this.sceneClear&&!this.sceneCfg.boss){ctx.fillStyle='rgba(255,204,0,0.8)';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('敌人已清除!',w/2,h/2-60);ctx.textAlign='start';}
    if(this.transitionTimer>0){ctx.fillStyle='rgba(255,204,0,0.8)';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('即将进入下一关...',w/2,h/2-30);ctx.textAlign='start';}
    if(this.paused){ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#ffcc00';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('游戏暂停',w/2,h/2-60);ctx.fillStyle='#fff';ctx.fillRect(w*0.25,h*0.4,w*0.5,60);ctx.fillStyle='#222';ctx.fillText('继续游戏',w/2,h*0.4+38);ctx.fillStyle='#fff';ctx.fillRect(w*0.25,h*0.55,w*0.5,60);ctx.fillStyle='#222';ctx.fillText('返回主界面',w/2,h*0.55+38);ctx.textAlign='start';}
    if(this.state==='gameover'){ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#ff4444';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText('战斗失败',w/2,h/2-50);ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.fillText(this.gameOverCause,w/2,h/2-10);ctx.fillStyle='#fff';ctx.fillRect(w*0.25,h*0.52,w*0.5,56);ctx.fillStyle='#222';ctx.fillText('返回主界面',w/2,h*0.52+36);ctx.textAlign='start';}
    if(this.state==='victory'){ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#ffcc00';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText('恭喜通关!',w/2,h/2-50);ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.fillText('获得金币: +'+this.killedGold,w/2,h/2-10);const remaining=Math.ceil(3.0-this.victoryTimer);ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='14px sans-serif';ctx.fillText(remaining+'秒后自动返回主界面...',w/2,h/2+20);ctx.fillStyle='#fff';ctx.fillRect(w*0.25,h*0.52,w*0.5,56);ctx.fillStyle='#222';ctx.fillText('返回主界面',w/2,h*0.52+36);ctx.textAlign='start';}
  }
  
  drawPauseBtn(ctx){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=2;ctx.fillRect(this.pauseBtn.x,this.pauseBtn.y,this.pauseBtn.w,this.pauseBtn.h);ctx.strokeRect(this.pauseBtn.x,this.pauseBtn.y,this.pauseBtn.w,this.pauseBtn.h);ctx.fillStyle='#fff';ctx.fillRect(this.pauseBtn.x+8,this.pauseBtn.y+8,6,20);ctx.fillRect(this.pauseBtn.x+22,this.pauseBtn.y+8,6,20);}
  
  drawHUD(ctx){
    const px=15,py=15,bw=130,bh=12;
    ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.fillText('忍者战士 Lv.'+this.player.level,px,py+12);
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px,py+22,bw,bh);
    const hpR=this.player.hp/this.player.maxHp;ctx.fillStyle=hpR>0.5?'#44cc44':hpR>0.25?'#ff8833':'#ff3333';ctx.fillRect(px,py+22,bw*hpR,bh);
    ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText(Math.ceil(this.player.hp)+'/'+this.player.maxHp,px+bw/2-15,py+32);
    ctx.fillStyle='rgba(255,204,0,0.8)';ctx.font='bold 13px sans-serif';ctx.textAlign='right';ctx.fillText('💰 +'+this.killedGold,this.gameW-15,this.gameH-160);ctx.textAlign='start';
    ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='bold 12px sans-serif';ctx.textAlign='right';ctx.fillText('武器: '+this.player.getWeaponCfg().name,this.gameW-15,this.gameH-145);ctx.textAlign='start';
  }
  
  drawButtons(ctx){
    const ba=this.btnAreas;
    ctx.fillStyle='rgba(255,80,60,0.3)';ctx.strokeStyle='rgba(255,80,60,0.6)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(ba.attack.x,ba.attack.y,ba.attack.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('攻击',ba.attack.x,ba.attack.y+5);
    ctx.fillStyle='rgba(80,180,255,0.3)';ctx.strokeStyle='rgba(80,180,255,0.6)';ctx.beginPath();ctx.arc(ba.jump.x,ba.jump.y,ba.jump.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillText('跳跃',ba.jump.x,ba.jump.y+5);
    ctx.fillStyle='rgba(255,180,60,0.3)';ctx.strokeStyle='rgba(255,180,60,0.6)';ctx.beginPath();ctx.arc(ba.skill.x,ba.skill.y,ba.skill.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillText('技能',ba.skill.x,ba.skill.y+5);
    if(this.player.skillTimer>0){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.arc(ba.skill.x,ba.skill.y,ba.skill.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.fillText(Math.ceil(this.player.skillTimer)+'s',ba.skill.x,ba.skill.y+5);}
    ctx.textAlign='start';
  }
  
  handleClick(gx,gy){this.goToMenu();}
  
  goToMenu(){
    if(this._rafId!==null){cancelAnimationFrame(this._rafId);this._rafId=null;}
    this.running=false;this.cleanupInput();
    this.particles=[];this.floatingTexts=[];this.drops=[];this.enemies=[];this.boss=null;
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    updateMenuDisplay();
  }
}

// ==================== 菜单 ====================
let _currentEquipSelect=null;
function updateMenuDisplay(){
  document.getElementById('menuGold').textContent=DB.data.gold;
  document.getElementById('menuLevel').textContent=DB.data.playerLevel;
  document.getElementById('menuWeapon').textContent=CFG.WEAPONS[DB.data.weapon]?.name||'剑';
  document.getElementById('menuMaxChapter').textContent=DB.data.maxChapter;
  document.getElementById('menuSubInfo').textContent='小关 '+DB.data.subLevel+'/5';
  updateEquipPanel();
  const sg=document.getElementById('sceneGrid');
  if(sg){sg.innerHTML='';for(let i=0;i<CFG.CHAPTERS.length;i++){const ch=CFG.CHAPTERS[i];const locked=i>=DB.data.maxChapter;const div=document.createElement('div');div.className='scene-btn'+(DB.data.chapter===i+1?' selected':'')+(locked?' locked':'');div.innerHTML='<span class="sc-num">'+(i+1)+'</span><span class="sc-name">'+ch.name+'</span>';if(!locked){div.onclick=()=>{DB.data.chapter=i+1;DB.data.subLevel=1;DB.save();updateMenuDisplay();};}sg.appendChild(div);}}
  updateLevelUpBtn();
}
function updateEquipPanel(){
  const armor=DB.data.equippedArmor?EQUIP.armor.find(x=>x.id===DB.data.equippedArmor):null;
  const bracelet=DB.data.equippedBracelet?EQUIP.bracelet.find(x=>x.id===DB.data.equippedBracelet):null;
  const shoes=DB.data.equippedShoes?EQUIP.shoes.find(x=>x.id===DB.data.equippedShoes):null;
  document.getElementById('slotWeaponVal').textContent=CFG.WEAPONS[DB.data.weapon]?.name||'剑';
  document.getElementById('slotArmorVal').textContent=armor?armor.name:'无';
  document.getElementById('slotBraceletVal').textContent=bracelet?bracelet.name:'无';
  document.getElementById('slotShoesVal').textContent=shoes?shoes.name:'无';
  document.getElementById('equipAtk').textContent=Math.floor(CFG.PLAYER.baseAtk*(1+(DB.data.playerLevel-1)*0.1)*(CFG.WEAPONS[DB.data.weapon]?.atkMul||1));
  document.getElementById('equipDef').textContent=(armor?armor.def:0)+'%';
  document.getElementById('equipRegen').textContent=(bracelet?bracelet.regen:0)+'/s';
  document.getElementById('equipSpd').textContent=(100+(shoes?shoes.spdBonus:0))+'%';
}
function toggleEquipmentPanel(){
  const panel=document.getElementById('equipPanel');const btn=document.querySelector('.panel-toggle-btn');
  panel.classList.toggle('hidden');if(btn)btn.textContent=panel.classList.contains('hidden')?'展开':'收起';
}
function openEquipSelect(category){
  _currentEquipSelect=category;const overlay=document.getElementById('equipSelectOverlay');const title=document.getElementById('equipSelectTitle');const list=document.getElementById('equipSelectList');const catNames={weapon:'武器',armor:'护甲',bracelet:'手镯',shoes:'鞋子'};title.textContent='选择'+catNames[category];list.innerHTML='';
  if(category==='weapon'){const currentWeapon=DB.data.weapon;for(const k in CFG.WEAPONS){const wcfg=CFG.WEAPONS[k];const unlocked=DB.data.unlockedWeapons&&DB.data.unlockedWeapons[k];const div=document.createElement('div');div.className='equip-select-item'+(currentWeapon===k?' equipped':'')+(unlocked?'':' locked');div.style.opacity=unlocked?'1':'0.4';div.innerHTML='<span>'+(unlocked?'':'🔒 ')+wcfg.name+'</span><span class="item-stats">攻击x'+wcfg.atkMul+' 范围'+wcfg.range+'</span>';if(unlocked){div.onclick=()=>{DB.equipItem('weapon',k);DB.save();updateMenuDisplay();closeEquipSelect();};}list.appendChild(div);}overlay.classList.remove('hidden');return;}
  const items=EQUIP[category];const equippedId=DB.getEquipped(category);const unequipDiv=document.createElement('div');unequipDiv.className='equip-select-item';unequipDiv.innerHTML='<span>卸下装备</span>';unequipDiv.onclick=()=>{DB.equipItem(category,null);DB.save();updateMenuDisplay();closeEquipSelect();};list.appendChild(unequipDiv);
  for(const item of items){const owned=DB.hasItem(category,item.id);if(!owned)continue;const div=document.createElement('div');div.className='equip-select-item'+(equippedId===item.id?' equipped':'');div.innerHTML='<span>'+item.name+'</span><span class="item-stats">'+item.desc+'</span>';div.onclick=()=>{DB.equipItem(category,item.id);DB.save();updateMenuDisplay();closeEquipSelect();};list.appendChild(div);}
  overlay.classList.remove('hidden');
}
function closeEquipSelect(){document.getElementById('equipSelectOverlay').classList.add('hidden');_currentEquipSelect=null;}
function updateLevelUpBtn(){
  const lv=DB.data.playerLevel;const btn=document.getElementById('btnLevelUp');if(!btn)return;
  if(lv>=CFG.MAX_LEVEL){btn.textContent='已满级 Lv.'+lv;btn.disabled=true;return;}
  const cost=CFG.LEVEL_COSTS[lv];document.getElementById('btnLevelLv').textContent=lv;document.getElementById('btnLevelNext').textContent=lv+1;document.getElementById('btnLevelCost').textContent=cost;btn.disabled=DB.data.gold<cost;btn.style.opacity=DB.data.gold<cost?'0.4':'1';
}
function buyLevel(){
  const lv=DB.data.playerLevel;if(lv>=CFG.MAX_LEVEL)return;
  const cost=CFG.LEVEL_COSTS[lv];if(!DB.spendGold(cost)){alert('金币不足!');return;}
  DB.data.playerLevel=lv+1;DB.save();updateMenuDisplay();
}
window.buyLevel=buyLevel;window.toggleEquipmentPanel=toggleEquipmentPanel;
window.openEquipSelect=openEquipSelect;window.closeEquipSelect=closeEquipSelect;

// ==================== 启动 ====================
let _game=null;
function startGame(){
  const lo=document.getElementById('loadOverlay');if(lo)lo.style.display='none';
  try{
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    if(_game){
      if(_game._rafId!==null){cancelAnimationFrame(_game._rafId);_game._rafId=null;}
      _game.running=false;_game.cleanupInput();
    }
    _game=new Game(DB.data.chapter,DB.data.subLevel);
  }catch(e){console.error('startGame error:',e&&e.message?e.message:e);}
}
window.startGame=startGame;
document.addEventListener('DOMContentLoaded',()=>{
  DB.init();
  const el=document.getElementById('loadOverlay');
  document.getElementById('loadText').textContent='加载角色素材...';
  document.getElementById('loadBar').style.width='30%';
  Sprite.load().then(()=>{
    document.getElementById('loadBar').style.width='100%';
    updateMenuDisplay();
    if(el){el.classList.add('load-done');el.style.display='none';}
  });
});
})();