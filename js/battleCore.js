const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerGif = document.getElementById('playerGif');

function resizeCanvas() {
  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  canvas.width = rect.width; canvas.height = rect.height;
  GameState.battle.canvasWidth = rect.width; GameState.battle.canvasHeight = rect.height;
}

// 敌人生成（以玩家为中心 200~500 半径）
function spawnEnemy() {
  const b = GameState.battle;
  if (b.enemies.length >= b.maxEnemies) return;
  const isElite = b.killCount >= 7 && Math.random() < 0.3 + (b.killCount-7)*0.05;
  const img = new Image();
  img.src = isElite ? ASSETS.enemyEliteGif : ASSETS.enemyGif;
  
  // 以玩家为中心，半径 300~500 随机生成（调整了范围）
  const radius = 300 + Math.random() * 500;
  const angle = Math.random() * Math.PI * 2;
  let x = b.playerWorldX + Math.cos(angle) * radius;
  let y = b.playerWorldY + Math.sin(angle) * radius;
  
  const margin = 30;
  x = Math.min(Math.max(x, margin), b.worldWidth - margin);
  y = Math.min(Math.max(y, margin), b.worldHeight - margin);
  
  b.enemies.push({
    x, y,
    hp: isElite ? 80 : 40, maxHp: isElite ? 80 : 40,
    atk: isElite ? 14 : 8, speed: isElite ? 1.0 : 1.5,
    size: isElite ? 38 : 28, color: isElite ? '#c05050' : '#a05050', isElite,
    img: img,
    facingLeft: false
  });
}

function shootBullets(targetEnemy) {
  const b = GameState.battle, p = GameState.player;
  const px = b.playerWorldX, py = b.playerWorldY;
  const dx = targetEnemy.x - px, dy = targetEnemy.y - py;
  const baseAngle = Math.atan2(dy, dx);
  const count = b.tempBulletCount, spread = 0.2;
  const bulletDamage = p.atk + b.tempAtk + b.tempBulletDmg;
  const bulletColor = ELEMENTS[p.element].bulletColor;
  for (let i=0; i<count; i++) {
    let angle = baseAngle + (i - (count-1)/2) * spread;
    b.bullets.push({
      x: px, y: py,
      vx: Math.cos(angle)*8, vy: Math.sin(angle)*8,
      damage: bulletDamage, life: 1.5, size: 6, color: bulletColor
    });
  }
}

function isEnemyOnScreen(enemy, offsetX, offsetY, cw, ch) {
  const sx = enemy.x - offsetX, sy = enemy.y - offsetY;
  const margin = enemy.size / 2 + 20;
  return (sx + margin > 0 && sx - margin < cw && sy + margin > 0 && sy - margin < ch);
}

function castSkill() {
  const b = GameState.battle, p = GameState.player;
  const el = ELEMENTS[p.element];
  if (b.skillCooldownTimer > 0 || p.mana < el.skillCost) return;
  if (b.enemies.length === 0) return;

  const offsetX = b.playerWorldX - b.canvasWidth/2;
  const offsetY = b.playerWorldY - b.canvasHeight/2;
  const visibleEnemies = b.enemies.filter(enemy =>
    isEnemyOnScreen(enemy, offsetX, offsetY, b.canvasWidth, b.canvasHeight)
  );
  if (visibleEnemies.length === 0) {
    showPixelMessage('提示', '没有可见的敌人，请靠近敌人再施放技能！');
    return;
  }

  p.mana -= el.skillCost;
  b.skillCooldownTimer = el.skillCooldown;

  const randomIndex = Math.floor(Math.random() * visibleEnemies.length);
  const targetEnemy = visibleEnemies[randomIndex];
  const skillDamage = el.skillDamage + b.tempSkillDmg;
  const aoeRadius = el.skillAoe;

  const skillImg = skillEffectImgs[p.element];
  b.skillAnimations.push({
    x: targetEnemy.x, y: targetEnemy.y,
    img: skillImg, life: 0.6, size: 48
  });

  for (let i = b.enemies.length-1; i >= 0; i--) {
    const enemy = b.enemies[i];
    const distToTarget = Math.hypot(enemy.x - targetEnemy.x, enemy.y - targetEnemy.y);
    if (distToTarget < aoeRadius) {
      enemy.hp -= skillDamage;
      b.damageNumbers.push({ x: enemy.x, y: enemy.y-20, value: skillDamage, alpha:1, life:0.8 });
      if (enemy.hp <= 0) {
        b.enemies.splice(i,1);
        b.killCount++;
        updateMaxEnemies();
        if (b.killCount >= b.killTarget) endBattle(true);
      }
    }
  }
  updateBattleUI();
  checkUpgrade();
}

function updateMaxEnemies() {
  // 动态最大敌人数：基数6，每击杀3个+1，上限15
  GameState.battle.maxEnemies = Math.min(15, 6 + Math.floor(GameState.battle.killCount / 3));
}

