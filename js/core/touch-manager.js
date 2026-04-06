/**
 * 萌闯星际 (Star Rush) - 触摸事件管理器
 * 负责处理触摸输入、坐标转换和点击区域检测
 * 支持基于设计稿坐标的点击区域注册和碰撞检测
 */

class TouchManager {
  /**
   * 构造函数
   * @param {HTMLCanvasElement} canvas - Canvas元素（小游戏环境中为wx.createCanvas返回值）
   * @param {ScreenAdapter} screenAdapter - 屏幕适配器实例
   */
  constructor(canvas, screenAdapter) {
    this.canvas = canvas;
    this.adapter = screenAdapter;

    // 注册的可点击区域列表
    // 每个区域: { id, x, y, w, h, callback }
    this.touchAreas = [];

    // 当前触摸状态
    this.currentTouch = null;       // 当前触摸位置（设计稿坐标）
    this.touchStartTime = 0;        // 触摸开始时间戳
    this.touchStartPos = { x: 0, y: 0 };  // 触摸开始位置

    // 点击判定阈值
    this.clickTimeThreshold = 300;   // 最大点击时长(ms)
    this.clickDistanceThreshold = 20; // 最大点击位移(px)

    console.log('触摸管理器初始化完成');
  }

  /**
   * 处理触摸开始事件
   * @param {TouchEvent} e - 微信触摸事件对象
   */
  handleTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;

    const touch = e.touches[0];

    // 将屏幕坐标转换为设计稿坐标
    const designX = this.adapter.toDesignX(touch.clientX);
    const designY = this.adapter.toDesignY(touch.clientY);

    // 记录触摸状态
    this.currentTouch = { x: designX, y: designY };
    this.touchStartTime = Date.now();
    this.touchStartPos = { x: designX, y: designY };
  }

  /**
   * 处理触摸移动事件
   * @param {TouchEvent} e - 微信触摸事件对象
   */
  handleTouchMove(e) {
    if (!e.touches || e.touches.length === 0) return;

    const touch = e.touches[0];

    // 更新当前触摸位置（设计稿坐标）
    this.currentTouch = {
      x: this.adapter.toDesignX(touch.clientX),
      y: this.adapter.toDesignY(touch.clientY)
    };
  }

  /**
   * 处理触摸结束事件 - 执行点击检测
   * @param {TouchEvent} e - 微信触摸事件对象
   */
  handleTouchEnd(e) {
    if (!this.currentTouch) return;

    const endPos = this.currentTouch;
    const duration = Date.now() - this.touchStartTime;

    // 计算触摸位移距离
    const distance = Math.sqrt(
      Math.pow(endPos.x - this.touchStartPos.x, 2) +
      Math.pow(endPos.y - this.touchStartPos.y, 2)
    );

    // 判定是否为有效点击（短时间 + 小位移）
    if (duration < this.clickTimeThreshold && distance < this.clickDistanceThreshold) {
      this._checkHit(endPos.x, endPos.y);
    }

    // 清除当前触摸状态
    this.currentTouch = null;
  }

  /**
   * 处理触摸取消事件
   * @param {TouchEvent} e - 微信触摸事件对象
   */
  handleTouchCancel(e) {
    // 取消触摸，清除状态
    this.currentTouch = null;
  }

  /**
   * 注册可点击区域（使用设计稿坐标）
   * @param {string} id - 区域唯一标识符
   * @param {number} x - 设计稿X坐标
   * @param {number} y - 设计稿Y坐标
   * @param {number} width - 区域宽度（设计稿尺寸）
   * @param {number} height - 区域高度（设计稿尺寸）
   * @param {Function} callback - 点击回调函数 callback(id, x, y)
   */
  registerArea(id, x, y, width, height, callback) {
    this.touchAreas.push({
      id: id,
      x: x,
      y: y,
      w: width,
      h: height,
      callback: callback
    });
  }

  /**
   * 清除所有已注册的点击区域
   */
  clearAreas() {
    this.touchAreas = [];
  }

  /**
   * 移除指定ID的点击区域
   * @param {string} id - 区域ID
   */
  removeArea(id) {
    this.touchAreas = this.touchAreas.filter(area => area.id !== id);
  }

  /**
   * 执行点击碰撞检测（内部方法）
   * @private
   * @param {number} x - 点击X坐标（设计稿坐标）
   * @param {number} y - 点击Y坐标（设计稿坐标）
   * @returns {boolean} 是否命中某个区域
   */
  _checkHit(x, y) {
    // 从后往前遍历（后注册的区域在上层，优先响应）
    for (let i = this.touchAreas.length - 1; i >= 0; i--) {
      const area = this.touchAreas[i];

      // 矩形碰撞检测
      if (x >= area.x && x <= area.x + area.w &&
          y >= area.y && y <= area.y + area.h) {

        // 命中，执行回调
        if (area.callback && typeof area.callback === 'function') {
          try {
            area.callback(area.id, x, y);
          } catch (e) {
            console.error(`点击回调执行错误 [${area.id}]:`, e);
          }
        }
        return true;
      }
    }

    return false;  // 未命中任何区域
  }

  /**
   * 获取当前触摸位置（设计稿坐标）
   * @returns {Object|null} 当前触摸位置 {x, y} 或 null
   */
  getCurrentTouch() {
    return this.currentTouch;
  }

  /**
   * 获取已注册的点击区域数量
   * @returns {number} 区域数量
   */
  getAreaCount() {
    return this.touchAreas.length;
  }

  /**
   * 设置点击判定阈值
   * @param {Object} thresholds - 阈值配置
   * @param {number} [thresholds.time=300] - 最大点击时长(ms)
   * @param {number} [thresholds.distance=20] - 最大点击位移(px)
   */
  setThresholds(thresholds) {
    if (thresholds.time !== undefined) {
      this.clickTimeThreshold = thresholds.time;
    }
    if (thresholds.distance !== undefined) {
      this.clickDistanceThreshold = thresholds.distance;
    }
  }
}

module.exports = TouchManager;
