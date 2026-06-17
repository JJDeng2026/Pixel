/**
 * ============================================
 * 像素肉鸽游戏 - 商店模块
 * 扩展预留：新增商品只需在CONFIG.SHOP添加配置
 * ============================================
 */

const Shop = {
    /**
     * 获取所有商店物品
     */
    getItems() {
        const items = [];
        
        // 消耗品
        Object.entries(CONFIG.SHOP).forEach(([id, config]) => {
            items.push({ id, ...config, type: 'consumable' });
        });
        
        // 武器
        Object.entries(CONFIG.WEAPONS).forEach(([id, config]) => {
            if (config.price > 0 && !Database.isWeaponUnlocked(id)) {
                items.push({
                    id,
                    name: config.name,
                    description: `伤害+${config.damage}, 攻速+${config.attackSpeed}`,
                    price: config.price,
                    currency: config.currency || 'gold',
                    type: 'weapon',
                });
            }
        });
        
        // 皮肤（预留扩展）
        Object.entries(CONFIG.SKINS).forEach(([id, config]) => {
            if (config.price > 0 && !Database.isSkinUnlocked(id)) {
                items.push({
                    id,
                    name: config.name + ' 皮肤',
                    description: `解锁${config.name}外观`,
                    price: config.price,
                    currency: config.currency || 'gold',
                    type: 'skin',
                });
            }
        });
        
        return items;
    },
    
    /**
     * 购买物品
     */
    purchase(itemId) {
        const shopItem = CONFIG.SHOP[itemId];
        const weapon = CONFIG.WEAPONS[itemId];
        const skin = CONFIG.SKINS[itemId];
        
        if (shopItem) {
            return this.purchaseConsumable(shopItem);
        } else if (weapon) {
            return Weapons.purchase(itemId);
        } else if (skin) {
            return this.purchaseSkin(itemId, skin);
        }
        
        return false;
    },
    
    /**
     * 购买消耗品（永久属性）
     */
    purchaseConsumable(item) {
        if (item.currency === 'diamond') {
            if (!Database.spendDiamond(item.price)) return false;
        } else {
            if (!Database.spendGold(item.price)) return false;
        }
        
        // 应用效果
        if (item.effect.maxHealth) {
            Database.saveData.permanentUpgrades.maxHealth += item.effect.maxHealth / 10;
        }
        if (item.effect.damage) {
            Database.saveData.permanentUpgrades.damage += item.effect.damage / 3;
        }
        if (item.effect.speed) {
            Database.saveData.permanentUpgrades.speed += item.effect.speed / 0.15;
        }
        if (item.effect.gold) {
            Database.addGold(item.effect.gold);
        }
        if (item.effect.diamond) {
            Database.addDiamond(item.effect.diamond);
        }
        
        Database.save();
        return true;
    },
    
    /**
     * 购买皮肤
     */
    purchaseSkin(skinId, skin) {
        if (skin.currency === 'diamond') {
            if (!Database.spendDiamond(skin.price)) return false;
        } else {
            if (!Database.spendGold(skin.price)) return false;
        }
        
        Database.unlockSkin(skinId);
        return true;
    }
};