function renderCanvas() {
  const b = GameState.battle, cw = b.canvasWidth, ch = b.canvasHeight;
  ctx.clearRect(0,0,cw,ch);
  ctx.imageSmoothingEnabled = false;
  const offsetX = b.playerWorldX - cw/2, offsetY = b.playerWorldY - ch/2;

  if (backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    const bgW = backgroundImage.naturalWidth, bgH = backgroundImage.naturalHeight;
    const startCol = Math.floor(-offsetX / bgW) - 1;
    const startRow = Math.floor(-offsetY / bgH) - 1;
    const endCol = startCol + Math.ceil(cw / bgW) + 2;
    const endRow = startRow + Math.ceil(ch / bgH) + 2;
    for (let i = startCol; i <= endCol; i++) {
      for (let j = startRow; j <= endRow; j++) {
        ctx.drawImage(backgroundImage, -offsetX + i*bgW, -offsetY + j*bgH, bgW, bgH);
      }
    }
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0,0,cw,ch);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth=0.5;
  const grid=60, startX=-offsetX%grid, startY=-offsetY%grid;
  for (let x=startX; x<cw; x+=grid) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke(); }
  for (let y=startY; y<ch; y+=grid) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke(); }

  for (let enemy of b.enemies) {
    const sx = enemy.x - offsetX, sy = enemy.y - offsetY;
    if (sx + enemy.size/2 < 0 || sx - enemy.size/2 > cw || sy + enemy.size/2 < 0 || sy - enemy.size/2 > ch) continue;
    if (enemy.img && enemy.img.complete && enemy.img.naturalWidth > 0) {
      ctx.save();
      if (enemy.facingLeft) {
        ctx.translate(sx, sy);
        ctx.scale(-1, 1);
        ctx.drawImage(enemy.img, -enemy.size/2, -enemy.size/2, enemy.size, enemy.size);
      } else {
        ctx.drawImage(enemy.img, sx - enemy.size/2, sy - enemy.size/2, enemy.size, enemy.size);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(sx - enemy.size/2, sy - enemy.size/2, enemy.size, enemy.size);
    }
    const hpW = enemy.size;
    ctx.fillStyle = '#333';
    ctx.fillRect(sx - hpW/2, sy - enemy.size/2 - 10, hpW, 6);
    ctx.fillStyle = '#c04040';
    ctx.fillRect(sx - hpW/2, sy - enemy.size/2 - 10, hpW * (enemy.hp / enemy.maxHp), 6);
    if (enemy.isElite) {
      ctx.fillStyle = '#ff8888';
      ctx.font = '10px monospace';
      ctx.fillText('精英', sx - 10, sy - enemy.size/2 - 14);
    }
  }

  for (let anim of b.skillAnimations) {
    const sx = anim.x - offsetX, sy = anim.y - offsetY;
    if (anim.img && anim.img.complete && anim.img.naturalWidth > 0) {
      const animSize = anim.size || 48;
      ctx.drawImage(anim.img, sx - animSize/2, sy - animSize/2, animSize, animSize);
    }
  }

  for (let bullet of b.bullets) {
    const sx = bullet.x - offsetX, sy = bullet.y - offsetY;
    ctx.fillStyle = bullet.color; ctx.fillRect(sx - bullet.size/2, sy - bullet.size/2, bullet.size, bullet.size);
  }

  ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
  for (let dn of b.damageNumbers) {
    const sx = dn.x - offsetX, sy = dn.y - offsetY;
    ctx.fillStyle = `rgba(255,200,50,${dn.alpha})`;
    ctx.fillText(`-${dn.value}`, sx, sy);
  }
  for (let pdn of b.playerDamageNumbers) {
    const sx = pdn.x - offsetX, sy = pdn.y - offsetY;
    ctx.fillStyle = `rgba(255,80,80,${pdn.alpha})`;
    ctx.fillText(`-${pdn.value}`, sx, sy);
  }

  ctx.beginPath();
  ctx.arc(cw/2, ch/2, GameState.player.attackRange, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
}

function gameLoop(timestamp) {
  if (!battleRunning) return;
  const b = GameState.battle;
  if (b.paused) { animFrameId = requestAnimationFrame(gameLoop); return; }
  const dt = Math.min(0.1, (timestamp - b.lastTime)/1000);
  b.lastTime = timestamp;

  if (joystick.active && joystick.distance > 0.05) {
    const speed = (GameState.player.moveSpeed + b.tempMoveSpeed) * joystick.distance * 60 * dt;
    b.playerWorldX += joystick.dx * speed;
    b.playerWorldY += joystick.dy * speed;
    b.isMoving = true;
  } else { b.isMoving = false; }
  b.playerWorldX = Math.max(20, Math.min(b.playerWorldX, b.worldWidth-20));
  b.playerWorldY = Math.max(20, Math.min(b.playerWorldY, b.worldHeight-20));

  if (joystick.active && Math.abs(joystick.dx) > 0.1) b.facingRight = joystick.dx > 0;
  playerGif.style.transform = `scaleX(${b.facingRight ? 1 : -1})`;

  if (b.isMoving) {
    if (playerGif.src !== heroGifs[currentHeroKey].run.src) playerGif.src = heroGifs[currentHeroKey].run.src;
  } else {
    if (playerGif.src !== heroGifs[currentHeroKey].idle.src) playerGif.src = heroGifs[currentHeroKey].idle.src;
  }

  GameState.player.mana = Math.min(GameState.player.maxMana, GameState.player.mana + GameState.player.manaRegen*dt);
  if (b.skillCooldownTimer > 0) b.skillCooldownTimer -= dt;

  for (let enemy of b.enemies) {
    const dx = b.playerWorldX - enemy.x, dy = b.playerWorldY - enemy.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist > 5) {
      enemy.x += (dx/dist)*enemy.speed*60*dt;
      enemy.y += (dy/dist)*enemy.speed*60*dt;
    }
    enemy.facingLeft = (enemy.x > b.playerWorldX);
  }

  b._attackTimer -= dt;
  if (b._attackTimer <= 0 && b.enemies.length > 0) {
    let closest = null, closestDist = Infinity;
    for (let enemy of b.enemies) {
      const d = Math.hypot(b.playerWorldX-enemy.x, b.playerWorldY-enemy.y);
      if (d < GameState.player.attackRange && d < closestDist) { closestDist = d; closest = enemy; }
    }
    if (closest) { shootBullets(closest); b._attackTimer = GameState.player.attackCooldown; }
    else b._attackTimer = 0;
  }

  for (let bullet of b.bullets) { bullet.x += bullet.vx*60*dt; bullet.y += bullet.vy*60*dt; bullet.life -= dt; }
  for (let i = b.bullets.length-1; i>=0; i--) {
    const bullet = b.bullets[i]; let hit = false;
    for (let j = b.enemies.length-1; j>=0; j--) {
      const enemy = b.enemies[j];
      if (Math.hypot(bullet.x-enemy.x, bullet.y-enemy.y) < enemy.size/2 + bullet.size) {
        enemy.hp -= bullet.damage;
        b.damageNumbers.push({ x: enemy.x, y: enemy.y-20, value: bullet.damage, alpha:1, life:0.8 });
        hit = true;
        if (enemy.hp <= 0) {
          b.enemies.splice(j,1);
          b.killCount++;
          updateMaxEnemies();
          if (b.killCount >= b.killTarget) { endBattle(true); return; }
        }
        break;
      }
    }
    if (hit || bullet.life <= 0 || bullet.x<0 || bullet.x>b.worldWidth || bullet.y<0 || bullet.y>b.worldHeight) b.bullets.splice(i,1);
  }

  if (b.invincibleTimer > 0) b.invincibleTimer -= dt;
  if (b.invincibleTimer <= 0) {
    let totalDamage = 0;
    for (let enemy of b.enemies) {
      if (Math.hypot(b.playerWorldX - enemy.x, b.playerWorldY - enemy.y) < enemy.size/2 + 18) {
        totalDamage += enemy.atk;
      }
    }
    if (totalDamage > 0) {
      GameState.player.hp -= totalDamage;
      b.invincibleTimer = 0.5;
      b.playerDamageNumbers.push({ x: b.playerWorldX, y: b.playerWorldY - 20, value: totalDamage, alpha: 1, life: 0.8 });
      if (GameState.player.hp <= 0) {
        GameState.player.hp = 0;
        updateBattleUI();
        endBattle(false);
        return;
      }
    }
  }

  for (let anim of b.skillAnimations) anim.life -= dt;
  b.skillAnimations = b.skillAnimations.filter(anim => anim.life > 0);
  for (let dn of b.damageNumbers) { dn.y -= 20*dt; dn.life -= dt; dn.alpha = Math.max(0, dn.life/0.8); }
  b.damageNumbers = b.damageNumbers.filter(dn => dn.life>0);
  for (let pdn of b.playerDamageNumbers) { pdn.y -= 20*dt; pdn.life -= dt; pdn.alpha = Math.max(0, pdn.life/0.8); }
  b.playerDamageNumbers = b.playerDamageNumbers.filter(pdn => pdn.life>0);

  // 敌人生成：概率 0.07，每次生成 1~2 个（平衡游戏难度）
  if (b.enemies.length < b.maxEnemies && Math.random() < 0.07) {
    let spawnCount = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < spawnCount && b.enemies.length < b.maxEnemies; i++) {
      spawnEnemy();
    }
  }
  checkUpgrade();

  const playerScreenX = b.canvasWidth / 2 - ASSETS.playerWidth / 2;
  const playerScreenY = b.canvasHeight / 2 - ASSETS.playerHeight / 2;
  playerGif.style.left = playerScreenX + 'px';
  playerGif.style.top = playerScreenY + 'px';
  playerGif.style.opacity = (b.invincibleTimer > 0 && Math.floor(b.invincibleTimer * 10) % 2 === 0) ? '0.5' : '1';

  renderCanvas();
  updateBattleUI();
  animFrameId = requestAnimationFrame(gameLoop);
}