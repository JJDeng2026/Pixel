/**
 * ============================================
 * 像素肉鸽游戏 - 控制器模块
 * 处理：虚拟摇杆、触控输入、技能按钮
 * 支持移动端触控和PC端键盘
 * ============================================
 */

const Controls = {
    // 摇杆状态
    joystick: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        dx: 0,
        dy: 0,
    },
    
    // 移动方向
    movement: {
        x: 0,
        y: 0,
    },
    
    /**
     * 初始化控制器
     */
    init() {
        this.setupJoystick();
        this.setupSkillButtons();
        console.log('✅ 控制器初始化完成');
    },
    
    /**
     * 设置虚拟摇杆
     */
    setupJoystick() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        
        if (!joystick || !knob) return;
        
        // 触摸开始
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startJoystick(touch.clientX, touch.clientY, joystick);
        }, { passive: false });
        
        // 触摸移动
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.joystick.active) return;
            const touch = e.touches[0];
            this.moveJoystick(touch.clientX, touch.clientY, joystick, knob);
        }, { passive: false });
        
        // 触摸结束
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.endJoystick(knob);
        }, { passive: false });
        
        // 鼠标支持（PC端调试）
        joystick.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startJoystick(e.clientX, e.clientY, joystick);
            
            const onMouseMove = (e) => {
                if (!this.joystick.active) return;
                this.moveJoystick(e.clientX, e.clientY, joystick, knob);
            };
            
            const onMouseUp = () => {
                this.endJoystick(knob);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    },
    
    /**
     * 开始摇杆操作
     */
    startJoystick(clientX, clientY, joystickElement) {
        const rect = joystickElement.getBoundingClientRect();
        this.joystick.active = true;
        this.joystick.startX = rect.left + rect.width / 2;
        this.joystick.startY = rect.top + rect.height / 2;
        this.joystick.currentX = clientX;
        this.joystick.currentY = clientY;
    },
    
    /**
     * 移动摇杆
     */
    moveJoystick(clientX, clientY, joystickElement, knobElement) {
        const rect = joystickElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        
        // 计算距离
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = rect.width / 2 * CONFIG.JOYSTICK.MAX_DISTANCE;
        
        // 限制最大移动距离
        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }
        
        // 死区检测
        if (distance < rect.width / 2 * CONFIG.JOYSTICK.DEAD_ZONE) {
            dx = 0;
            dy = 0;
        }
        
        // 更新摇杆位置
        this.joystick.dx = dx / maxDistance;
        this.joystick.dy = dy / maxDistance;
        this.movement.x = this.joystick.dx;
        this.movement.y = this.joystick.dy;
        
        // 移动旋钮
        knobElement.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    },
    
    /**
     * 结束摇杆操作
     */
    endJoystick(knobElement) {
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        this.movement.x = 0;
        this.movement.y = 0;
        
        // 复位旋钮
        knobElement.style.transform = 'translate(-50%, -50%)';
    },
    
    /**
     * 设置技能按钮
     */
    setupSkillButtons() {
        const skillButtons = document.querySelectorAll('.skill-btn');
        
        skillButtons.forEach((btn, index) => {
            // 触摸事件
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                Skills.cast(index);
            }, { passive: false });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
            }, { passive: false });
            
            // 鼠标事件
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                Skills.cast(index);
            });
            
            btn.addEventListener('mouseup', () => {
                btn.classList.remove('active');
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('active');
            });
        });
    },
    
    /**
     * 获取移动输入（优先摇杆，其次键盘）
     */
    getMovement() {
        // 如果摇杆有输入，使用摇杆
        if (this.movement.x !== 0 || this.movement.y !== 0) {
            return { x: this.movement.x, y: this.movement.y };
        }
        
        // 否则使用键盘
        let x = 0;
        let y = 0;
        
        if (GameEngine.input.keys['w'] || GameEngine.input.keys['arrowup']) y = -1;
        if (GameEngine.input.keys['s'] || GameEngine.input.keys['arrowdown']) y = 1;
        if (GameEngine.input.keys['a'] || GameEngine.input.keys['arrowleft']) x = -1;
        if (GameEngine.input.keys['d'] || GameEngine.input.keys['arrowright']) x = 1;
        
        // 归一化对角移动
        if (x !== 0 && y !== 0) {
            const len = Math.sqrt(x * x + y * y);
            x /= len;
            y /= len;
        }
        
        return { x, y };
    },
    
    /**
     * 更新技能按钮冷却显示
     */
    updateSkillCooldowns() {
        const skillButtons = document.querySelectorAll('.skill-btn');
        
        Skills.cooldowns.forEach((cooldown, index) => {
            const btn = skillButtons[index];
            if (!btn) return;
            
            const cooldownEl = btn.querySelector('.skill-cooldown');
            if (cooldown > 0) {
                btn.classList.add('on-cooldown');
                if (cooldownEl) {
                    cooldownEl.textContent = Math.ceil(cooldown / 1000) + 's';
                }
            } else {
                btn.classList.remove('on-cooldown');
                if (cooldownEl) {
                    cooldownEl.textContent = '';
                }
            }
        });
    }
};
