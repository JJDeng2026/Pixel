/**
 * ============================================
 * 像素肉鸽游戏 - GM后台模块
 * 包含：资源修改、数据管理、调试功能
 * ============================================
 */

const GM = {
    /**
     * 设置金币
     */
    setGold() {
        const input = document.getElementById('gmGoldInput');
        const value = parseInt(input.value) || 0;
        Database.setGold(value);
        UI.updateMenuStats();
        alert('✅ 金币已设置为: ' + value);
    },
    
    /**
     * 添加金币
     */
    addGold(amount) {
        Database.addGold(amount);
        UI.updateMenuStats();
        alert('✅ 已添加 ' + amount + ' 金币');
    },
    
    /**
     * 设置钻石
     */
    setDiamond() {
        const input = document.getElementById('gmDiamondInput');
        const value = parseInt(input.value) || 0;
        Database.setDiamond(value);
        UI.updateMenuStats();
        alert('✅ 钻石已设置为: ' + value);
    },
    
    /**
     * 添加钻石
     */
    addDiamond(amount) {
        Database.addDiamond(amount);
        UI.updateMenuStats();
        alert('✅ 已添加 ' + amount + ' 钻石');
    },
    
    /**
     * 重置所有数据
     */
    resetData() {
        if (confirm('⚠️ 确定要重置所有游戏数据吗？此操作不可恢复！')) {
            Database.resetAll();
            UI.updateMenuStats();
            alert('✅ 数据已重置');
        }
    },
    
    /**
     * 导出存档
     */
    exportData() {
        const saveData = Database.exportSave();
        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pixel_roguelike_save_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
        alert('✅ 存档已导出');
    },
    
    /**
     * 导入存档
     */
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if (Database.importSave(e.target.result)) {
                        UI.updateMenuStats();
                        alert('✅ 存档导入成功');
                    } else {
                        alert('❌ 存档格式错误');
                    }
                } catch (err) {
                    alert('❌ 导入失败: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    },
    
    /**
     * 解锁所有武器
     */
    giveAllWeapons() {
        Object.keys(CONFIG.WEAPONS).forEach(id => {
            Database.unlockWeapon(id);
        });
        alert('✅ 已解锁所有武器');
    },
    
    /**
     * 满级永久升级
     */
    maxPermanentUpgrades() {
        Object.keys(Database.saveData.permanentUpgrades).forEach(key => {
            Database.saveData.permanentUpgrades[key] = CONFIG.PERMANENT_UPGRADE.MAX_LEVEL;
        });
        Database.save();
        alert('✅ 永久升级已全部满级');
    },
    
    /**
     * 解锁所有皮肤
     */
    unlockAllSkins() {
        Object.keys(CONFIG.SKINS).forEach(id => {
            Database.unlockSkin(id);
        });
        alert('✅ 已解锁所有皮肤');
    },
    
    /**
     * 开启调试模式
     */
    toggleDebug() {
        CONFIG.DEBUG.ENABLED = !CONFIG.DEBUG.ENABLED;
        alert('调试模式: ' + (CONFIG.DEBUG.ENABLED ? '开启' : '关闭'));
    }
};
