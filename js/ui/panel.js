/**
 * 面板/弹窗组件 - Panel
 * 支持遮罩层、半透明圆角面板、标题栏、关闭按钮
 * 支持弹出/收起动画（缩放+淡入淡出）
 * 适用于微信小游戏 Canvas 2D 绘制
 */
class Panel {
  constructor(options) {
    Object.assign(this, {
      x: 56,
      y: 200,
      width: 638,
      height: 800,
      title: '',
      closable: true,
      titleBgColor: 'rgba(79, 195, 247, 0.15)',
      contentPadding: 30,
      showMask: true,
      maskAlpha: 0.6,
      visible: false,
      animProgress: 0,
      // 关闭按钮回调
      onClose: null,
      // 标题文字大小
      titleFontSize: 32,
      // 面板边框颜色
      borderColor: 'rgba(79, 195, 247, 0.35)',
      // 面板背景色
      bgColor: 'rgba(20, 20, 45, 0.92)',
      // 圆角半径
      borderRadius: 16,
      // 动画速度（越小越快）
      animSpeed: 0.12
    }, options);

    // 内部状态
    this._showing = false;       // 正在执行显示动画
    this._hiding = false;       // 正在执行隐藏动画
    this._closeBtnRegion = null; // 关闭按钮区域缓存

    // 内容区域（供外部绘制内容用）
    this.contentX = this.x + this.contentPadding;
    this.contentY = this.y + (this.title ? 80 : this.contentPadding);
    this.contentWidth = this.width - this.contentPadding * 2;
    this.contentHeight = this.height - (this.title ? 80 : 0) - this.contentPadding * 2;

    this._updateContentRegion();
  }

  /**
   * 更新内容区域坐标
   */
  _updateContentRegion() {
    const titleH = this.title ? 70 : 0;
    this.contentX = this.x + this.contentPadding;
    this.contentY = this.y + titleH + this.contentPadding;
    this.contentWidth = this.width - this.contentPadding * 2;
    this.contentHeight = this.height - titleH - this.contentPadding * 2;
  }

  /**
   * 绘制面板
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.visible && this.animProgress <= 0) return;

    ctx.save();

    // ---- 遮罩层 ----
    if (this.showMask && this.animProgress > 0) {
      ctx.globalAlpha = this.maskAlpha * Math.min(1, this.animProgress);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 750, 1334); // 基于设计稿全屏尺寸
    }

    // 计算动画插值：从 0 -> 1 显示，1 -> 0 隐藏
    let t = this._hiding ? (1 - this.animProgress) : this.animProgress;
    t = this._easeOutBack(t);

    // 面板中心点
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // 应用动画变换
    ctx.translate(cx, cy);
    ctx.scale(t, t);
    ctx.globalAlpha *= Math.min(1, this.animProgress);
    ctx.translate(-cx, -cy);

    const r = Math.max(0, this.borderRadius);

    // ---- 外发光效果 ----
    ctx.save();
    ctx.shadowColor = 'rgba(79, 195, 247, 0.25)';
    ctx.shadowBlur = 30;
    this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
    ctx.fillStyle = this.bgColor;
    ctx.fill();
    ctx.restore();

    // ---- 面板主体 ----
    this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
    ctx.fillStyle = this.bgColor;
    ctx.fill();

    // 边框
    if (this.borderColor) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ---- 标题栏区域 ----
    if (this.title) {
      const titleY = this.y;
      const titleH = 70;

      // 标题背景
      this._drawRoundRectTopPath(ctx, this.x, titleY, this.width, titleH, r);
      ctx.fillStyle = this.titleBgColor;
      ctx.fill();

      // 标题底部分割线
      ctx.beginPath();
      ctx.moveTo(this.x + r, titleY + titleH);
      ctx.lineTo(this.x + this.width - r, titleY + titleH);
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 标题文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + this.titleFontSize + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.title, cx, titleY + titleH / 2);

      // ---- 关闭按钮 X ----
      if (this.closable) {
        const btnSize = 36;
        const btnX = this.x + this.width - btnSize - 10;
        const btnY = titleY + (titleH - btnSize) / 2;

        // 缓存关闭按钮区域用于 hitTest
        this._closeBtnRegion = { x: btnX, y: btnY, w: btnSize, h: btnSize };

        // 关闭按钮背景（圆形半透明）
        ctx.beginPath();
        ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 82, 82, 0.25)';
        ctx.fill();

        // X 图标
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        const c = { x: btnX + btnSize / 2, y: btnY + btnSize / 2 };
        const offset = 8;
        ctx.beginPath();
        ctx.moveTo(c.x - offset, c.y - offset);
        ctx.lineTo(c.x + offset, c.y + offset);
        ctx.moveTo(c.x + offset, c.y - offset);
        ctx.lineTo(c.x - offset, c.y + offset);
        ctx.stroke();
      } else {
        this._closeBtnRegion = null;
      }
    }

    ctx.restore();
  }

  /**
   * 绘制完整圆角矩形路径
   */
  _drawRoundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * 仅顶部圆角矩形路径（用于标题栏）
   */
  _drawRoundRectTopPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * 缓动函数 - 弹性缓出
   */
  _easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    // 确保不会超出范围太多
    t = Math.max(0, Math.min(1, t));
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /**
   * 显示面板
   */
  show() {
    this.visible = true;
    this._showing = true;
    this._hiding = false;
    this.animProgress = 0.01;
    this._updateContentRegion();
  }

  /**
   * 隐藏面板
   */
  hide() {
    this._hiding = true;
    this._showing = false;
  }

  /**
   * 是否可见
   */
  isVisible() {
    return this.visible || this.animProgress > 0;
  }

  /**
   * 检测关闭按钮点击
   */
  hitTestClose(px, py) {
    if (!this.closable || !this._closeBtnRegion) return false;
    const b = this._closeBtnRegion;
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  /**
   * 处理点击事件（返回是否命中了关闭按钮）
   */
  handleClick(px, py) {
    if (!this.isVisible()) return false;
    if (this.hitTestClose(px, py)) {
      this.hide();
      if (this.onClose) this.onClose();
      return true;
    }
    // 点击了面板内容区（但不包括关闭按钮）
    if (px >= this.x && px <= this.x + this.width &&
        py >= this.y && py <= this.y + this.height) {
      return true; // 命中面板区域
    }
    return false;
  }

  /**
   * 每帧更新动画进度
   * @param {number} dt - 帧间隔时间（毫秒）
   */
  update(dt) {
    if (this._showing) {
      this.animProgress += this.animSpeed;
      if (this.animProgress >= 1) {
        this.animProgress = 1;
        this._showing = false;
      }
    } else if (this._hiding) {
      this.animProgress -= this.animSpeed;
      if (this.animProgress <= 0) {
        this.animProgress = 0;
        this._hiding = false;
        this.visible = false;
      }
    }
  }

  /**
   * 获取内容绘制区域信息
   * @returns {{x, y, width, height}}
   */
  getContentRegion() {
    return {
      x: this.contentX,
      y: this.contentY,
      width: this.contentWidth,
      height: this.contentHeight
    };
  }
}

module.exports = Panel;
