/**
 * 稀有度颜色映射
 */
const RARITY_COLORS = {
  N: '#9e9e9e',      // 普通 - 灰
  R: '#4fc3f7',      // 稀有 - 蓝
  SR: '#7c4dff',     // 史诗 - 紫
  SSR: '#ff9800',    // 传说 - 金/橙
  MYTHIC: '#ff4081'  // 神话 - 粉
};

/**
 * 稀有度名称映射
 */
const RARITY_NAMES = {
  N: '普通',
  R: '稀有',
  SR: '史诗',
  SSR: '传说',
  MYTHIC: '神话'
};

/**
 * 卡片基础类 - Card
 * 根据稀有度显示不同颜色边框和光效
 * SSR/MYTHIC 有呼吸动画光效
 * 布局：顶部头像区 + 中间信息区 + 底部标签区
 * 适用于微信小游戏 Canvas 2D 绘制
 */
class Card {
  constructor(options) {
    Object.assign(this, {
      x: 0,
      y: 0,
      width: 320,
      height: 400,
      rarity: 'N',
      title: '',
      subtitle: '',
      icon: '',           // emoji 图标
      avatar: '',         // 头像标识（可以是图片路径或文字）
      selected: false,
      alpha: 1,
      scale: 1,
      // 圆角半径
      borderRadius: 12,
      // 背景色
      bgColor: 'rgba(20, 20, 45, 0.85)',
      // 是否显示稀有度角标
      showRarityBadge: true,
      // 点击回调
      onClick: null,
      // 自定义内容绘制回调（可选，用于在卡片内部绘制自定义内容）
      onRenderContent: null
    }, options);

    // 内部动画状态
    this._breathPhase = Math.random() * Math.PI * 2; // 随机初始相位避免同步
    this._targetScale = 1;
    this._pressAnim = 0;       // 按下动画进度

    // 区域缓存
    this._avatarRegion = null;
    this._badgeRegion = null;
  }

  /**
   * 获取当前稀有度对应的颜色
   */
  get rarityColor() {
    return RARITY_COLORS[this.rarity] || RARITY_COLORS.N;
  }

  /**
   * 获取当前稀有度名称
   */
  get rarityName() {
    return RARITY_NAMES[this.rarity] || '';
  }

  /**
   * 判断是否为高级稀有度（有呼吸动画）
   */
  get isPremium() {
    return this.rarity === 'SSR' || this.rarity === 'MYTHIC';
  }

