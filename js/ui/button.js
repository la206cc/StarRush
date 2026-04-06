/**
 * 按钮组件 - Button
 * 支持三态(normal/pressed/disabled)、图标、渐变背景、发光边框
 * 适用于微信小游戏 Canvas 2D 绘制
 */
class Button {
  constructor(options) {
    Object.assign(this, {
      x: 0,
      y: 0,
      width: 200,
      height: 70,
      text: '按钮',
      fontSize: 28,
      bgColor: '#4fc3f7',
      textColor: '#ffffff',
      borderColor: '',
      borderRadius: 12,
      icon: '',
      iconPosition: 'left', // 'left' | 'top'
      disabled: false,
      onClick: null,
      pressed: false,
      alpha: 1,
      scale: 1,
      glowColor: '',        // 发光边框颜色，空字符串则不绘制
      gradientColors: null, // 渐变色数组 [color1, color2]，null则使用纯色
      shadow: false,        // 是否显示阴影
      fontBold: false       // 文字是否加粗
    }, options);

    // 动画相关
    this._targetScale = 1;
    this._glowPhase = 0;   // 发光动画相位
    this._pulseAlpha = 1;  // 脉冲透明度（用于提示动画）
    this._enablePulse = false;
  }

  /**
   * 绘制按钮
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
   */
  render(ctx) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();
    ctx.globalAlpha = this.alpha * this._pulseAlpha;

    // 应用缩放变换（以按钮中心为原点）
    ctx.translate(cx, cy);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-cx, -cy);

    const r = Math.max(0, this.borderRadius);

    // ---- 阴影层 ----
    if (this.shadow && !this.disabled) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      this._drawRoundRectPath(ctx, this.x, this.y + 2, this.width, this.height, r);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
      ctx.restore();
    }

    // ---- 发光边框效果（重要按钮）----
    if (this.glowColor && !this.disabled) {
      this._glowPhase += 0.05;
      const glowIntensity = 0.5 + 0.3 * Math.sin(this._glowPhase);
      ctx.save();
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 16 * glowIntensity;
      this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
      ctx.strokeStyle = this.glowColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // ---- 按钮背景 ----
    let bgColor = this.bgColor;
    if (this.disabled) {
      bgColor = 'rgba(100, 100, 120, 0.5)';
    } else if (this.pressed) {
      bgColor = this._darkenColor(this.bgColor, 30);
    }

    this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);

    // 渐变或纯色填充
    if (this.gradientColors && !this.disabled) {
      const grad = ctx.createLinearGradient(
        this.x, this.y, this.x, this.y + this.height
      );
      grad.addColorStop(0, this.gradientColors[0]);
      grad.addColorStop(1, this.gradientColors[1] || this.gradientColors[0]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fill();

    // 边框
    if (this.borderColor) {
      ctx.strokeStyle = this.disabled ? 'rgba(150,150,150,0.3)' : this.borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ---- 内容：图标 + 文字 ----
    let textColor = this.textColor;
    if (this.disabled) textColor = 'rgba(180, 180, 190, 0.6)';
    else if (this.pressed) textColor = this._lightenColor(textColor, 20);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (this.fontBold ? 'bold ' : '') + this.fontSize + 'px sans-serif';

    const contentCX = cx;
    const contentCY = cy;

    if (this.icon) {
      if (this.iconPosition === 'top') {
        // 图标在文字上方
        const iconSize = this.fontSize * 1.4;
        const iconY = contentCY - this.fontSize * 0.7;
        ctx.font = iconSize + 'px sans-serif';
        ctx.fillText(this.icon, contentCX, iconY);
        // 文字在下方
        ctx.font = (this.fontBold ? 'bold ' : '') + this.fontSize + 'px sans-serif';
        ctx.fillText(this.text, contentCX, iconY + iconSize * 0.85 + this.fontSize * 0.35);
      } else {
        // 图标在文字左侧（默认）
        const iconSize = this.fontSize * 1.2;
        const iconSpacing = 6;
        ctx.font = iconSize + 'px sans-serif';
        const iconW = ctx.measureText(this.icon).width;
        const textW = ctx.measureText(this.text).width;
        const totalW = iconW + iconSpacing + textW;
        const startX = contentCX - totalW / 2;

        ctx.fillText(this.icon, startX + iconW / 2, contentCY);
        ctx.font = (this.fontBold ? 'bold ' : '') + this.fontSize + 'px sans-serif';
        ctx.fillText(this.text, startX + iconW + iconSpacing + textW / 2, contentCY);
      }
    } else {
      ctx.fillText(this.text, contentCX, contentCY);
    }

    ctx.restore();

    // 更新脉冲动画
    if (this._enablePulse) {
      this._pulseAlpha = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 300));
    }
  }

  /**
   * 绘制圆角矩形路径
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
   * 颜色变暗
   */
  _darkenColor(hex, amount) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    let color = hex.replace('#', '');
    if (color.length === 3) {
      color = color[0]+color[0]+color[1]+color[1]+color[2]+color[2];
    }
    const num = parseInt(color, 16);
    let r = Math.max(0, (num >> 16) - amount);
    let g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    let b = Math.max(0, (num & 0x0000FF) - amount);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /**
   * 颜色变亮
   */
  _lightenColor(hex, amount) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    let color = hex.replace('#', '');
    if (color.length === 3) {
      color = color[0]+color[0]+color[1]+color[1]+color[2]+color[2];
    }
    const num = parseInt(color, 16);
    let r = Math.min(255, (num >> 16) + amount);
    let g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    let b = Math.min(255, (num & 0x0000FF) + amount);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /**
   * 检测点击命中
   */
  hitTest(px, py) {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  /**
   * 设置按下状态
   */
  setPressed(pressed) {
    if (this.disabled) return;
    this.pressed = pressed;
    this._targetScale = pressed ? 0.95 : 1;
  }

  /**
   * 触发点击回调
   */
  triggerClick() {
    if (!this.disabled && this.onClick) {
      this.onClick(this);
    }
  }

  /**
   * 启用脉冲提示动画（引导用户点击）
   */
  startPulse() {
    this._enablePulse = true;
    this._pulseAlpha = 1;
  }

  /**
   * 停止脉冲动画
   */
  stopPulse() {
    this._enablePulse = false;
    this._pulseAlpha = 1;
  }

  /**
   * 每帧更新（平滑缩放过渡）
   */
  update(dt) {
    // 平滑缩放插值
    const diff = this._targetScale - this.scale;
    if (Math.abs(diff) > 0.001) {
      this.scale += diff * 0.25;
    } else {
      this.scale = this._targetScale;
    }
  }
}

module.exports = Button;
