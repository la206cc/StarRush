/**
 * 萌闯星际 (Star Rush) - 渲染引擎
 * 负责游戏的主循环驱动、帧率控制和渲染调度
 * 使用 setTimeout 模拟 requestAnimationFrame（微信小游戏环境）
 */

class Renderer {
  /**
   * 构造函数
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D绘图上下文
   * @param {number} width - Canvas宽度
   * @param {number} height - Canvas高度
   */
  constructor(ctx, width, height) {
    // 绑定上下文和尺寸
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    // 运行状态
    this.isRunning = false;
    this.callback = null;  // 每帧回调函数

    // 帧率控制
    this.lastTime = 0;          // 上一帧时间戳
    this.fps = 0;               // 当前FPS值
    this.frameCount = 0;        // 帧计数器
    this.fpsUpdateTime = 0;     // FPS更新时间

    // 目标帧间隔（约60fps）
    this.targetFrameTime = 16.67;  // ms

    console.log(`渲染引擎初始化: ${width}x${height}`);
  }

  /**
   * 启动渲染循环
   * @param {Function} callback - 每帧回调函数，参数为 deltaTime（秒）
   */
  start(callback) {
    if (this.isRunning) {
      console.warn('渲染循环已在运行中');
      return;
    }

    this.callback = callback;
    this.isRunning = true;
    this.lastTime = Date.now();
    this.fpsUpdateTime = this.lastTime;
    this.frameCount = 0;

    console.log('渲染引擎启动');
    this._loop();
  }

  /**
   * 停止渲染循环
   */
  stop() {
    this.isRunning = false;
    console.log('渲染引擎停止');
  }

  /**
   * 主循环（内部方法，使用 setTimeout 驱动）
   * @private
   */
  _loop() {
    if (!this.isRunning) return;

    const now = Date.now();

    // 计算帧间隔时间（秒），限制最大值为100ms防止跳帧
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // FPS统计计算
    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    // 执行每帧回调
    if (this.callback && typeof this.callback === 'function') {
      try {
        this.callback(deltaTime);
      } catch (e) {
        console.error('渲染回调执行错误:', e);
      }
    }

    // 使用 setTimeout 调度下一帧（模拟 requestAnimationFrame）
    setTimeout(() => this._loop(), this.targetFrameTime);
  }

  /**
   * 获取当前帧率
   * @returns {number} 当前FPS值
   */
  getFPS() {
    return this.fps;
  }

  /**
   * 获取Canvas绑定上下文
   * @returns {CanvasRenderingContext2D} Canvas 2D上下文
   */
  getContext() {
    return this.ctx;
  }

  /**
   * 获取Canvas宽度
   * @returns {number} 宽度
   */
  getWidth() {
    return this.width;
  }

  /**
   * 获取Canvas高度
   * @returns {number} 高度
   */
  getHeight() {
    return this.height;
  }

  /**
   * 检查是否正在运行
   * @returns {boolean} 是否运行中
   */
  isRunningState() {
    return this.isRunning;
  }
}

module.exports = Renderer;
