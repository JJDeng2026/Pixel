/**
 * ============================================
 * 像素肉鸽游戏 - 数据库模块
 * 使用LocalStorage进行数据持久化
 * ============================================
 */

const Database = {
    STORAGE_KEY: 'pixel_roguelike_save',
    
    // 默认存档数据结构
    DEFAULT_SAVE: {
        // 经济数据
        gold: 0,
        diamond: 0,
        highScore: 0,
        totalGames: 0,
        totalKills: 0,
        
        // 永久升级数据
        permanentUpgrades: {
            maxHealth: 0,      // 生命升级等级
            damage: 0,         // 伤害升级等级
            speed: 0,          // 速度升级等级
            attackSpeed: 0,    // 攻速升级等级
        },
        
        // 武器解锁
        unlockedWeapons: ['basicSword'],
        currentWeapon: 'basicSword',
        
        // 皮肤系统（预留扩展）
        unlockedSkins: ['default'],
        currentSkin: 'default',
        
        // 关卡解锁（预留扩展）
        unlockedLevels: [1],
        currentLevel: 1,
        
        // 成就系统（预留扩展）
        achievements: [],
        
        // 设置
        settings: {
            soundEnabled: true,
            musicEnabled: true,
            vibrationEnabled: true,
        }
    },
    
    // 当前存档数据
    saveData: null,
    
    /**
     * 初始化数据库
     */
    init() {
        this.load();
        console.log('✅ 数据库初始化完成');
    },
    
    /**
     * 加载存档
     */
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.saveData = JSON.parse(saved);
                // 合并默认值（防止旧存档缺少字段）
                this.saveData = this.mergeDefaults(this.saveData, this.DEFAULT_SAVE);
            } else {
                this.saveData = JSON.parse(JSON.stringify(this.DEFAULT_SAVE));
                this.save();
            }
        } catch (e) {
            console.error('❌ 加载存档失败:', e);
            this.saveData = JSON.parse(JSON.stringify(this.DEFAULT_SAVE));
        }
    },
    
    /**
     * 保存存档
     */
    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.saveData));
            return true;
        } catch (e) {
            console.error('❌ 保存存档失败:', e);
            return false;
        }
    },
    
    /**
     * 合并默认值（递归）
     */
    mergeDefaults(target, defaults) {
        const result = { ...target };
        for (const key in defaults) {
            if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                result[key] = this.mergeDefaults(result[key] || {}, defaults[key]);
            } else if (result[key] === undefined) {
                result[key] = defaults[key];
            }
        }
        return result;
    },
    
    /**
     * 获取金币
     */
    getGold() {
        return this.saveData.gold;
    },
    
    /**
     * 设置金币
     */
    setGold(amount) {
        this.saveData.gold = Math.max(0, amount);
        this.save();
    },
    
    /**
     * 添加金币
     */
    addGold(amount) {
        this.saveData.gold += amount;
        this.save();
    },
    
    /**
     * 消费金币
     */
    spendGold(amount) {
        if (this.saveData.gold >= amount) {
            this.saveData.gold -= amount;
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * 获取钻石
     */
    getDiamond() {
        return this.saveData.diamond;
    },
    
    /**
     * 设置钻石
     */
    setDiamond(amount) {
        this.saveData.diamond = Math.max(0, amount);
        this.save();
    },
    
    /**
     * 添加钻石
     */
    addDiamond(amount) {
        this.saveData.diamond += amount;
        this.save();
    },
    
    /**
     * 消费钻石
     */
    spendDiamond(amount) {
        if (this.saveData.diamond >= amount) {
            this.saveData.diamond -= amount;
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * 获取最高分
     */
    getHighScore() {
        return this.saveData.highScore;
    },
    
    /**
     * 更新最高分
     */
    updateHighScore(score) {
        if (score > this.saveData.highScore) {
            this.saveData.highScore = score;
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * 增加对局数
     */
    incrementGames() {
        this.saveData.totalGames++;
        this.save();
    },
    
    /**
     * 获取永久升级等级
     */
    getPermanentUpgrade(upgradeType) {
        return this.saveData.permanentUpgrades[upgradeType] || 0;
    },
    
    /**
     * 升级永久属性
     */
    upgradePermanent(upgradeType) {
        const currentLevel = this.saveData.permanentUpgrades[upgradeType] || 0;
        if (currentLevel >= CONFIG.PERMANENT_UPGRADE.MAX_LEVEL) return false;
        
        const cost = this.getPermanentUpgradeCost(upgradeType);
        if (this.spendGold(cost)) {
            this.saveData.permanentUpgrades[upgradeType] = currentLevel + 1;
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * 获取永久升级花费
     */
    getPermanentUpgradeCost(upgradeType) {
        const level = this.getPermanentUpgrade(upgradeType);
        const baseCost = CONFIG.PERMANENT_UPGRADE[upgradeType.toUpperCase() + '_COST'] || 100;
        return Math.floor(baseCost * Math.pow(CONFIG.PERMANENT_UPGRADE.COST_MULTIPLIER, level));
    },
    
    /**
     * 解锁武器
     */
    unlockWeapon(weaponId) {
        if (!this.saveData.unlockedWeapons.includes(weaponId)) {
            this.saveData.unlockedWeapons.push(weaponId);
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * 检查武器是否解锁
     */
    isWeaponUnlocked(weaponId) {
        return this.saveData.unlockedWeapons.includes(weaponId);
    },
    
    /**
     * 设置当前武器
     */
    setCurrentWeapon(weaponId) {
        if (this.isWeaponUnlocked(weaponId)) {
            this.saveData.currentWeapon = weaponId;
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * 重置所有数据
     */
    resetAll() {
        this.saveData = JSON.parse(JSON.stringify(this.DEFAULT_SAVE));
        this.save();
    },
    
    /**
     * 导出存档
     */
    exportSave() {
        return JSON.stringify(this.saveData);
    },
    
    /**
     * 导入存档
     */
    importSave(saveString) {
        try {
            const data = JSON.parse(saveString);
            this.saveData = this.mergeDefaults(data, this.DEFAULT_SAVE);
            this.save();
            return true;
        } catch (e) {
            console.error('❌ 导入存档失败:', e);
            return false;
        }
    },
    
    // ========== 扩展预留：皮肤系统 ==========
    unlockSkin(skinId) {
        if (!this.saveData.unlockedSkins.includes(skinId)) {
            this.saveData.unlockedSkins.push(skinId);
            this.save();
            return true;
        }
        return false;
    },
    
    isSkinUnlocked(skinId) {
        return this.saveData.unlockedSkins.includes(skinId);
    },
    
    setCurrentSkin(skinId) {
        if (this.isSkinUnlocked(skinId)) {
            this.saveData.currentSkin = skinId;
            this.save();
            return true;
        }
        return false;
    },
    
    // ========== 扩展预留：关卡系统 ==========
    unlockLevel(levelId) {
        if (!this.saveData.unlockedLevels.includes(levelId)) {
            this.saveData.unlockedLevels.push(levelId);
            this.save();
            return true;
        }
        return false;
    },
    
    isLevelUnlocked(levelId) {
        return this.saveData.unlockedLevels.includes(levelId);
    }
};
