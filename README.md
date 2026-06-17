# 🎮 像素肉鸽 - Pixel Roguelike

一款完整的像素风格肉鸽类网页游戏，支持移动端触控操作。

## ✨ 功能特性

### 🎯 核心玩法
- **双升级系统**：对局外永久升级 + 对局内临时升级
- **技能系统**：6种华丽技能（火球术、闪电链、冰锥术、护盾、旋风斩、治疗术）
- **多样化敌人**：史莱姆、蝙蝠、骷髅、BOSS
- **武器系统**：5种可解锁武器

### 📱 移动端支持
- **固定竖屏模式**
- **虚拟摇杆**（左侧）+ **技能按钮**（右侧）
- **响应式自适应**：自动适配手机/平板/电脑
- **触控优化**：支持触摸和鼠标操作

### 💰 经济系统
- **金币**：通过游戏获得，用于永久升级和商店购买
- **钻石**：稀有货币，购买高级物品
- **积分系统**：记录最高分
- **商店**：购买属性强化、武器、皮肤

### 🔧 管理功能
- **GM后台**：资源修改、数据导入导出、调试功能
- **本地存档**：使用LocalStorage自动保存
- **数据持久化**：刷新页面不丢失进度

## 🚀 快速开始

### 直接运行
1. 将整个文件夹上传到任何网页服务器
2. 用浏览器访问 `index.html`
3. 开始游戏！

### 本地运行
```bash
# 使用Python启动本地服务器
python3 -m http.server 8000

# 或使用Node.js
npx serve .

# 然后访问 http://localhost:8000
```

## 🎮 操作说明

### 移动端
- **左侧虚拟摇杆**：控制人物移动
- **右侧技能按钮**：释放对应技能

### 电脑端
- **WASD / 方向键**：移动
- **空格 / 1234**：释放技能
- **ESC**：暂停游戏
- **鼠标**：也可点击虚拟摇杆和技能按钮

## ⚙️ 参数配置

所有可调整的数值都在 `js/config.js` 中：

### 游戏核心
```javascript
GAME: {
    FPS: 60,                    // 游戏帧率
    CANVAS_WIDTH: 480,          // 画布宽度
    CANVAS_HEIGHT: 720,         // 画布高度
}
```

### 玩家属性
```javascript
PLAYER: {
    BASE_HEALTH: 100,           // 基础生命值
    BASE_SPEED: 3,              // 基础移动速度
    BASE_DAMAGE: 10,            // 基础伤害
}
```

### 升级系统
```javascript
LEVELUP: {
    BASE_EXP: 50,               // 升级所需基础经验
    EXP_MULTIPLIER: 1.5,        // 每级经验递增
    MAX_LEVEL: 50,              // 最高等级
}
```

### 技能参数
```javascript
SKILLS: {
    fireball: { damage: 30, cooldown: 3000 },
    lightning: { damage: 25, cooldown: 4000 },
    // ... 更多技能
}
```

## 🔌 扩展接口

### 新增技能
1. 在 `CONFIG.SKILLS` 添加技能配置
2. 在 `Skills.executeSkill()` 添加技能逻辑
3. 在 `Skills.castNewSkill()` 实现具体效果

### 新增敌人
1. 在 `CONFIG.ENEMY.TYPES` 添加敌人属性
2. 在 `Enemy.renderEyes()` 添加绘制逻辑

### 新增武器
1. 在 `CONFIG.WEAPONS` 添加武器配置
2. 自动在商店中显示并可购买

### 新增皮肤
1. 在 `CONFIG.SKINS` 添加皮肤配置
2. 自动在商店中显示并可购买

### 新增关卡
1. 在 `CONFIG.LEVELS` 添加关卡配置
2. 实现关卡选择界面（预留位置）

## 📁 文件结构

```
pixel_roguelike_game/
├── index.html              # 主页面
├── README.md               # 说明文档
├── css/
│   └── style.css           # 样式表（含响应式布局）
├── js/
│   ├── config.js           # ⭐ 所有参数配置
│   ├── database.js         # 数据持久化
│   ├── gameEngine.js       # 游戏核心引擎
│   ├── controls.js         # 触控/键盘控制
│   ├── player.js           # 玩家系统
│   ├── enemy.js            # 敌人系统
│   ├── skills.js           # 技能系统
│   ├── weapons.js          # 武器系统
│   ├── shop.js             # 商店系统
│   ├── gm.js               # GM后台
│   ├── ui.js               # UI管理
│   └── main.js             # 主入口
└── assets/
    └── images/
        ├── characters/     # 角色素材
        ├── enemies/        # 敌人素材
        ├── skills/         # 技能图标
        ├── weapons/        # 武器图标
        ├── ui/             # UI素材
        └── effects/        # 特效素材
```

## 🎨 素材来源

- 所有像素风格素材均为免费可商用资源
- 角色、敌人、图标由AI生成
- 可替换为自己的PNG素材

## 🔒 数据存储

- 使用浏览器 `LocalStorage` 存储
- 存档数据格式为JSON
- 支持导出/导入备份

## 📱 兼容性

- ✅ iOS Safari
- ✅ Android Chrome
- ✅ 桌面端 Chrome/Firefox/Safari
- ✅ 响应式适配各种分辨率

## 🐛 调试模式

在 `config.js` 中开启：
```javascript
DEBUG: {
    ENABLED: true,
    SHOW_HITBOX: true,     // 显示碰撞盒
    INVINCIBLE: true,      // 无敌
    INSTANT_KILL: true,    // 一击必杀
    UNLIMITED_SKILLS: true // 无冷却技能
}
```

---

**祝您游戏愉快！🎮**
