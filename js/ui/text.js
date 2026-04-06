/**
 * 文字渲染工具类 - TextRenderer
 * 提供发光文字、描边文字、多行文字等高级文字绘制功能
 * 适用于微信小游戏 Canvas 2D 绘制
 */
class TextRenderer {

  /**
   * 默认选项
   */
  static get DEFAULT_OPTIONS() {
    return {
      fontSize: 28,
      color: '#ffffff',
      font: 'sans-serif',
      bold: false,
      align: 'left',     // 'left' | 'center' | 'right'
      baseline: 'top',   // 'top' | 'middle' | 'bottom' | 'alphabetic'
      alpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    };
  }

  /**
   * 合并选项
   */
  static _mergeOptions(options) {
    return Object.assign({}, this.DEFAULT_OPTIONS, options);
  }

  /**
   * 设置字体样式到 ctx
   */
  static _applyFont(ctx, options) {
    const parts = [];
    if (options.bold) parts.push('bold');
    parts.push(options.fontSize + 'px');
    parts.push(options.font);
    ctx.font = parts.join(' ');
  }

  /**
   * 绘制单行文字
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text - 文字内容
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {object} [options] - 可选配置
   */
  static drawText(ctx, text, x, y, options) {
    if (!text && text !== 0) return;
    text = String(text);

    const opt = this._mergeOptions(options);
    ctx.save();

    // 应用字体
    this._applyFont(ctx, opt);
    ctx.textAlign = opt.align;
    ctx.textBaseline = opt.baseline;
    ctx.globalAlpha = opt.alpha;

    // 阴影
    if (opt.shadowColor) {
      ctx.shadowColor = opt.shadowColor;
      ctx.shadowBlur = opt.shadowBlur;
      ctx.shadowOffsetX = opt.shadowOffsetX;
      ctx.shadowOffsetY = opt.shadowOffsetY;
    }

    ctx.fillStyle = opt.color;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  /**
   * 绘制多行文字（自动换行）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text - 文字内容
   * @param {number} x - 起始 X
   * @param {number} y - 起始 Y
   * @param {number} maxWidth - 最大宽度（超出自动换行）
   * @param {number} lineHeight - 行高
   * @param {object} [options] - 可选配置
   * @returns {{lines: number, totalHeight: number}} 绘制信息
   */
  static drawMultilineText(ctx, text, x, y, maxWidth, lineHeight, options) {
    if (!text && text !== 0) return { lines: 0, totalHeight: 0 };
    text = String(text);

    const opt = this._mergeOptions(options);
    ctx.save();
    this._applyFont(ctx, opt);
    ctx.textAlign = opt.align || 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = opt.alpha;

    // 阴影
    if (opt.shadowColor) {
      ctx.shadowColor = opt.shadowColor;
      ctx.shadowBlur = opt.shadowBlur;
      ctx.shadowOffsetX = opt.shadowOffsetX;
      ctx.shadowOffsetY = opt.shadowOffsetY;
    }
    ctx.fillStyle = opt.color;

    // 逐字符分行
    const lines = this._wrapText(ctx, text, maxWidth);
    let currentY = y;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let drawX = x;

      // 根据对齐方式调整 x
      if (opt.align === 'center') {
        drawX = x + maxWidth / 2;
      } else if (opt.align === 'right') {
        drawX = x + maxWidth;
      }

      ctx.fillText(line, drawX, currentY);
      currentY += lineHeight;
    }

    ctx.restore();

    return {
      lines: lines.length,
      totalHeight: lines.length > 0 ? (lines.length - 1) * lineHeight + opt.fontSize : 0
    };
  }

