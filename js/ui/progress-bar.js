/**
 * 进度条组件 - ProgressBar
 * 支持圆角、渐变填充、HP变色、数值文字、动画过渡
 * 适用于微信小游戏 Canvas 2D 绘制
 */
class ProgressBar {
  constructor(options) {
    Object.assign(this, {
      x: 0,
      y: 0,
      width: 400,
      height: 20,
      value: 50,
      maxValue: 100,
      bgColor: 'rgba(255, 255, 255, 0.1)',
      fillColor: '#4fc3f7',
      borderColor: '',
      borderRadius: 10,
      showText: true,
      textSize: 18,
      animated: true,
      displayValue: 50,
      animSpeed: 0.12,
      // HP 模式：根据百分比自动变色（红->橙->绿）
      hpMode: false,
      // 渐变色模式：使用自定义渐变
      gradientColors: null, // [colorStart, colorEnd]
      // 文字位置: 'inside' | 'outside' | 'none'
      textPosition: 'inside',
      // 文字颜色
      textColor: '#ffffff',
      // 是否显示外发光效果
      glow: false,
      // 动画脉冲提示（用于低血量警告等）
      warningPulse: false,
      // 警告阈值（低于此值时触发警告）
      warnThreshold: 30
    }, options);

    // 初始化 displayValue 与 value 同步
    this.displayValue = this.value;

    // 内部状态
    this._pulsePhase = 0;
    this._flashAlpha = 0;     // 受伤闪烁用
  }

  /**
   * 绘制进度条
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const ratio = Math.max(0, Math.min(1, this.displayValue / this.maxValue));
    const fillWidth = Math.max(0, (this.width - 2) * ratio); // 留 1px 内边距
    const r = Math.max(0, Math.min(this.borderRadius, this.height / 2));

    ctx.save();

    // ---- 背景条 ----
    this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
    ctx.fillStyle = this.bgColor;
    ctx.fill();

    // 背景边框
    if (this.borderColor) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- 填充条 ----
    if (fillWidth > 0) {
      let fillColor = this.fillColor;

      // HP 模式：根据血量百分比自动变色
      if (this.hpMode) {
        fillColor = this._getHPColor(ratio);
      }

      // 裁剪填充区域到圆角矩形内
      ctx.save();
      this._drawRoundRectPath(ctx, this.x + 1, this.y + 1, fillWidth, this.height - 2, r);
      ctx.clip();

      // 渐变或纯色填充
      if (this.gradientColors && !this.hpMode) {
        const grad = ctx.createLinearGradient(
          this.x, this.y, this.x + this.width, this.y
        );
        grad.addColorStop(0, this.gradientColors[0]);
        grad.addColorStop(1, this.gradientColors[1] || this.gradientColors[0]);
        ctx.fillStyle = grad;
      } else if (this.hpMode) {
        // HP 模式使用渐变增强视觉效果
        const colors = this._getHPGradientColors(ratio);
        const grad = ctx.createLinearGradient(
          this.x, this.y, this.x + this.width, this.y
        );
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1] || colors[0]);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = fillColor;
      }

      ctx.fillRect(this.x + 1, this.y + 1, fillWidth, this.height - 2);

      // 填充区域高光（顶部微亮）
      const highlightGrad = ctx.createLinearGradient(
        this.x, this.y, this.x, this.y + this.height * 0.5
      );
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = highlightGrad;
      ctx.fillRect(this.x + 1, this.y + 1, fillWidth, this.height * 0.45);

      ctx.restore(); // 恢复裁剪

      // 发光效果
      if (this.glow && ratio > 0.05) {
        ctx.save();
        ctx.shadowColor = fillColor;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.4;
        this._drawRoundRectPath(ctx, this.x + 1, this.y + 1, fillWidth, this.height - 2, r);
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ---- 数值文字 ----
    if (this.showText && this.textPosition !== 'none') {
      const textX = this.x + this.width / 2;
      const textY = this.y + this.height / 2;

      ctx.font = 'bold ' + this.textSize + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const valStr = Math.floor(this.displayValue) + '/' + this.maxValue;
      const percentStr = Math.floor(ratio * 100) + '%';

      // 根据文字位置决定绘制方式
      if (this.textPosition === 'inside') {
        // 文字在进度条内部
        // 使用描边确保可见性
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(percentStr, textX, textY);

        ctx.fillStyle = this.textColor || '#ffffff';
        ctx.fillText(percentStr, textX, textY);
      } else if (this.textPosition === 'outside') {
        // 文字在进度条右侧或上方
        ctx.fillStyle = this.textColor || '#ffffff';
        ctx.fillText(valStr, textX, this.y - this.textSize * 0.6);
      }
    }

    // ---- 脉冲警告效果 ----
    if (this.warningPulse && ratio < this.warnThreshold / 100 && ratio > 0) {
      this._pulsePhase += 0.08;
      const pulseAlpha = 0.15 + 0.15 * Math.sin(this._pulsePhase);
      ctx.save();
      ctx.globalAlpha = pulseAlpha;
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 16;
      this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else {
      this._pulsePhase = 0;
    }

    ctx.restore();
  }

  /**
   * HP 模式颜色计算
   * 血量高 -> 绿，中 -> 橙，低 -> 红
   * @private
   */
  _getHPColor(ratio) {
    if (ratio > 0.6) return '#69f0ae';     // 绿色 - 健康
    if (ratio > 0.3) return '#ffd740';     // 橙色 - 注意
    return '#ff5252';                       // 红色 - 危险
  }

