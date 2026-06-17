/**
 * ============================================
 * 像素肉鸽游戏 - 武器模块
 * 扩展预留：新增武器只需在CONFIG.WEAPONS添加配置
 * ============================================
 */

const Weapons = {
    /**
     * 获取所有武器列表
     */
    getAll() {
        return Object.entries(CONFIG.WEAPONS).map(([id, config]) => ({
            id,
            ...config,
            unlocked: Database.isWeaponUnlocked(id),
            equipped: Database.saveData.currentWeapon === id,
        }));
    },
    
    /**
     * 购买武器
     */
    purchase(weaponId) {
        const weapon = CONFIG.WEAPONS[weaponId];
        if (!weapon) return false;
        if (Database.isWeaponUnlocked(weaponId)) return false;
        
        if (weapon.currency === 'diamond') {
            if (Database.spendDiamond(weapon.price)) {
                Database.unlockWeapon(weaponId);
                return true;
            }
        } else {
            if (Database.spendGold(weapon.price)) {
                Database.unlockWeapon(weaponId);
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * 装备武器
     */
    equip(weaponId) {
        return Database.setCurrentWeapon(weaponId);
    },
    
    /**
     * 获取当前武器
     */
    getCurrent() {
        return CONFIG.WEAPONS[Database.saveData.currentWeapon];
    }
};
