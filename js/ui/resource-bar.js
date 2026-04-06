/**
 * 四资源显示栏 - ResourceBar
 * 显示四种游戏资源：水晶(crystal)、精华(essence)、星能(starEnergy)、星币(starCoin)
 * 半透明深色背景横条，每种资源均分宽度
 * 图片图标 + 数字（大数字用 K/M 简写）
 * 资源变化时支持脉冲动画提示
 * 适用于微信小游戏 Canvas 2D 绘制
 */
class ResourceBar {
  constructor(options) {
    Object.assign(this, {
      x: 0,
      y: 0,
      width: 750,
      height: 60,
      resources: {
        crystal: 0,       // 晶矿
        essence: 0,       // 源质
        starEnergy: 0,    // 星能
        starCoin: 0       // 星际币
      },
      padding: 16,
      // 视觉配置
      bgColor: 'rgba(15, 15, 35, 0.85)',
      borderColor: 'rgba(79, 195, 247, 0.15)',
      textColor: '#ffffff',
      iconColor: '#ffffff',
      fontSize: 22,
      iconSize: 26,
      // 分割线颜色
      dividerColor: 'rgba(255, 255, 255, 0.08)',
      // 各资源的图标和颜色配置
      resourceConfig: {
        crystal:   { icon: null, color: '#4fc3f7', label: '', iconPath: 'images/icon_res_jingkuang.png' },    // 晶矿
        essence:   { icon: null, color: '#d500f9', label: '', iconPath: 'images/icon_res_yuanzhi.png' },     // 源质
        starEnergy:{ icon: null, color: '#ffd700', label: '', iconPath: 'images/icon_res_xingneng.png' },    // 星能
        starCoin:  { icon: null, color: '#ff9800', label: '', iconPath: 'images/icon_res_xingjibi.png' }     // 星际币
      },
      // 资源管理器引用（用于加载图片）
      resourceManager: null
    }, options);

    // 内部动画状态：每个资源一个脉冲状态
    this._pulseState = {};
    const keys = Object.keys(this.resources);
    for (let i = 0; i < keys.length; i++) {
      this._pulseState[keys[i]] = { active: false, phase: 0 };
    }

    // 上一次的资源值（用于检测变化）
    this._prevResources = Object.assign({}, this.resources);
    
    // 加载资源图标
    this._loadIcons();
  }
  
