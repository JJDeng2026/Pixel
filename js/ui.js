/**
 * ============================================
 * 像素肉鸽游戏 - UI模块
 * 包含：界面切换、HUD更新、弹窗管理
 * ============================================
 */

const UI = {
    /**
     * 初始化UI
     */
    init() {
        this.bindEvents();
        this.updateMenuStats();
        console.log('✅ UI初始化完成');
    },
    
    /**
     * 绑定UI事件
     */
    bindEvents() {
        // 主菜单按钮
        document.getElementById('startGameBtn').onclick = () => Game.startGame();
        document.getElementById('shopBtn').onclick = () => this.showShop();
        document.getElementById('upgradeBtn').onclick = () => this.showPermanentUpgrades();
        document.getElementById('gmBtn').onclick = () => this.showGM();
        
        // 关闭按钮
        document.getElementById('closeShopBtn').onclick = () => this.hideOverlay('shopScreen');
        document.getElementById('closeUpgradeBtn').onclick = () => this.hideOverlay('upgradeScreen');
        document.getElementById('closeGmBtn').onclick = () => this.hideOverlay('gmScreen');
        
        // 游戏控制
        document.getElementById('pauseBtn').onclick = () => Game.togglePause();
        document.getElementById('resumeBtn').onclick = () => Game.resumeGame();
        document.getElementById('quitBtn').onclick = () => Game.quitToMenu();
        
        // 游戏结束
        document.getElementById('restartBtn').onclick = () => Game.startGame();
        document.getElementById('backToMenuBtn').onclick = () => Game.quitToMenu();
    },
    
    /**
     * 更新主菜单统计
     */
    updateMenuStats() {
        document.getElementById('menuGold').textContent = Database.getGold();
        document.getElementById('menuDiamond').textContent = Database.getDiamond();
        document.getElementById('menuLevel').textContent = 
            Object.values(Database.saveData.permanentUpgrades).reduce((a, b) => a + b, 1);
        document.getElementById('highScore').textContent = Database.getHighScore();
        document.getElementById('totalGames').textContent = Database.saveData.totalGames;
    },
    
    /**
     * 更新游戏HUD
     */
    updateHUD() {
        const player = GameEngine.entities.player;
        if (!player) return;
        
        // 血条
        const healthPercent = player.health / player.getTotalMaxHealth();
        document.getElementById('healthBar').style.width = (healthPercent * 100) + '%';
        
        // 经验条
        const expPercent = player.exp / player.expToNext;
        document.getElementById('expBar').style.width = (expPercent * 100) + '%';
        
        // 游戏时间
        const minutes = Math.floor(GameEngine.gameTime / 60);
        const seconds = Math.floor(GameEngine.gameTime % 60);
        document.getElementById('gameTime').textContent = 
            minutes + ':' + seconds.toString().padStart(2, '0');
        
        // 击杀数和积分
        document.getElementById('killCount').textContent = GameEngine.killCount;
        document.getElementById('currentScore').textContent = Math.floor(GameEngine.score);
    },
    
    /**
     * 显示升级选择界面
     */
    showLevelUpOptions() {
        GameEngine.pause();
        const options = Skills.getUpgradeOptions();
        const container = document.getElementById('levelUpOptions');
        container.innerHTML = '';
        
        options.forEach(option => {
            const div = document.createElement('div');
            div.className = 'levelup-option';
            div.innerHTML = `
                <h3>${option.icon} ${option.name}</h3>
                <p>${option.description}</p>
            `;
            div.onclick = () => {
                GameEngine.entities.player.applyUpgrade(option);
                this.hideOverlay('levelUpScreen');
                GameEngine.resume();
            };
            container.appendChild(div);
        });
        
        this.showOverlay('levelUpScreen');
    },
    
    /**
     * 显示商店
     */
    showShop() {
        const items = Shop.getItems();
        const container = document.getElementById('shopItems');
        container.innerHTML = '';
        
        document.getElementById('shopGold').textContent = Database.getGold();
        document.getElementById('shopDiamond').textContent = Database.getDiamond();
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            const currencyIcon = item.currency === 'diamond' ? '💎' : '💰';
            
            div.innerHTML = `
                <div class="shop-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.description}</p>
                </div>
                <button class="buy-btn ${item.currency}">${currencyIcon} ${item.price}</button>
            `;
            
            div.querySelector('.buy-btn').onclick = () => {
                if (Shop.purchase(item.id)) {
                    alert('✅ 购买成功！');
                    this.showShop(); // 刷新
                    this.updateMenuStats();
                } else {
                    alert('❌ 余额不足！');
                }
            };
            
            container.appendChild(div);
        });
        
        this.showOverlay('shopScreen');
    },
    
    /**
     * 显示永久升级界面
     */
    showPermanentUpgrades() {
        const container = document.getElementById('permanentUpgrades');
        container.innerHTML = '';
        
        document.getElementById('upgradeGold').textContent = Database.getGold();
        
        const upgrades = [
            { key: 'maxHealth', name: '生命强化', desc: '+10 最大生命' },
            { key: 'damage', name: '攻击强化', desc: '+3 伤害' },
            { key: 'speed', name: '速度强化', desc: '+0.15 移动速度' },
            { key: 'attackSpeed', name: '攻速强化', desc: '+0.1 攻击速度' },
        ];
        
        upgrades.forEach(upgrade => {
            const level = Database.getPermanentUpgrade(upgrade.key);
            const cost = Database.getPermanentUpgradeCost(upgrade.key);
            const maxed = level >= CONFIG.PERMANENT_UPGRADE.MAX_LEVEL;
            
            const div = document.createElement('div');
            div.className = 'upgrade-item';
            div.innerHTML = `
                <div class="upgrade-item-info">
                    <h4>${upgrade.name} Lv.${level}/${CONFIG.PERMANENT_UPGRADE.MAX_LEVEL}</h4>
                    <p>${upgrade.desc}</p>
                </div>
                <button class="upgrade-item-btn" ${maxed ? 'disabled' : ''}>
                    ${maxed ? '已满级' : '💰 ' + cost}
                </button>
            `;
            
            if (!maxed) {
                div.querySelector('.upgrade-item-btn').onclick = () => {
                    if (Database.upgradePermanent(upgrade.key)) {
                        this.showPermanentUpgrades(); // 刷新
                        this.updateMenuStats();
                    } else {
                        alert('❌ 金币不足！');
                    }
                };
            }
            
            container.appendChild(div);
        });
        
        this.showOverlay('upgradeScreen');
    },
    
    /**
     * 显示GM后台
     */
    showGM() {
        document.getElementById('gmGoldInput').value = Database.getGold();
        document.getElementById('gmDiamondInput').value = Database.getDiamond();
        this.showOverlay('gmScreen');
    },
    
    /**
     * 显示游戏结束界面
     */
    showGameOver() {
        const player = GameEngine.entities.player;
        const score = Math.floor(GameEngine.score);
        
        // 计算奖励
        const rewardGold = Math.floor(score * CONFIG.ECONOMY.SCORE_TO_GOLD_RATIO + 
            GameEngine.killCount * CONFIG.ECONOMY.KILL_BONUS_GOLD);
        const rewardDiamond = Math.floor(score * CONFIG.ECONOMY.SCORE_TO_DIAMOND_RATIO);
        
        // 发放奖励
        Database.addGold(rewardGold);
        Database.addDiamond(rewardDiamond);
        Database.updateHighScore(score);
        Database.incrementGames();
        
        // 更新显示
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalKills').textContent = GameEngine.killCount;
        document.getElementById('finalLevel').textContent = player ? player.level : 1;
        
        const minutes = Math.floor(GameEngine.gameTime / 60);
        const seconds = Math.floor(GameEngine.gameTime % 60);
        document.getElementById('finalTime').textContent = 
            minutes + ':' + seconds.toString().padStart(2, '0');
        
        document.getElementById('rewardGold').textContent = rewardGold;
        document.getElementById('rewardDiamond').textContent = rewardDiamond;
        
        this.showOverlay('gameOverScreen');
        this.updateMenuStats();
    },
    
    /**
     * 显示覆盖层
     */
    showOverlay(id) {
        document.getElementById(id).classList.remove('hidden');
    },
    
    /**
     * 隐藏覆盖层
     */
    hideOverlay(id) {
        document.getElementById(id).classList.add('hidden');
    },
    
    /**
     * 切换到游戏界面
     */
    showGameScreen() {
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        this.hideOverlay('gameOverScreen');
        this.hideOverlay('pauseScreen');
    },
    
    /**
     * 切换到主菜单
     */
    showMainMenu() {
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
        this.hideOverlay('pauseScreen');
        this.hideOverlay('gameOverScreen');
        this.updateMenuStats();
    },
    
    /**
     * 显示暂停界面
     */
    showPause() {
        this.showOverlay('pauseScreen');
    },
    
    /**
     * 隐藏暂停界面
     */
    hidePause() {
        this.hideOverlay('pauseScreen');
    }
};
