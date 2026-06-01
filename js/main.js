function startBattle() {
  document.getElementById('bgLayer').style.background = 'linear-gradient(180deg, #2a1a2e 0%, #3a1e2e 100%)';
  showScreen('battle');
  resizeCanvas();
  const b = GameState.battle;
  b.worldWidth = 3200; b.worldHeight = 6800;
  b.playerWorldX = b.worldWidth/2; b.playerWorldY = b.worldHeight/2;
  b.enemies = []; b.bullets = []; b.damageNumbers = []; b.skillAnimations = [];
  b.playerDamageNumbers = [];
  b.killCount = 0; b.killTarget = 30;
  b.invincibleTimer = 0; b._attackTimer = 0; b.isMoving = false; b.paused = false;
  b.tempAtk = 0; b.tempSkillDmg = 0; b.tempBulletCount = 1; b.tempBulletDmg = 0; b.tempMoveSpeed = 0;
  b.nextUpgradeKills = 5; b.maxEnemies = 8; b.skillCooldownTimer = 0;
  applyHeroStats(currentHeroKey);
  b.active = true; battleRunning = true;
  b.lastTime = performance.now();
  playerGif.style.display = 'block';
  playerGif.src = heroGifs[currentHeroKey].idle.src;
  b.facingRight = true;
  playerGif.style.transform = 'scaleX(1)';
  resetJoystick();
  initJoystickCanvas();
  updateBattleUI();
  document.getElementById('upgradePanel').style.display = 'none';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  bindJoystickEvents();

  // 开局生成6个敌人（都在玩家附近）
  const originalMax = b.maxEnemies;
  b.maxEnemies = 100;
  for (let i = 0; i < 6; i++) spawnEnemy();
  b.maxEnemies = originalMax;

  // 绑定暂停按钮事件
  bindPauseButton();

  gameLoop(performance.now());
}

function init() {
  preloadAssets();
  initJoystickCanvas();
  renderBase();
  showScreen('base');
  document.getElementById('enterTowerBtn').addEventListener('click', startBattle);
  window.addEventListener('resize', () => { if (battleRunning) resizeCanvas(); });
  document.getElementById('skill1Btn').addEventListener('click', castSkill);
}

window.addEventListener('DOMContentLoaded', init);