  /**
   * 加载资源图标
   * @private
   */
  _loadIcons() {
    if (!this.resourceManager) return;
    
    const keys = Object.keys(this.resourceConfig);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const config = this.resourceConfig[key];
      if (config.iconPath) {
        this.resourceManager.loadImage(config.iconPath).then((img) => {
          config.icon = img;
        }).catch((err) => {
          console.warn('资源图标加载失败:', config.iconPath, err);
        });
      }
    }
  }
  
  /**
   * 设置资源管理器
   * @param {ResourceManager} resourceManager
   */
  setResourceManager(resourceManager) {
    this.resourceManager = resourceManager;
    this._loadIcons();
  }

  /**
   * 格式化数字（K/M 简写）
   * @private
   */
  _formatValue(val) {
    if (val === undefined || val === null) return '0';
    val = Math.floor(val);
    if (val >= 10000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 10000) return (val / 1000).toFixed(1) + 'K';
    return String(val);
  }

  /**
   * 设置资源值
   * @param {object} res - {crystal, essence, starEnergy, starCoin}
   * @param {boolean} [animate=false] - 是否播放脉冲动画
   */
  setResources(res, animate) {
    if (!res) return;

    // 检测哪些资源发生了增加（用于触发脉冲）
    if (animate) {
      const keys = Object.keys(res);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (res[key] > (this._prevResources[key] || 0)) {
          this._startPulse(key);
        }
      }
    }

    Object.assign(this.resources, res);
    this._prevResources = Object.assign({}, this.resources);
  }

  /**
   * 设置单个资源值
   * @param {string} key - 资源键名
   * @param {number} value - 新值
   * @param {boolean} [animate=false]
   */
  setResource(key, value, animate) {
    if (!(key in this.resources)) return;
    if (animate && value > this.resources[key]) {
      this._startPulse(key);
    }
    this.resources[key] = value;
    this._prevResources[key] = value;
  }

  /**
   * 增加单个资源
   * @param {string} key
   * @param {number} amount
   */
  addResource(key, amount) {
    if (!(key in this.resources)) return;
    this.resources[key] += amount;
    this._startPulse(key);
  }

  /**
   * 启动脉冲动画
   * @private
   */
  _startPulse(key) {
    if (this._pulseState[key]) {
      this._pulseState[key].active = true;
      this._pulseState[key].phase = 0;
    }
  }

  /**
   * 绘制资源栏
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.save();

    // ---- 背景 ----
    const r = Math.max(0, Math.min(12, this.height / 2));
    this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
    ctx.fillStyle = this.bgColor;
    ctx.fill();

    // 边框
    if (this.borderColor) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- 四种资源均分绘制 ----
    const resourceKeys = ['crystal', 'essence', 'starEnergy', 'starCoin'];
    const sectionWidth = this.width / resourceKeys.length;

    for (let i = 0; i < resourceKeys.length; i++) {
      const key = resourceKeys[i];
      const config = this.resourceConfig[key];
      const value = this.resources[key] || 0;

      const secX = this.x + i * sectionWidth;
      const secY = this.y;
      const secW = sectionWidth;
      const secH = this.height;
      const cx = secX + secW / 2;
      const cy = secY + secH / 2;

      // ---- 分割线（非最后一项）----
      if (i < resourceKeys.length - 1) {
        ctx.beginPath();
        ctx.moveTo(secX + secW, secY + 6);
        ctx.lineTo(secX + secW, secY + secH - 6);
        ctx.strokeStyle = this.dividerColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ---- 脉冲效果背景 ----
      const pulse = this._pulseState[key];
      if (pulse && pulse.active) {
        pulse.phase += 0.08;
        const pulseAlpha = 0.15 + 0.15 * Math.sin(pulse.phase);
        ctx.save();
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = config.color;
        ctx.fillRect(secX + 4, secY + 4, secW - 8, secH - 8);
        ctx.restore();

        // 脉冲结束判断
        if (pulse.phase > Math.PI * 3) {
          pulse.active = false;
          pulse.phase = 0;
        }
      }

      // ---- 图标 ----
      if (config.icon && config.icon.width && config.icon.height) {
        // 绘制图片图标
        const iconSize = 64;
        ctx.drawImage(config.icon, cx - 40 - iconSize/2, cy - iconSize/2, iconSize, iconSize);
      } else {
        // 回退到文字图标
        const iconStr = '●';
        ctx.font = this.iconSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = config.color || this.iconColor;
        ctx.fillText(iconStr, cx - 30, cy);
      }

      // ---- 数值文字 ----
      const displayVal = this._formatValue(value);
      ctx.font = 'bold ' + this.fontSize + 'px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.textColor;

      // 数值在图标右侧
      const textX = cx + 10;
      ctx.fillText(displayVal, textX, cy);
    }

    ctx.restore();
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
   * 检测点击命中某个资源区域
   * @param {number} px
   * @param {number} py
   * @returns {string|null} 命中的资源 key，未命中返回 null
   */
  hitTest(px, py) {
    if (px < this.x || px > this.x + this.width ||
        py < this.y || py > this.y + this.height) {
      return null;
    }

    const resourceKeys = ['crystal', 'essence', 'starEnergy', 'starCoin'];
    const sectionWidth = this.width / resourceKeys.length;
    const index = Math.floor((px - this.x) / sectionWidth);

    if (index >= 0 && index < resourceKeys.length) {
      return resourceKeys[index];
    }
    return null;
  }

  /**
   * 处理点击事件
   * @param {number} px
   * @param {number} py
   * @param {function} [onResourceClick] - 点击回调 onResourceClick(resourceKey)
   * @returns {boolean}
   */
  handleClick(px, py, onResourceClick) {
    const key = this.hitTest(px, py);
    if (key && onResourceClick) {
      onResourceClick(key, this.resources[key]);
      return true;
    }
    return !!key;
  }

  /**
   * 每帧更新
   * @param {number} dt - 帧间隔时间（毫秒）
   */
  update(dt) {
    // 脉冲动画在 render 中已处理
    // 这里可添加额外逻辑
  }

  /**
   * 获取指定资源的当前值
   * @param {string} key
   * @returns {number}
   */
  getResource(key) {
    return this.resources[key] || 0;
  }

  /**
   * 获取所有资源的副本
   * @returns {object}
   */
  getAllResources() {
    return Object.assign({}, this.resources);
  }
}

module.exports = ResourceBar;
