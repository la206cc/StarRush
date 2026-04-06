/**
 * 可滚动列表容器 - ScrollList
 * 支持触摸拖拽滚动、惯性滚动(fling)、回弹效果
 * 通过 renderItemFunc 回调让外部决定每个 item 的绘制方式
 * 自动裁剪超出区域的内容
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

class ScrollList {
  constructor(options) {
    Object.assign(this, {
      x: 0,
      y: 0,
      width: 700,
      height: 800,
      itemHeight: 120,
      items: [],
      // 自定义渲染函数: function(item, index, ctx, x, y, isSelected)
      renderItemFunc: null,
      // 滚动状态
      scrollY: 0,
      maxScroll: 0,
      velocity: 0,
      isDragging: false,
      lastTouchY: 0,
      lastTouchTime: 0,
      lastTouchYForVelocity: 0,
      bounceBack: true,
      // 滚动条配置
      showScrollBar: true,
      scrollBarWidth: 4,
      scrollBarColor: 'rgba(255, 255, 255, 0.3)',
      scrollBarActiveColor: 'rgba(255, 255, 255, 0.6)',
      // 物理参数
      friction: 0.95,          // 摩擦系数（惯性衰减）
      bounceStrength: 0.25,     // 回弹力度
      flingThreshold: 0.5,      // 触发惯性滚动的最小速度阈值
      // 选中项索引
      selectedIndex: -1,
      // 点击回调 onItemClick(index, item)
      onItemClick: null,
      // 内边距（item 之间的间距）
      itemPadding: 8,
      // 背景色
      bgColor: '',
      // 圆角半径
      borderRadius: 0
    }, options);

    // 内部状态
    this._scrollBarAlpha = 0;       // 滚动条透明度（自动淡出）
    this._scrollBarFadeDelay = 0;   // 滚动条延迟淡出计时
    this._overscrollTop = 0;        // 顶部过冲量
    this._overscrollBottom = 0;     // 底部过冲量
    this._isFlinging = false;       // 是否正在惯性滚动

    // 计算最大可滚动距离
    this._updateMaxScroll();
  }

  /**
   * 更新最大滚动范围
   * @private
   */
  _updateMaxScroll() {
    const totalContentHeight = this.items.length * (this.itemHeight + this.itemPadding);
    this.maxScroll = Math.max(0, totalContentHeight - this.height);

    // 约束当前滚动位置
    if (this.scrollY > this.maxScroll) {
      this.scrollY = this.maxScroll;
    }
    if (this.scrollY < 0) {
      this.scrollY = 0;
    }
  }

  /**
   * 设置数据源
   * @param {Array} items - 数据数组
   */
  setItems(items) {
    this.items = items || [];
    this.selectedIndex = -1;
    this.scrollY = 0;
    this.velocity = 0;
    this._isFlinging = false;
    this._updateMaxScroll();
  }

  /**
   * 追加单个 item
   * @param {*} item
   */
  addItem(item) {
    this.items.push(item);
    this._updateMaxScroll();
  }

  /**
   * 移除指定索引的 item
   * @param {number} index
   */
  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      if (this.selectedIndex === this.selectedIndex) {
        this.selectedIndex = -1;
      } else if (this.selectedIndex > index) {
        this.selectedIndex--;
      }
      this._updateMaxScroll();
    }
  }

  /**
   * 清空列表
   */
  clear() {
    this.items = [];
    this.selectedIndex = -1;
    this.scrollY = 0;
    this.velocity = 0;
    this._isFlinging = false;
    this.maxScroll = 0;
  }

  /**
   * 绘制列表
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.save();

    // ---- 背景填充 ----
    if (this.bgColor) {
      const r = Math.max(0, this.borderRadius);
      if (r > 0) {
        this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, r);
        ctx.clip();
      }
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // ---- 创建裁剪区域，限制内容在列表范围内 ----
    ctx.beginPath();
    if (this.borderRadius > 0) {
      this._drawRoundRectPath(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    ctx.clip();

    // ---- 计算可见项范围 ----
    const effectiveScrollY = this.scrollY - this._overscrollTop + this._overscrollBottom;
    const startY = this.y - effectiveScrollY;
    const itemTotalH = this.itemHeight + this.itemPadding;

    const firstVisibleIndex = Math.max(0, Math.floor((effectiveScrollY) / itemTotalH));
    const lastVisibleIndex = Math.min(
      this.items.length - 1,
      Math.ceil((effectiveScrollY + this.height) / itemTotalH)
    );

    // ---- 绘制可见项 ----
    for (let i = firstVisibleIndex; i <= lastVisibleIndex; i++) {
      const item = this.items[i];
      if (!item) continue;

      const itemX = this.x;
      const itemY = startY + i * itemTotalH;
      const isSelected = (i === this.selectedIndex);

      // 使用自定义渲染函数或默认渲染
      if (typeof this.renderItemFunc === 'function') {
        this.renderItemFunc(item, i, ctx, itemX, itemY, this.width, this.itemHeight, isSelected);
      } else {
        // 默认渲染：简单的带背景色和文字的行
        this._renderDefaultItem(ctx, item, i, itemX, itemY, isSelected);
      }
    }

    // ---- 恢复裁剪（绘制滚动条需要不受裁剪影响）----
    ctx.restore();

    // ---- 滚动条 ----
    if (this.showScrollBar && this.maxScroll > 0) {
      this._renderScrollBar(ctx);
    }
  }

  /**
   * 默认 item 渲染（当未提供 renderItemFunc 时使用）
   * @private
   */
  _renderDefaultItem(ctx, item, index, x, y, isSelected) {
    const r = 8;

    // 背景
    this._drawRoundRectPath(ctx, x, y + this.itemPadding / 2, this.width, this.itemHeight, r);
    if (isSelected) {
      ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
    } else if (index % 2 === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
    }
    ctx.fill();

    // 选中高亮边框
    if (isSelected) {
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 分割线
    ctx.beginPath();
    ctx.moveTo(x + r, y + this.itemHeight + this.itemPadding / 2);
    ctx.lineTo(x + this.width - r, y + this.itemHeight + this.itemPadding / 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 文字内容
    const text = typeof item === 'string' ? item : (item.name || item.title || JSON.stringify(item));
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelected ? '#4fc3f7' : '#ffffff';

    const textX = x + 20;
    const textY = y + this.itemPadding / 2 + this.itemHeight / 2;
    let displayText = text;
    const maxTextW = this.width - 40;
    while (ctx.measureText(displayText).width > maxTextW && displayText.length > 1) {
      displayText = displayText.slice(0, -1);
    }
    if (displayText !== text) displayText += '..';
    ctx.fillText(displayText, textX, textY);
  }

  /**
   * 绘制滚动条
   * @private
   */
  _renderScrollBar(ctx) {
    if (this.maxScroll <= 0) return;

    const barHeight = Math.max(30, (this.height / (this.height + this.maxScroll)) * this.height);
    const maxTravel = this.height - barHeight;
    const barY = this.y + (this.scrollY / this.maxScroll) * maxTravel;
    const barX = this.x + this.width - this.scrollBarWidth - 3;

    // 更新滚动条可见性
    if (this.isDragging || this._isFlinging || Math.abs(this.velocity) > 0.5) {
      this._scrollBarAlpha = 1;
      this._scrollBarFadeDelay = 1500; // 1.5秒后开始淡出
    }

    // 淡出逻辑
    if (this._scrollBarFadeDelay > 0) {
      this._scrollBarFadeDelay -= 16; // 约60fps
    } else if (this._scrollBarAlpha > 0) {
      this._scrollBarAlpha -= 0.03;
      if (this._scrollBarAlpha < 0) this._scrollBarAlpha = 0;
    }

    if (this._scrollBarAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this._scrollBarAlpha;

    // 滚动条背景轨道
    const trackR = this.scrollBarWidth / 2;
    _drawRoundRect(ctx, barX, this.y, this.scrollBarWidth, this.height, trackR);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();

    // 滚动条滑块
    const handleR = this.scrollBarWidth / 2;
    _drawRoundRect(ctx, barX, barY, this.scrollBarWidth, barHeight, handleR);
    ctx.fillStyle = this.isDragging ? this.scrollBarActiveColor : this.scrollBarColor;
    ctx.fill();

    ctx.restore();
  }

  /**
   * 触摸开始
   * @param {number} touchY - 触摸点的 Y 坐标（相对于 canvas）
   */
  handleTouchStart(touchY) {
    this.isDragging = true;
    this.lastTouchY = touchY;
    this.lastTouchYForVelocity = touchY;
    this.lastTouchTime = Date.now();
    this.velocity = 0;
    this._isFlinging = false;
    this._overscrollTop = 0;
    this._overscrollBottom = 0;
    this._scrollBarAlpha = 1;
  }

  /**
   * 触摸移动
   * @param {number} touchY - 当前触摸点 Y 坐标
   */
  handleTouchMove(touchY) {
    if (!this.isDragging) return;

    const now = Date.now();
    const dt = Math.max(1, now - this.lastTouchTime);
    const deltaY = touchY - this.lastTouchY;

    // 计算瞬时速度（用于惯性）
    this.velocity = (touchY - this.lastTouchYForVelocity) / dt * 16; // 归一化到约60fps

    this.lastTouchY = touchY;
    this.lastTouchYForVelocity = touchY;
    this.lastTouchTime = now;

    // 应用滚动
    this.scrollY -= deltaY;

    // 边界处理与过冲
    if (this.bounceBack) {
      if (this.scrollY < 0) {
        this._overscrollTop = -this.scrollY;
        this.scrollY = 0;
      } else {
        this._overscrollTop = 0;
      }

      if (this.scrollY > this.maxScroll) {
        this._overscrollBottom = this.scrollY - this.maxScroll;
        this.scrollY = this.maxScroll;
      } else {
        this._overscrollBottom = 0;
      }
    } else {
      this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScroll));
    }
  }

  /**
   * 触摸结束（触发惯性滚动）
   */
  handleTouchEnd() {
    this.isDragging = false;

    // 判断是否触发惯性滚动
    if (Math.abs(this.velocity) > this.flingThreshold) {
      this._isFlinging = true;
    } else {
      this._isFlinging = false;
      this.velocity = 0;
    }

    this._scrollBarFadeDelay = 1500;
  }

  /**
   * 处理点击事件，返回命中的 item 索引
   * @param {number} clickX
   * @param {number} clickY
   * @returns {number} 命中的 item 索引，未命中返回 -1
   */
  hitTest(clickX, clickY) {
    if (clickX < this.x || clickX > this.x + this.width ||
        clickY < this.y || clickY > this.y + this.height) {
      return -1;
    }

    const effectiveScrollY = this.scrollY - this._overscrollTop + this._overscrollBottom;
    const relativeY = clickY - this.y + effectiveScrollY;
    const itemTotalH = this.itemHeight + this.itemPadding;
    const index = Math.floor(relativeY / itemTotalH);

    if (index >= 0 && index < this.items.length) {
      return index;
    }
    return -1;
  }

  /**
   * 处理点击（自动触发回调）
   * @param {number} clickX
   * @param {number} clickY
   * @returns {number} 命中的 item 索引
   */
  handleClick(clickX, clickY) {
    const index = this.hitTest(clickX, clickY);
    if (index >= 0) {
      this.selectedIndex = index;
      if (this.onItemClick) {
        this.onItemClick(index, this.items[index]);
      }
    }
    return index;
  }

  /**
   * 每帧更新（惯性和回弹物理模拟）
   * @param {number} dt - 帧间隔时间（毫秒）
   */
  update(dt) {
    // 惯性滚动物理
    if (this._isFlinging && !this.isDragging) {
      this.scrollY += this.velocity;
      this.velocity *= this.friction;

      // 速度足够小时停止惯性
      if (Math.abs(this.velocity) < 0.1) {
        this.velocity = 0;
        this._isFlinging = false;
      }

      // 边界处理
      if (this.scrollY < 0) {
        if (this.bounceBack) {
          this._overscrollTop = -this.scrollY;
          this.scrollY = 0;
          this._isFlinging = false;
        } else {
          this.scrollY = 0;
          this.velocity = 0;
          this._isFlinging = false;
        }
      } else {
        this._overscrollTop = 0;
      }

      if (this.scrollY > this.maxScroll) {
        if (this.bounceBack) {
          this._overscrollBottom = this.scrollY - this.maxScroll;
          this.scrollY = this.maxScroll;
          this._isFlinging = false;
        } else {
          this.scrollY = this.maxScroll;
          this.velocity = 0;
          this._isFlinging = false;
        }
      } else {
        this._overscrollBottom = 0;
      }
    }

    // 回弹效果：过冲恢复
    if (!this.isDragging) {
      if (this._overscrollTop > 0) {
        this._overscrollTop *= (1 - this.bounceStrength);
        if (this._overscrollTop < 0.5) this._overscrollTop = 0;
      }
      if (this._overscrollBottom > 0) {
        this._overscrollBottom *= (1 - this.bounceStrength);
        if (this._overscrollBottom < 0.5) this._overscrollBottom = 0;
      }
    }
  }

  /**
   * 滚动到指定项
   * @param {number} index - 目标项索引
   * @param {boolean} [immediate=false] - 是否立即跳转
   */
  scrollToItem(index, immediate) {
    if (index < 0 || index >= this.items.length) return;

    const targetY = index * (this.itemHeight + this.itemPadding);

    if (immediate) {
      this.scrollY = targetY;
      this.velocity = 0;
      this._isFlinging = false;
      this._overscrollTop = 0;
      this._overscrollBottom = 0;
    } else {
      // 平滑滚动：设置一个目标并让 update 驱动
      // 这里简化为直接设置位置 + 小幅度弹性
      this.scrollY = targetY;
      this.velocity = 0;
      this._isFlinging = false;
    }

    // 约束范围
    this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScroll));
  }

  /**
   * 滚动到顶部
   */
  scrollToTop(immediate) {
    if (immediate) {
      this.scrollY = 0;
      this.velocity = 0;
      this._isFlinging = false;
      this._overscrollTop = 0;
      this._overscrollBottom = 0;
    } else {
      this.velocity = -Math.abs(this.scrollY) * 0.15;
      this._isFlinging = true;
    }
  }

  /**
   * 滚动到底部
   */
  scrollToBottom(immediate) {
    if (immediate) {
      this.scrollY = this.maxScroll;
      this.velocity = 0;
      this._isFlinging = false;
      this._overscrollTop = 0;
      this._overscrollBottom = 0;
    } else {
      this.velocity = (this.maxScroll - this.scrollY) * 0.15;
      this._isFlinging = true;
    }
  }

  /**
   * 获取当前选中的 item
   * @returns {*|null}
   */
  getSelectedItem() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
      return this.items[this.selectedIndex];
    }
    return null;
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
}

module.exports = ScrollList;