  /**
   * 文字换行处理
   * @private
   */
  static _wrapText(ctx, text, maxWidth) {
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (char === '\n') {
        // 强制换行符
        lines.push(currentLine);
        currentLine = '';
      } else if (metrics.width > maxWidth && currentLine.length > 0) {
        // 超宽，当前行已满，开始新行
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * 绘制发光文字（霓虹效果，多层 text-shadow 实现）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text - 文字内容
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {string} color - 主文字颜色
   * @param {string} glowColor - 发光颜色
   * @param {object} [options] - 其他配置（fontSize, bold 等）
   */
  static drawGlowText(ctx, text, x, y, color, glowColor, options) {
    if (!text && text !== 0) return;
    text = String(text);

    const opt = this._mergeOptions(options);
    const fontSize = opt.fontSize || 28;

    ctx.save();
    this._applyFont(ctx, opt);
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = opt.baseline || 'middle';
    ctx.globalAlpha = opt.alpha;

    // 多层发光效果：由外到内绘制多层模糊
    const glowLayers = [
      { blur: 20, alpha: 0.15 },
      { blur: 14, alpha: 0.25 },
      { blur: 8,  alpha: 0.4 },
      { blur: 4,  alpha: 0.6 },
      { blur: 1,  alpha: 0.8 },
    ];

    for (const layer of glowLayers) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = layer.blur;
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = layer.alpha * opt.alpha;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    // 核心高亮层
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 2;
    ctx.fillStyle = color || '#ffffff';
    ctx.globalAlpha = opt.alpha;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  /**
   * 绘制描边文字（用于深色背景下需要清晰显示的文字）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text - 文字内容
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {string} fillColor - 填充颜色
   * @param {string} outlineColor - 描边颜色
   * @param {number} [outlineWidth=2] - 描边宽度
   * @param {object} [options] - 其他配置
   */
  static drawOutlineText(ctx, text, x, y, fillColor, outlineColor, outlineWidth, options) {
    if (!text && text !== 0) return;
    text = String(text);

    const opt = this._mergeOptions(options);
    const ow = outlineWidth !== undefined ? outlineWidth : 2;

    ctx.save();
    this._applyFont(ctx, opt);
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = opt.baseline || 'middle';
    ctx.globalAlpha = opt.alpha;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // 8方向描边
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = ow * 2;
    ctx.strokeText(text, x, y);

    // 内部填充
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  /**
   * 测量文字宽度
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} [fontSize=28]
   * @param {boolean} [bold=false]
   * @returns {number} 文字宽度
   */
  static measureText(ctx, text, fontSize, bold) {
    if (!text) return 0;
    text = String(text);
    fontSize = fontSize || 28;
    const parts = [];
    if (bold) parts.push('bold');
    parts.push(fontSize + 'px sans-serif');

    ctx.save();
    ctx.font = parts.join(' ');
    const w = ctx.measureText(text).width;
    ctx.restore();
    return w;
  }

  /**
   * 测量多行文字的尺寸
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} maxWidth
   * @param {number} fontSize
   * @param {number} lineHeight
   * @param {boolean} bold
   * @returns {{width: number, height: number, lineCount: number}}
   */
  static measureMultilineText(ctx, text, maxWidth, fontSize, lineHeight, bold) {
    if (!text) return { width: 0, height: 0, lineCount: 0 };
    text = String(text);
    fontSize = fontSize || 28;
    lineHeight = lineHeight || fontSize * 1.5;

    const parts = [];
    if (bold) parts.push('bold');
    parts.push(fontSize + 'px sans-serif');

    ctx.save();
    ctx.font = parts.join(' ');
    const lines = this._wrapText(ctx, text, maxWidth);

    let maxW = 0;
    for (const line of lines) {
      const lw = ctx.measureText(line).width;
      if (lw > maxW) maxW = lw;
    }

    ctx.restore();

    return {
      width: maxW,
      height: lines.length > 0 ? (lines.length - 1) * lineHeight + fontSize : 0,
      lineCount: lines.length
    };
  }

  /**
   * 绘制带数字变化的文字（如金币增加时飘字效果）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} prefix - 前缀（如 '+'）
   * @param {number} value - 数值
   * @param {number} x
   * @param {number} y
   * @param {object} options
   */
  static drawValueText(ctx, prefix, value, x, y, options) {
    const opt = this._mergeOptions(options);
    const displayValue = this._formatNumber(value);
    const fullText = prefix + displayValue;

    ctx.save();
    this._applyFont(ctx, opt);
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = opt.baseline || 'middle';
    ctx.globalAlpha = opt.alpha;

    // 分别绘制前缀和数值（可以不同颜色）
    const prefixW = ctx.measureText(prefix).width;
    const valueW = ctx.measureText(displayValue).width;
    const totalW = prefixW + valueW;

    let startX = x;
    if (opt.align === 'center') {
      startX = x - totalW / 2;
    } else if (opt.align === 'right') {
      startX = x - totalW;
    }

    // 前缀颜色
    ctx.fillStyle = opt.prefixColor || opt.color;
    ctx.fillText(prefix, startX + prefixW / 2, y);

    // 数值颜色
    ctx.fillStyle = opt.color;
    ctx.fillText(displayValue, startX + prefixW + valueW / 2, y);

    ctx.restore();
  }

  /**
   * 格式化大数字（K/M 简写）
   * @param {number} num
   * @returns {string}
   */
  static _formatNumber(num) {
    if (num === undefined || num === null) return '0';
    num = Math.floor(num);
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(num) >= 10000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return String(num);
  }

  /**
   * 公开格式化方法供外部使用
   */
  static formatNumber(num) {
    return this._formatNumber(num);
  }
}

module.exports = TextRenderer;
