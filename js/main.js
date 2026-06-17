/**
 * ============================================
 * 像素肉鸽游戏 - 主入口
 * 游戏整体控制逻辑
 * ============================================
 */

const Game = {
    /**
     * 初始化游戏
     */
    init() {
        console.log('🎮 像素肉鸽游戏启动中...');
        
        // 加载精灵素材
        Sprites.loadAll().then(() => {
            // 初始化各模块
            Database.init();
            GameEngine.init();
            Controls.init();
            Skills.init();
            UI.init();
            
            console.log('✅ 游戏初始化完成！');
        });
    },
    
    /**
     * 开始游戏
     */
    startGame() {
        UI.showGameScreen();
        GameEngine.start();
    },
    
    /**
     * 暂停/继续切换
     */
    togglePause() {
        if (GameEngine.paused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    },
    
    /**
     * 暂停游戏
     */
    pauseGame() {
        GameEngine.pause();
        UI.showPause();
    },
    
    /**
     * 继续游戏
     */
    resumeGame() {
        GameEngine.resume();
        UI.hidePause();
    },
    
    /**
     * 游戏结束
     */
    gameOver() {
        GameEngine.stop();
        UI.showGameOver();
    },
    
    /**
     * 返回主菜单
     */
    quitToMenu() {
        GameEngine.stop();
        UI.showMainMenu();
    }
};

// 页面加载完成后初始化游戏
window.addEventListener('load', () => {
    Game.init();
});

// 防止页面滚动
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });
