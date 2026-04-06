/**
 * 萌闯星际 (Star Rush) - 屏幕适配器
 * 负责将设计稿坐标（750x1334）转换为实际屏幕坐标
 * 支持不同屏幕尺寸的等比缩放和居中显示
 */

class ScreenAdapter {
  /**
   * 构造函数
   * @param {number} canvasWidth - Canvas实际宽度
   * @param {number} canvasHeight - Canvas实际高度
   */
  constructor(canvasWidth, canvasHeight) {
    // 设计稿基准尺寸（竖屏）
    this.designWidth = 750;
    this.designHeight = 1334;

    // 实际Canvas尺寸
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // 计算缩放比例（保持宽高比，取较小值确保内容完整显示）
    this.scaleX = canvasWidth / this.designWidth;
    this.scaleY = canvasHeight / this.designHeight;
    this.scale = Math.min(this.scaleX, this.scaleY);

    // 计算居中偏移量
    this.offsetX = (canvasWidth - this.designWidth * this.scale) / 2;
    this.offsetY = (canvasHeight - this.designHeight * this.scale) / 2;

    console.log(`屏幕适配器初始化: 设计稿${this.designWidth}x${this.designHeight}, ` +
                `实际${canvasWidth}x${canvasHeight}, 缩放比例=${this.scale.toFixed(3)}`);
  }

  /**
   * 将设计稿X坐标转换为实际屏幕坐标
   * @param {number} designX - 设计稿X坐标
   * @returns {number} 实际屏幕X坐标
   */
  toScreenX(designX) {
    return designX * this.scale + this.offsetX;
  }

  /**
   * 将设计稿Y坐标转换为实际屏幕坐标
   * @param {number} designY - 设计稿Y坐标
   * @returns {number} 实际屏幕Y坐标
   */
  toScreenY(designY) {
    return designY * this.scale + this.offsetY;
  }

  /**
   * 将设计稿矩形区域转换为实际屏幕矩形
   * @param {number} x - 设计稿X坐标
   * @param {number} y - 设计稿Y坐标
   * @param {number} width - 设计稿宽度
   * @param {number} height - 设计稿高度
   * @returns {Object} 实际屏幕矩形 {x, y, width, height}
   */
  toScreenRect(x, y, width, height) {
    return {
      x: this.toScreenX(x),
      y: this.toScreenY(y),
      width: width * this.scale,
      height: height * this.scale
    };
  }

  /**
   * 将实际触摸X坐标转换为设计稿坐标
   * @param {number} screenX - 实际屏幕X坐标
   * @returns {number} 设计稿X坐标
   */
  toDesignX(screenX) {
    return (screenX - this.offsetX) / this.scale;
  }

  /**
   * 将实际触摸Y坐标转换为设计稿坐标
   * @param {number} screenY - 实际屏幕Y坐标
   * @returns {number} 设计稿Y坐标
   */
  toDesignY(screenY) {
    return (screenY - this.offsetY) / this.scale;
  }

  /**
   * 缩放尺寸值
   * @param {number} size - 设计稿中的尺寸值
   * @returns {number} 缩放后的实际尺寸
   */
  scaleSize(size) {
    return size * this.scale;
  }

  /**
   * 获取当前缩放比例
   * @returns {number} 缩放比例
   */
  getScale() {
    return this.scale;
  }

  /**
   * 获取X轴偏移量
   * @returns {number} X偏移量
   */
  getOffsetX() {
    return this.offsetX;
  }

  /**
   * 获取Y轴偏移量
   * @returns {number} Y偏移量
   */
  getOffsetY() {
    return this.offsetY;
  }

  /**
   * 获取设计稿宽度
   * @returns {number} 设计稿宽度
   */
  getDesignWidth() {
    return this.designWidth;
  }

  /**
   * 获取设计稿高度
   * @returns {number} 设计稿高度
   */
  getDesignHeight() {
    return this.designHeight;
  }

  /**
   * 获取实际Canvas宽度
   * @returns {number} Canvas宽度
   */
  getCanvasWidth() {
    return this.canvasWidth;
  }

  /**
   * 获取实际Canvas高度
   * @returns {number} Canvas高度
   */
  getCanvasHeight() {
    return this.canvasHeight;
  }
}

module.exports = ScreenAdapter;
