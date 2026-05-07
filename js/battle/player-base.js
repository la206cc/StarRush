/**
 * player-base.js — 玩家基地实体
 *
 * 玩家基地位于战场底部中央，被敌人攻击时扣血，
 * 血量归零触发失败判定。使用 ProgressBar hpMode 显示血量条。
 */

var ProgressBar = require('../ui/progress-bar');

/**
 * 布局常量
 */
var LAYOUT = {
  x: 325,
  y: 1050,
  w: 100,
  h: 50
};

/**
 * PlayerBase 构造函数
 * @param {Object} config
 * @param {number} [config.x=375]  - 基地中心 X 坐标
 * @param {number} [config.y=1100] - 基地中心 Y 坐标
 * @param {number} [config.hp=1000] - 基地最大生命值
 */
function PlayerBase(config) {
  config = config || {};
  this.x = config.x || 375;
  this.y = config.y || 1100;
  this.hp = config.hp || 1000;
  this.maxHp = config.hp || 1000;
  this.alive = true;
  this._flashTimer = 0;

  // 创建 HP 血量条（ProgressBar hpMode）
  this.hpBar = new ProgressBar({
    x: LAYOUT.x,
    y: LAYOUT.y + LAYOUT.h + 4,
    width: LAYOUT.w,
    height: 8,
    value: this.hp,
    maxValue: this.maxHp,
    hpMode: true,
    showText: false,
    animated: true,
    borderRadius: 4,
    warningPulse: true,
    warnThreshold: 30
  });
}

/**
 * 受到伤害
 * 扣血并钳制 hp >= 0，hp <= 0 时 alive = false。
 * 触发 ProgressBar 的 flashDamage 闪烁效果。
 * @param {number} amount - 伤害值
 */
PlayerBase.prototype.takeDamage = function(amount) {
  if (!this.alive || amount <= 0) return;

  this.hp -= amount;
  if (this.hp <= 0) {
    this.hp = 0;
    this.alive = false;
  }

  // 更新血量条并触发受击闪烁
  this.hpBar.setValue(this.hp);
  this.hpBar.flashDamage();
  this._flashTimer = 0.2; // 200ms 闪烁
};

/**
 * 每帧更新
 * 更新受击闪烁计时器和血量条动画。
 * @param {number} dt - 帧间隔（秒）
 */
PlayerBase.prototype.update = function(dt) {
  // 更新受击闪烁计时器
  if (this._flashTimer > 0) {
    this._flashTimer -= dt;
    if (this._flashTimer < 0) {
      this._flashTimer = 0;
    }
  }

  // 更新血量条动画（ProgressBar.update 接收毫秒）
  this.hpBar.update(dt * 1000);
};

/**
 * 渲染基地图标和 HP_Bar
 * @param {CanvasRenderingContext2D} ctx
 */
PlayerBase.prototype.render = function(ctx) {
  if (!ctx) return;

  ctx.save();

  // 受击闪烁效果：半透明红色叠加
  if (this._flashTimer > 0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this._flashTimer * Math.PI * 10);
  }

  // 渲染基地图标（矩形 + emoji）
  ctx.fillStyle = this.alive ? '#4a6fa5' : '#666666';
  ctx.fillRect(LAYOUT.x, LAYOUT.y, LAYOUT.w, LAYOUT.h);

  // 基地边框
  ctx.strokeStyle = this.alive ? '#7eb8da' : '#999999';
  ctx.lineWidth = 2;
  ctx.strokeRect(LAYOUT.x, LAYOUT.y, LAYOUT.w, LAYOUT.h);

  // 基地 emoji 图标
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🏠', LAYOUT.x + LAYOUT.w / 2, LAYOUT.y + LAYOUT.h / 2);

  ctx.restore();

  // 渲染 HP 血量条
  this.hpBar.render(ctx);
};

module.exports = PlayerBase;