  /**
   * 绘制卡片
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // 应用缩放变换
    ctx.translate(cx, cy);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-cx, -cy);

    const r = Math.max(0, Math.min(this.borderRadius, this.width / 2, this.height / 2));
    const rc = this.rarityColor;

    // ---- 外发光效果（高级卡片）----
    if (this.isPremium) {
      this._breathPhase += 0.04;
      const breathIntensity = 0.4 + 0.35 * Math.sin(this._breathPhase);

      ctx.save();
      ctx.shadowColor = rc;
      ctx.shadowBlur = 25 * breathIntensity;
      ctx.globalAlpha = breathIntensity * 0.5 * this.alpha;
      this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
      ctx.strokeStyle = rc;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // 额外的环境光晕
      if (breathIntensity > 0.6) {
        ctx.save();
        ctx.globalAlpha = (breathIntensity - 0.6) * 0.15 * this.alpha;
        ctx.shadowColor = rc;
        ctx.shadowBlur = 50;
        ctx.fillStyle = rc;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      }
    }

    // ---- 卡片背景 ----
    this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
    ctx.fillStyle = this.bgColor;
    ctx.fill();

    // ---- 边框（根据稀有度着色）----
    if (!this.isPremium) {
      // 普通卡片静态边框
      ctx.strokeStyle = rc;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 * this.alpha;
      ctx.stroke();
      ctx.globalAlpha = this.alpha;
    } else {
      // 高级卡片动态边框
      const breathAlpha = 0.5 + 0.4 * Math.sin(this._breathPhase);
      ctx.strokeStyle = rc;
      ctx.lineWidth = 2;
      ctx.globalAlpha = breathAlpha * this.alpha;
      ctx.stroke();
      ctx.globalAlpha = this.alpha;
    }

    // ---- 选中高亮效果 ----
    if (this.selected) {
      ctx.save();
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 16;
      this._drawRoundRectPath(ctx, this.x - 2, this.y - 2, this.width + 4, this.height + 4, r + 2);
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8 * this.alpha;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = this.alpha;
    }

    // ---- 内部布局绘制 ----
    this._renderLayout(ctx, r);

    ctx.restore();
  }

  /**
   * 渲染卡片内部布局
   * @private
   */
  _renderLayout(ctx, borderRadius) {
    const pad = 12; // 内边距

    // 头像区域高度（约占卡片的 45%）
    const avatarAreaH = this.height * 0.45;
    const avatarY = this.y + pad;
    const avatarH = avatarAreaH - pad;
    const avatarX = this.x + pad;
    const avatarW = this.width - pad * 2;

    // 缓存头像区域
    this._avatarRegion = { x: avatarX, y: avatarY, w: avatarW, h: avatarH };

    // ---- 头像区域背景 ----
    const avatarR = Math.max(0, Math.min(borderRadius - 2, 8));
    this._drawRoundRectPath(ctx, avatarX, avatarY, avatarW, avatarH, avatarR);

    // 头像背景使用稀有度色的半透明版本
    const rc = this.rarityColor;
    ctx.fillStyle = this._hexToRgba(rc, 0.12);
    ctx.fill();

    // 头像区域底部微弱分割线
    ctx.beginPath();
    ctx.moveTo(avatarX + avatarR, avatarY + avatarH);
    ctx.lineTo(avatarX + avatarW - avatarR, avatarY + avatarH);
    ctx.strokeStyle = this._hexToRgba(rc, 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();

    // ---- 头像/图标内容 ----
    if (this.avatar || this.icon) {
      const displayIcon = this.avatar || this.icon;
      ctx.font = Math.floor(avatarW * 0.45) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rc;
      ctx.globalAlpha = 0.85 * this.alpha;
      ctx.fillText(displayIcon, avatarX + avatarW / 2, avatarY + avatarH / 2);
      ctx.globalAlpha = this.alpha;
    }

    // ---- 信息区域 ----
    const infoY = avatarY + avatarH + 8;
    const infoH = this.height - avatarAreaH - pad * 2 - 8;

    // 标题
    if (this.title) {
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = this.alpha;

      // 标题过长时截断
      let displayTitle = this.title;
      const maxTitleW = avatarW - 10;
      while (ctx.measureText(displayTitle).width > maxTitleW && displayTitle.length > 1) {
        displayTitle = displayTitle.slice(0, -1);
      }
      if (displayTitle !== this.title) displayTitle += '..';

      ctx.fillText(displayTitle, this.x + this.width / 2, infoY + 4);
    }

    // 副标题
    if (this.subtitle) {
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8892b0';
      ctx.globalAlpha = 0.8 * this.alpha;
      ctx.fillText(
        this.subtitle,
        this.x + this.width / 2,
        infoY + (this.title ? 36 : 4)
      );
      ctx.globalAlpha = this.alpha;
    }

    // ---- 底部标签区（稀有度标签）----
    if (this.showRarityBadge) {
      const badgeText = this.rarityName || this.rarity;
      const badgeFontSize = 18;
      ctx.font = 'bold ' + badgeFontSize + 'px sans-serif';
      const badgeW = ctx.measureText(badgeText).width + 16;
      const badgeH = 26;
      const badgeX = this.x + (this.width - badgeW) / 2;
      const badgeY = this.y + this.height - badgeH - 8;

      // 缓存徽章区域
      this._badgeRegion = { x: badgeX, y: badgeY, w: badgeW, h: badgeH };

      // 徽章背景
      const br = badgeH / 2;
      this._drawRoundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, br);
      ctx.fillStyle = this._hexToRgba(rc, 0.3);
      ctx.fill();
      ctx.strokeStyle = rc;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7 * this.alpha;
      ctx.stroke();
      ctx.globalAlpha = this.alpha;

      // 徽章文字
      ctx.font = 'bold ' + badgeFontSize + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rc;
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    }

    // ---- 自定义内容渲染回调 ----
    if (typeof this.onRenderContent === 'function') {
      this.onRenderContent(ctx, this);
    }
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
   * HEX 转 RGBA 字符串
   * @private
   */
  _hexToRgba(hex, alpha) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    let color = hex.replace('#', '');
    if (color.length === 3) {
      color = color[0]+color[0]+color[1]+color[1]+color[2]+color[2];
    }
    const num = parseInt(color, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /**
   * 检测点击命中
   */
  hitTest(px, py) {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  /**
   * 设置选中状态
   */
  setSelected(selected) {
    this.selected = selected;
    this._targetScale = selected ? 1.05 : 1;
  }

  /**
   * 触发点击
   */
  triggerClick() {
    if (this.onClick) {
      this.onClick(this);
    }
  }

  /**
   * 设置按下动画
   */
  setPressed(pressed) {
    this._pressAnim = pressed ? 1 : 0;
    this._targetScale = pressed ? 0.96 : (this.selected ? 1.05 : 1);
  }

  /**
   * 每帧更新
   * @param {number} dt - 帧间隔时间（毫秒）
   */
  update(dt) {
    // 平滑缩放插值
    const diff = this._targetScale - this.scale;
    if (Math.abs(diff) > 0.001) {
      this.scale += diff * 0.18;
    } else {
      this.scale = this._targetScale;
    }
  }
}

// 导出常量供外部使用
Card.RARITY_COLORS = RARITY_COLORS;
Card.RARITY_NAMES = RARITY_NAMES;

module.exports = Card;