  /**
   * HP 模式渐变色
   * @private
   */
  _getHPGradientColors(ratio) {
    if (ratio > 0.6) return ['#69f0ae', '#4caf50'];
    if (ratio > 0.3) return ['#ffd740', '#ff9800'];
    return ['#ff5252', '#e53935'];
  }

  /**
   * 绘制圆角矩形路径
   * @private
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
   * 设置当前值
   * @param {number} val - 新值
   * @param {boolean} [immediate=false] - 是否立即生效（跳过动画）
   */
  setValue(val, immediate) {
    this.value = Math.max(0, Math.min(val, this.maxValue));
    if (immediate || !this.animated) {
      this.displayValue = this.value;
    }
  }

  /**
   * 设置最大值
   * @param {number} maxVal
   */
  setMaxValue(maxVal) {
    this.maxValue = Math.max(1, maxVal);
    if (this.value > this.maxValue) {
      this.value = this.maxValue;
    }
  }

  /**
   * 设置百分比（0-100）
   * @param {number} percent
   */
  setPercent(percent) {
    this.setValue((percent / 100) * this.maxValue);
  }

  /**
   * 触发受伤闪烁效果
   */
  flashDamage() {
    this._flashAlpha = 1;
  }

  /**
   * 每帧更新（平滑动画过渡）
   * @param {number} dt - 帧间隔时间（毫秒）
   */
  update(dt) {
    if (!this.animated) return;

    // 平滑插值更新 displayValue
    const diff = this.value - this.displayValue;
    if (Math.abs(diff) > 0.01) {
      this.displayValue += diff * this.animSpeed;
      // 收敛到目标值附近时直接设为目标值
      if (Math.abs(this.value - this.displayValue) < 0.5) {
        this.displayValue = this.value;
      }
    } else {
      this.displayValue = this.value;
    }

    // 闪烁衰减
    if (this._flashAlpha > 0) {
      this._flashAlpha -= dt * 0.005;
      if (this._flashAlpha < 0) this._flashAlpha = 0;
    }
  }

  /**
   * 获取当前百分比
   * @returns {number} 0-100
   */
  getPercent() {
    return (this.displayValue / this.maxValue) * 100;
  }

  /**
   * 是否已满
   */
  isFull() {
    return this.displayValue >= this.maxValue;
  }

  /**
   * 是否为空
   */
  isEmpty() {
    return this.displayValue <= 0;
  }
}

module.exports = ProgressBar;
