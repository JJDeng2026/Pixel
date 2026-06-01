// 游戏全局数据
let GameState = {
  resources: { data: 50, core: 2 },
  player: {
    name: '卡维',
    maxHp: 100, hp: 100,
    atk: 15,
    attackCooldown: 0.6,
    attackRange: 150,
    moveSpeed: 3.5,
    maxMana: 50, mana: 50,
    manaRegen: 5,
    element: 'fire'
  },
  battle: {
    active: false, paused: false,
    enemies: [], bullets: [], damageNumbers: [], skillAnimations: [],
    playerDamageNumbers: [],
    playerWorldX: 0, playerWorldY: 0, isMoving: false,
    killCount: 0, killTarget: 30,
    lastTime: 0,
    canvasWidth: 0, canvasHeight: 0,
    worldWidth: 3200, worldHeight: 6800,
    invincibleTimer: 0,
    tempAtk: 0, tempSkillDmg: 0, tempBulletCount: 1, tempBulletDmg: 0, tempMoveSpeed: 0,
    nextUpgradeKills: 5, maxEnemies: 8,   // 初始最大敌人数改为8
    _attackTimer: 0, skillCooldownTimer: 0,
    facingRight: true
  },
  upgradeCosts: { hp: 20, atk: 20, speed: 25, cooldown: 30, mana: 25 }
};

let currentHeroKey = '卡维';
let battleRunning = false;
let animFrameId = null;