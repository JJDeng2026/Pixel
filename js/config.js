// ==================== 素材路径配置区 ====================
const ASSETS = {
  playerWidth: 60,
  playerHeight: 60,
  heroes: {
    '卡维': {
      name: '卡维',
      maxHp: 100, atk: 15, attackCooldown: 0.6, moveSpeed: 3.5,
      maxMana: 50, manaRegen: 5,
      idleGif: 'assets/zhan.gif', runGif: 'assets/pao.gif',
      avatar: 'assets/hero/kawei.png'   // 替换为自己的图片路径
    },
    '优稀': {
      name: '优稀',
      maxHp: 90, atk: 18, attackCooldown: 0.65, moveSpeed: 3.2,
      maxMana: 60, manaRegen: 6,
      idleGif: 'assets/youxizhan.gif', runGif: 'assets/youxipao.gif',
      avatar: 'assets/hero/youxi.png'
    },
    '艾莉': {
      name: '艾莉',
      maxHp: 110, atk: 20, attackCooldown: 0.55, moveSpeed: 4.0,
      maxMana: 45, manaRegen: 4,
      idleGif: 'assets/ailizhan.gif', runGif: 'assets/ailipao.gif',
      avatar: 'assets/hero/aili.png'
    }
  },
  enemyGif: 'assets/enemy.gif',
  enemyEliteGif: 'assets/enemy_elite.gif',
  backgroundImg: 'assets/map_bg.jpg'
};

// ==================== 元素技能配置 ====================
const ELEMENTS = {
  fire: {
    name: '火', color: '#f0a060', bulletColor: '#f0c040',
    skillName: '火球术', skillCost: 20, skillCooldown: 3,
    skillDamage: 35, skillAoe: 50,
    skillEffectGif: 'assets/fire_explosion.gif'
  },
  ice: {
    name: '冰', color: '#60c0f0', bulletColor: '#60d0ff',
    skillName: '冰霜术', skillCost: 25, skillCooldown: 4,
    skillDamage: 28, skillAoe: 70,
    skillEffectGif: 'assets/bingzhu.gif'
  },
  lightning: {
    name: '雷', color: '#d0c0ff', bulletColor: '#c090ff',
    skillName: '雷电术', skillCost: 22, skillCooldown: 3.5,
    skillDamage: 32, skillAoe: 80,
    skillEffectGif: 'assets/leidian.gif'
  }
};

// 全局预加载变量
let backgroundImage = null;
const heroGifs = {};
const skillEffectImgs = {};

function preloadAssets() {
  backgroundImage = new Image();
  if (ASSETS.backgroundImg) backgroundImage.src = ASSETS.backgroundImg;

  for (let key in ASSETS.heroes) {
    heroGifs[key] = {
      idle: new Image(),
      run: new Image()
    };
    heroGifs[key].idle.src = ASSETS.heroes[key].idleGif;
    heroGifs[key].run.src = ASSETS.heroes[key].runGif;
  }

  for (let elem in ELEMENTS) {
    const img = new Image();
    img.src = ELEMENTS[elem].skillEffectGif;
    skillEffectImgs[elem] = img;
  }
}