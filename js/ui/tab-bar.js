/**
 * 标签页切换组件 - TabBar
 * 横向排列的标签页，选中状态底部高亮指示条（滑动动画）
 * 支持均匀分布或固定宽度模式
 * 适用于微信小游戏 Canvas 2D 绘制
 */

/**
 * 绘制圆角矩形路径（兼容微信小游戏Canvas 2D）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - 左上角X
 * @param {number} y - 左上角Y
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} r - 圆角半径
 */
function _drawRoundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class TabBar {
  constructor(options) {
    Object.assign(this, {
      x: 0,
      y: 0,
      width: 750,
      tabs: [],              // [{id, name, icon?}] 标签页数据
      selectedIndex: 0,
      onChange: null,        // 切换回调 onChange(selectedIndex, tab)
      tabHeight: 70,
      // 视觉配置
      bgColor: 'rgba(15, 15, 35, 0.9)',
      selectedColor: '#4fc3f7',
      unselectedColor: '#8892b0',
      indicatorColor: '#4fc3f7',
      indicatorHeight: 3,
      fontSize: 26,
      selectedFontSize: 28,
      // 布局模式: 'equal'（均匀分布）| 'fit'（自适应宽度）
      layoutMode: 'equal',
      // 是否显示顶部边框线
      showTopBorder: true,
      topBorderColor: 'rgba(79, 195, 247, 0.2)',
      // 动画速度
      animSpeed: 0.18
    }, options);

    // 内部动画状态
    this._indicatorX = 0;       // 指示条当前位置 X
    this._indicatorW = 0;       // 指示条当前宽度
    this._targetIndicatorX = 0;
    this._targetIndicatorW = 0;

    // 计算每个 tab 的区域
    this._tabRegions = [];

    // 初始化指示条位置
    if (this.tabs.length > 0) {
      this._updateTabRegions();
      const region = this._tabRegions[this.selectedIndex];
      if (region) {
        this._indicatorX = region.x;
        this._indicatorW = region.w;
        this._targetIndicatorX = region.x;
        this._targetIndicatorW = region.w;
      }
    }
  }

  /**
   * 更新每个 tab 的区域坐标
   * @private
   */
  _updateTabRegions() {
    this._tabRegions = [];
    const tabCount = this.tabs.length;
    if (tabCount === 0) return;

    if (this.layoutMode === 'equal') {
      // 均匀分布：每个 tab 等宽
      const tabW = this.width / tabCount;
      for (let i = 0; i < tabCount; i++) {
        this._tabRegions.push({
          x: this.x + i * tabW,
          y: this.y,
          w: tabW,
          h: this.tabHeight
        });
      }
    } else {
      // fit 模式：根据文字宽度分配
      // 先测量文字宽度（这里用估算值，实际使用时 ctx 可精确测量）
      let totalTextW = 0;
      const minTabW = 80;
      const padding = 24;

      for (let i = 0; i < tabCount; i++) {
        const tab = this.tabs[i];
        const textLen = (tab.name || '').length;
        totalTextW += Math.max(minTabW, textLen * this.selectedFontSize + padding);
      }

      const scale = Math.min(1, this.width / totalTextW);
      let currentX = this.x;

      for (let i = 0; i < tabCount; i++) {
        const tab = this.tabs[i];
        const textLen = (tab.name || '').length;
        const tabW = Math.max(minTabW, textLen * this.selectedFontSize + padding) * scale;

        this._tabRegions.push({
          x: currentX,
          y: this.y,
          w: tabW,
          h: this.tabHeight
        });
        currentX += tabW;
      }
    }

    // 更新目标指示条位置
    if (this.selectedIndex < this._tabRegions.length) {
      const region = this._tabRegions[this.selectedIndex];
      if (region) {
        this._targetIndicatorX = region.x + region.w * 0.1;
        this._targetIndicatorW = region.w * 0.8;
      }
    }
  }

  /**
   * 设置标签页数据
   * @param {Array} tabs - [{id, name, icon?}]
   */
  setTabs(tabs) {
    this.tabs = tabs || [];
    this.selectedIndex = Math.min(this.selectedIndex, this.tabs.length - 1);
    if (this.selectedIndex < 0) this.selectedIndex = 0;
    this._updateTabRegions();

    // 重置指示条到当前选中项
    if (this._tabRegions.length > 0) {
      const region = this._tabRegions[this.selectedIndex];
      if (region) {
        this._indicatorX = region.x + region.w * 0.1;
        this._indicatorW = region.w * 0.8;
        this._targetIndicatorX = this._indicatorX;
        this._targetIndicatorW = this._indicatorW;
      }
    }
  }

  /**
   * 绘制标签栏
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (this.tabs.length === 0) return;

    ctx.save();

    // ---- 背景层 ----
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.tabHeight);

    // ---- 顶部边框线 ----
    if (this.showTopBorder) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y);
      ctx.strokeStyle = this.topBorderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- 绘制各 Tab ----
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const region = this._tabRegions[i];
      if (!region) continue;

      const isSelected = (i === this.selectedIndex);
      const cx = region.x + region.w / 2;
      const cy = region.y + this.tabHeight / 2;

      // 文字颜色和大小
      ctx.fillStyle = isSelected ? this.selectedColor : this.unselectedColor;
      ctx.font = (isSelected ? this.selectedFontSize : this.fontSize) +
                 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 未选中时降低透明度
      ctx.globalAlpha = isSelected ? 1 : 0.65;

      // 图标 + 文字布局
      if (tab.icon) {
        const iconSize = this.fontSize * 1.1;
        const iconSpacing = 4;
        ctx.font = iconSize + 'px sans-serif';
        const iconW = ctx.measureText(tab.icon).width;
        ctx.font = (isSelected ? this.selectedFontSize : this.fontSize) +
                   'px sans-serif';
        const textW = ctx.measureText(tab.name).width;
        const totalW = iconW + iconSpacing + textW;
        const startX = cx - totalW / 2;

        // 图标
        ctx.font = iconSize + 'px sans-serif';
        ctx.fillText(tab.icon, startX + iconW / 2, cy);
        // 文字
        ctx.font = (isSelected ? this.selectedFontSize : this.fontSize) +
                   'px sans-serif';
        ctx.fillText(tab.name, startX + iconW + iconSpacing + textW / 2, cy);
      } else {
        ctx.fillText(tab.name, cx, cy);
      }

      ctx.globalAlpha = 1;
    }

    // ---- 底部高亮指示条（带滑动动画）----
    if (this.indicatorHeight > 0) {
      // 平滑动画插值
      const dx = this._targetIndicatorX - this._indicatorX;
      const dw = this._targetIndicatorW - this._indicatorW;
      if (Math.abs(dx) > 0.5) this._indicatorX += dx * this.animSpeed;
      else this._indicatorX = this._targetIndicatorX;
      if (Math.abs(dw) > 0.5) this._indicatorW += dw * this.animSpeed;
      else this._indicatorW = this._targetIndicatorW;

      const indY = this.y + this.tabHeight - this.indicatorHeight;
      const indR = this.indicatorHeight / 2;

      // 指示条圆角矩形
      _drawRoundRect(ctx,
        this._indicatorX, indY,
        this._indicatorW, this.indicatorHeight,
        indR
      );
      ctx.fillStyle = this.indicatorColor;
      ctx.fill();

      // 指示条微弱发光
      ctx.save();
      ctx.shadowColor = this.indicatorColor;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 检测点击命中，返回命中的 tab 索引
   * @param {number} px
   * @param {number} py
   * @returns {number} 命中的索引，未命中返回 -1
   */
  hitTest(px, py) {
    if (py < this.y || py > this.y + this.tabHeight) return -1;
    if (px < this.x || px > this.x + this.width) return -1;

    for (let i = 0; i < this._tabRegions.length; i++) {
      const r = this._tabRegions[i];
      if (px >= r.x && px <= r.x + r.w) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 选中指定索引的 tab
   * @param {number} index - 目标索引
   */
  selectTab(index) {
    if (index < 0 || index >= this.tabs.length) return;
    if (index === this.selectedIndex) return;

    const prevIndex = this.selectedIndex;
    this.selectedIndex = index;

    // 更新目标指示条位置
    this._updateTabRegions();
    const region = this._tabRegions[index];
    if (region) {
      this._targetIndicatorX = region.x + region.w * 0.1;
      this._targetIndicatorW = region.w * 0.8;
    }

    // 触发回调
    if (this.onChange) {
      this.onChange(index, this.tabs[index], prevIndex);
    }
  }

  /**
   * 通过 id 选中 tab
   * @param {string} id
   */
  selectTabById(id) {
    const index = this.tabs.findIndex(function(t) { return t.id === id; });
    if (index >= 0) {
      this.selectTab(index);
    }
  }

  /**
   * 获取当前选中的 tab ID
   * @returns {string}
   */
  getSelectedId() {
    const tab = this.tabs[this.selectedIndex];
    return tab ? tab.id : '';
  }

  /**
   * 获取当前选中的 tab 数据
   * @returns {object|null}
   */
  getSelectedTab() {
    return this.tabs[this.selectedIndex] || null;
  }

  /**
   * 处理点击事件
   * @param {number} px
   * @param {number} py
   * @returns {boolean} 是否命中并处理了点击
   */
  handleClick(px, py) {
    const index = this.hitTest(px, py);
    if (index >= 0) {
      if (index !== this.selectedIndex) {
        this.selectTab(index);
      } else {
        if (this.onChange) {
          this.onChange(index, this.tabs[index], this.selectedIndex);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * 每帧更新（用于平滑动画）
   * @param {number} dt - 帧间隔时间（毫秒）
   */
  update(dt) {
    // 指示条滑动动画在 render 中已经处理了
    // 这里可以添加额外的动画逻辑
  }
}

module.exports = TabBar;
