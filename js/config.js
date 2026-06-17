/**
 * ============================================
 * 像素肉鸽游戏 - 配置文件
 * 所有可修改的数值参数都在此处定义
 * 便于后续调整游戏平衡性
 * ============================================
 */

const CONFIG = {
    // ========== 游戏核心设置 ==========
    GAME: {
        FPS: 60,                    // 游戏帧率
        CANVAS_WIDTH: 480,          // 画布宽度
        CANVAS_HEIGHT: 720,         // 画布高度（竖屏）
        TILE_SIZE: 32,              // 瓦片大小
        MAP_WIDTH: 50,              // 地图宽度（瓦片数）
        MAP_HEIGHT: 50,             // 地图高度（瓦片数）
    },

    // ========== 玩家基础设置 ==========
    PLAYER: {
        BASE_HEALTH: 100,           // 基础生命值
        BASE_SPEED: 3,              // 基础移动速度
        BASE_DAMAGE: 10,            // 基础伤害
        BASE_ATTACK_SPEED: 1,       // 基础攻击速度（次/秒）
        BASE_CRIT_CHANCE: 0.05,     // 基础暴击率
        BASE_CRIT_DAMAGE: 1.5,      // 基础暴击伤害倍率
        SIZE: 24,                   // 玩家大小
        COLOR: '#4a90d9',           // 玩家颜色
    },

    // ========== 对局内升级设置 ==========
    LEVELUP: {
        BASE_EXP: 50,               // 升级所需基础经验
        EXP_MULTIPLIER: 1.5,        // 每级经验递增倍数
        MAX_LEVEL: 50,              // 最高等级
        OPTIONS_COUNT: 3,           // 每次升级选项数量
    },

    // ========== 永久升级（对局外）设置 ==========
    PERMANENT_UPGRADE: {
        HEALTH_COST: 100,           // 生命升级基础花费
        DAMAGE_COST: 150,           // 伤害升级基础花费
        SPEED_COST: 200,            // 速度升级基础花费
        COST_MULTIPLIER: 1.5,       // 花费递增倍数
        MAX_LEVEL: 20,              // 每项最高等级
    },

    // ========== 敌人设置 ==========
    ENEMY: {
        SPAWN_INTERVAL: 2000,       // 敌人生成间隔（毫秒）
        SPAWN_RADIUS: 300,          // 生成距离玩家的半径
        TYPES: {
            slime: {
                name: '史莱姆',
                health: 30,
                damage: 5,
                speed: 1,
                size: 20,
                color: '#4ade80',
                exp: 10,
                gold: 5,
            },
            bat: {
                name: '蝙蝠',
                health: 20,
                damage: 8,
                speed: 2.5,
                size: 16,
                color: '#8b5cf6',
                exp: 15,
                gold: 8,
            },
            skeleton: {
                name: '骷髅',
                health: 60,
                damage: 12,
                speed: 1.2,
                size: 24,
                color: '#f5f5f5',
                exp: 25,
                gold: 15,
            },
            boss: {
                name: 'BOSS',
                health: 500,
                damage: 30,
                speed: 0.8,
                size: 48,
                color: '#ef4444',
                exp: 200,
                gold: 100,
            }
        }
    },

    // ========== 技能设置 ==========
    SKILLS: {
        fireball: {
            name: '火球术',
            damage: 30,
            cooldown: 3000,           // 冷却时间（毫秒）
            speed: 8,
            size: 16,
            color: '#ff6b35',
            pierce: 1,               // 穿透数量
        },
        lightning: {
            name: '闪电链',
            damage: 25,
            cooldown: 4000,
            range: 150,
            chainCount: 3,           // 连锁次数
            color: '#fbbf24',
        },
        iceShard: {
            name: '冰锥术',
            damage: 20,
            cooldown: 2500,
            speed: 10,
            size: 12,
            color: '#67e8f9',
            slowEffect: 0.5,         // 减速效果
            slowDuration: 2000,
        },
        shield: {
            name: '护盾',
            duration: 5000,
            cooldown: 15000,
            damageReduction: 0.5,    // 伤害减免
            color: '#60a5fa',
        },
        spinAttack: {
            name: '旋风斩',
            damage: 40,
            cooldown: 5000,
            radius: 80,
            duration: 1000,
            color: '#f472b6',
        },
        heal: {
            name: '治疗术',
            healAmount: 30,
            cooldown: 8000,
            color: '#4ade80',
        }
    },

    // ========== 武器设置 ==========
    WEAPONS: {
        basicSword: {
            name: '基础剑',
            damage: 0,
            attackSpeed: 0,
            price: 0,
            unlocked: true,
        },
        ironSword: {
            name: '铁剑',
            damage: 5,
            attackSpeed: 0,
            price: 500,
            currency: 'gold',
        },
        flameBlade: {
            name: '烈焰之刃',
            damage: 15,
            attackSpeed: 0.1,
            price: 2000,
            currency: 'gold',
        },
        thunderSword: {
            name: '雷霆之剑',
            damage: 25,
            attackSpeed: 0.2,
            price: 500,
            currency: 'diamond',
        },
        legendaryBlade: {
            name: '传说之刃',
            damage: 50,
            attackSpeed: 0.3,
            price: 200,
            currency: 'diamond',
        }
    },

    // ========== 商店物品设置 ==========
    SHOP: {
        HEALTH_POTION: {
            name: '生命药水',
            description: '永久增加10点最大生命',
            effect: { maxHealth: 10 },
            price: 200,
            currency: 'gold',
        },
        DAMAGE_BOOST: {
            name: '力量药剂',
            description: '永久增加5点伤害',
            effect: { damage: 5 },
            price: 300,
            currency: 'gold',
        },
        SPEED_BOOST: {
            name: '疾风药剂',
            description: '永久增加0.2移动速度',
            effect: { speed: 0.2 },
            price: 400,
            currency: 'gold',
        },
        DIAMOND_PACK: {
            name: '钻石礼包',
            description: '获得100钻石',
            effect: { diamond: 100 },
            price: 10000,
            currency: 'gold',
        }
    },

    // ========== 经济系统设置 ==========
    ECONOMY: {
        SCORE_TO_GOLD_RATIO: 0.1,   // 积分转金币比例
        SCORE_TO_DIAMOND_RATIO: 0.01, // 积分转钻石比例
        KILL_BONUS_GOLD: 1,         // 每杀一个额外金币
    },

    // ========== 虚拟摇杆设置 ==========
    JOYSTICK: {
        DEAD_ZONE: 0.1,             // 死区阈值
        MAX_DISTANCE: 0.8,          // 最大移动距离比例
    },

    // ========== 扩展预留：皮肤系统 ==========
    // 新增皮肤只需在此处添加配置
    SKINS: {
        default: {
            name: '默认勇者',
            color: '#4a90d9',
            price: 0,
            unlocked: true,
        },
        knight: {
            name: '骑士',
            color: '#f59e0b',
            price: 500,
            currency: 'gold',
        },
        mage: {
            name: '法师',
            color: '#8b5cf6',
            price: 100,
            currency: 'diamond',
        },
        ninja: {
            name: '忍者',
            color: '#1f2937',
            price: 200,
            currency: 'diamond',
        }
    },

    // ========== 扩展预留：关卡系统 ==========
    // 新增关卡只需在此处添加配置
    LEVELS: {
        1: {
            name: '翠绿草原',
            background: '#1a2a1a',
            enemyTypes: ['slime'],
            spawnRate: 1,
        },
        2: {
            name: '幽暗洞穴',
            background: '#1a1a2a',
            enemyTypes: ['slime', 'bat'],
            spawnRate: 1.2,
        },
        3: {
            name: '亡灵墓地',
            background: '#2a1a1a',
            enemyTypes: ['bat', 'skeleton'],
            spawnRate: 1.5,
        },
        4: {
            name: 'BOSS巢穴',
            background: '#0a0a0a',
            enemyTypes: ['skeleton', 'boss'],
            spawnRate: 0.8,
        }
    },

    // ========== 扩展预留：成就系统 ==========
    ACHIEVEMENTS: {
        firstKill: { name: '初次击杀', description: '击杀第一个敌人', reward: { gold: 100 } },
        kill100: { name: '百人斩', description: '累计击杀100敌人', reward: { gold: 500, diamond: 10 } },
        survive10min: { name: '生存大师', description: '单局存活10分钟', reward: { diamond: 50 } },
    },

    // ========== 调试模式 ==========
    DEBUG: {
        ENABLED: false,             // 开启调试模式
        SHOW_HITBOX: false,         // 显示碰撞盒
        INVINCIBLE: false,          // 无敌模式
        INSTANT_KILL: false,        // 一击必杀
        UNLIMITED_SKILLS: false,    // 无冷却技能
    }
};

// 导出配置（供其他模块使用）
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
