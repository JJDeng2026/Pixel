const modal = document.getElementById('pixelModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

function showPixelMessage(title, message, onClose) {
  modalTitle.textContent = title || '提示';
  modalMessage.textContent = message || '';
  modal.classList.add('active');
  const closeHandler = () => {
    modal.classList.remove('active');
    modalConfirmBtn.removeEventListener('click', closeHandler);
    if (onClose) onClose();
  };
  modalConfirmBtn.addEventListener('click', closeHandler);
}

function applyHeroStats(heroKey) {
  const hero = ASSETS.heroes[heroKey];
  if (!hero) return;
  GameState.player.name = hero.name;
  GameState.player.maxHp = hero.maxHp;
  GameState.player.atk = hero.atk;
  GameState.player.attackCooldown = hero.attackCooldown;
  GameState.player.moveSpeed = hero.moveSpeed;
  GameState.player.maxMana = hero.maxMana;
  GameState.player.manaRegen = hero.manaRegen;
  if (GameState.battle.active) {
    GameState.player.hp = hero.maxHp;
    GameState.player.mana = hero.maxMana;
    updateBattleUI();
  } else {
    GameState.player.hp = hero.maxHp;
    GameState.player.mana = hero.maxMana;
  }
  playerGif.style.width = ASSETS.playerWidth + 'px';
  playerGif.style.height = ASSETS.playerHeight + 'px';
  if (battleRunning && playerGif) {
    if (GameState.battle.isMoving) playerGif.src = heroGifs[heroKey].run.src;
    else playerGif.src = heroGifs[heroKey].idle.src;
  }
  renderBase();
}

function switchHero(heroKey) {
  if (heroKey === currentHeroKey) return;
  currentHeroKey = heroKey;
  applyHeroStats(heroKey);
  renderHeroPanel();
}

function renderHeroPanel() {
  const heroListDiv = document.getElementById('heroList');
  heroListDiv.innerHTML = '';
  for (let key in ASSETS.heroes) {
    const hero = ASSETS.heroes[key];
    const isActive = (key === currentHeroKey);
    const card = document.createElement('div');
    card.className = 'hero-card' + (isActive ? ' active' : '');
    if (hero.avatar && (hero.avatar.endsWith('.png') || hero.avatar.endsWith('.jpg') || hero.avatar.endsWith('.gif'))) {
      card.innerHTML = `<div class="hero-avatar"><img src="${hero.avatar}" alt="${hero.name}"></div><div class="hero-name">${hero.name}</div>`;
    } else {
      card.innerHTML = `<div class="hero-avatar">${hero.avatar || '⭐'}</div><div class="hero-name">${hero.name}</div>`;
    }
    card.onclick = () => switchHero(key);
    heroListDiv.appendChild(card);
  }
}

function renderBase() {
  const bgLayer = document.getElementById('bgLayer');
  bgLayer.style.backgroundImage = "url('assets/base_bg.png')";
  bgLayer.style.backgroundSize = "cover";
  bgLayer.style.backgroundPosition = "center";
  document.getElementById('resData').textContent = GameState.resources.data;
  document.getElementById('resCore').textContent = GameState.resources.core;

  const upgradeGrid = document.getElementById('upgradeGrid');
  const leftCol = document.createElement('div'); leftCol.className = 'upgrade-col';
  const rightCol = document.createElement('div'); rightCol.className = 'upgrade-col';
  const buttons = [
    { id: 'upHp', text: `❤️+10 (${GameState.upgradeCosts.hp}🔷)`, type: 'hp', apply: () => { GameState.player.maxHp += 10; GameState.player.hp = GameState.player.maxHp; } },
    { id: 'upAtk', text: `⚔️+3 (${GameState.upgradeCosts.atk}🔷)`, type: 'atk', apply: () => GameState.player.atk += 3 },
    { id: 'upSpd', text: `🏃+0.2 (${GameState.upgradeCosts.speed}🔷)`, type: 'speed', apply: () => GameState.player.moveSpeed += 0.2 },
    { id: 'upCd', text: `🔄-0.05s (${GameState.upgradeCosts.cooldown}🔷)`, type: 'cooldown', apply: () => GameState.player.attackCooldown = Math.max(0.2, GameState.player.attackCooldown - 0.05) },
    { id: 'upMana', text: `💙+10 (${GameState.upgradeCosts.mana}🔷)`, type: 'mana', apply: () => { GameState.player.maxMana += 10; GameState.player.mana = GameState.player.maxMana; } }
  ];
  buttons.forEach((btn, idx) => {
    const btnElem = document.createElement('button');
    btnElem.className = 'upgrade-btn';
    btnElem.id = btn.id;
    btnElem.textContent = btn.text;
    btnElem.onclick = () => upgrade(btn.type, btn.apply);
    if (idx % 2 === 0) leftCol.appendChild(btnElem);
    else rightCol.appendChild(btnElem);
  });
  upgradeGrid.innerHTML = '';
  upgradeGrid.appendChild(leftCol);
  upgradeGrid.appendChild(rightCol);

  renderHeroPanel();
}

function upgrade(type, apply) {
  if (GameState.resources.data >= GameState.upgradeCosts[type]) {
    GameState.resources.data -= GameState.upgradeCosts[type];
    apply();
    renderBase();
  } else {
    showPixelMessage('资源不足', '蓝钻不足，无法升级！');
  }
}

function updateBattleUI() {
  const p = GameState.player, b = GameState.battle;
  document.getElementById('hpText').textContent = Math.max(0, Math.floor(p.hp));
  document.getElementById('maxHpText').textContent = p.maxHp;
  document.getElementById('hpFill').style.width = (p.hp/p.maxHp*100)+'%';
  document.getElementById('manaText').textContent = Math.floor(p.mana);
  document.getElementById('maxManaText').textContent = p.maxMana;
  document.getElementById('manaFill').style.width = (p.mana/p.maxMana*100)+'%';
  document.getElementById('killCount').textContent = b.killCount;
  document.getElementById('killTarget').textContent = b.killTarget;
  document.getElementById('bulletCount').textContent = b.tempBulletCount;
  document.getElementById('tempAtk').textContent = b.tempBulletDmg;
  document.getElementById('elementDisplay').textContent = ELEMENTS[p.element].name;
  const el = ELEMENTS[p.element];
  const btn = document.getElementById('skill1Btn');
  btn.textContent = `${el.skillName} (${el.skillCost})`;
  if (b.skillCooldownTimer > 0 || p.mana < el.skillCost) btn.classList.add('cooldown');
  else btn.classList.remove('cooldown');
}

function checkUpgrade() {
  const b = GameState.battle;
  if (b.killCount >= b.nextUpgradeKills) { b.paused = true; showUpgradePanel(); }
}

function showUpgradePanel() {
  const panel = document.getElementById('upgradePanel');
  const cardsDiv = document.getElementById('upgradeCards');
  const options = [
    { img: '⚔️', label: '攻击+5', apply: ()=> GameState.battle.tempAtk+=5 },
    { img: '✨', label: '技能伤害+10', apply: ()=> GameState.battle.tempSkillDmg+=10 },
    { img: '🔫', label: '子弹+1', apply: ()=> GameState.battle.tempBulletCount = Math.min(5, GameState.battle.tempBulletCount+1) },
    { img: '💥', label: '子弹伤害+5', apply: ()=> GameState.battle.tempBulletDmg+=5 },
    { img: '🏃', label: '移速+0.2', apply: ()=> GameState.battle.tempMoveSpeed+=0.2 },
    { img: '❄️', label: '转冰霜', apply: ()=> GameState.player.element = 'ice' },
    { img: '⚡', label: '转雷电', apply: ()=> GameState.player.element = 'lightning' },
    { img: '🔥', label: '转火焰', apply: ()=> GameState.player.element = 'fire' }
  ];
  const shuffled = [...options].sort(()=>Math.random()-0.5);
  const selected = shuffled.slice(0, 3);
  cardsDiv.innerHTML = selected.map((opt, i) => `<div class="upgrade-card" data-index="${i}"><div class="card-img" style="background:#4a3a6a;">${opt.img}</div><div class="card-label">${opt.label}</div></div>`).join('');
  document.querySelectorAll('.upgrade-card').forEach(card => {
    card.onclick = (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      selected[idx].apply();
      GameState.battle.nextUpgradeKills += 5;
      GameState.battle.paused = false;
      panel.style.display = 'none';
      updateBattleUI();
    };
  });
  panel.style.display = 'flex';
}

function showScreen(name) {
  const screens = {
    base: document.getElementById('baseScreen'),
    battle: document.getElementById('battleScreen'),
    result: document.getElementById('resultScreen'),
  };
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

function showResultScreen(victory, kills, data, core) {
  showScreen('result');
  document.getElementById('resultPanel').innerHTML = `
    <h2>${victory ? '🎉 塔层净化成功' : '💔 净化失败'}</h2>
    <p>击败异常体: ${kills}</p><p>获得 🔷${data} ⭐${core}</p>
    <button class="result-btn" id="backToBaseBtn">返回基地</button>
  `;
  document.getElementById('backToBaseBtn').onclick = ()=>{ showScreen('base'); renderBase(); };
}

function endBattle(victory) {
  // 移除暂停菜单（如果有）
  const overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.remove();
  battleRunning = false;
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  unbindJoystickEvents();
  resetJoystick();
  playerGif.style.display = 'none';
  const kills = GameState.battle.killCount;
  let dataReward = kills * 2, coreReward = 0;
  if (victory) { dataReward += 20; coreReward = 1; }
  GameState.resources.data += dataReward;
  GameState.resources.core += coreReward;
  showResultScreen(victory, kills, dataReward, coreReward);
}

// 显示暂停菜单（像素风弹窗）
function showPauseMenu() {
  const b = GameState.battle;
  if (!b.active) return;
  b.paused = true;  // 暂停游戏循环
  
  // 创建遮罩和菜单（如果已存在则先移除）
  let overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.remove();
  
  overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.style.cssText = `
    position: absolute; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.8); z-index: 50;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  `;
  
  const menu = document.createElement('div');
  menu.style.cssText = `
    background: #2a1e3a; border: 4px solid #f0c060; border-radius: 24px;
    padding: 20px; width: 220px; text-align: center;
    box-shadow: 0 8px 0 #3d2b5a;
  `;
  menu.innerHTML = `
    <div style="font-size:1.5rem; color:#f0c060; margin-bottom:16px;">⏸ 暂停</div>
    <button id="resumeBtn" class="modal-btn" style="width:100%; margin-bottom:12px;">▶ 继续游戏</button>
    <button id="backToBaseBtn" class="modal-btn" style="width:100%; background:#5e4a7a;">🏠 回到基地</button>
  `;
  overlay.appendChild(menu);
  document.getElementById('battleScreen').appendChild(overlay);
  
  document.getElementById('resumeBtn').onclick = () => {
    b.paused = false;
    overlay.remove();
  };
  document.getElementById('backToBaseBtn').onclick = () => {
    // 回到基地：结束当前战斗（视为放弃，不获得奖励）
    if (animFrameId) cancelAnimationFrame(animFrameId);
    battleRunning = false;
    unbindJoystickEvents();
    resetJoystick();
    playerGif.style.display = 'none';
    showScreen('base');
    renderBase();
    overlay.remove();
    GameState.battle.active = false;
    GameState.battle.paused = false;
  };
}

// 绑定暂停按钮事件
function bindPauseButton() {
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      if (battleRunning && GameState.battle.active && !GameState.battle.paused) {
        showPauseMenu();
      }
    };
  }
}