/**
 * enemy-entity.js — 敌人实体
 *
 * 单个敌人的战场行为：向玩家基地移动、攻击英雄或基地。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

var ProgressBar = require('../ui/progress-bar');
var damageCalc = require('./damage-calc');

/**
 * 常量
 */
var ATTACK_RANGE = 120;          // 敌人攻击英雄的默认范围（像素）
var ATTACK_INTERVAL = 1.2;      // 攻击间隔（秒）
var HP_BAR_WIDTH = 40;          // 普通敌人 HP_Bar 宽度
var HP_BAR_HEIGHT = 6;          // HP_Bar 高度
var HP_BAR_OFFSET_Y = -20;      // HP_Bar 相对敌人 Y 坐标的偏移
var EMOJI_FONT_SIZE = 24;       // 敌人 emoji 字号
var BOSS_EMOJI_FONT_SIZE = 32;  // Boss emoji 字号

/**
 * EnemyEntity 构造函数
 * @param {Object} config
 */
function EnemyEntity(config) {
  this.id = config.id;
  this.templateId = config.templateId;
  this.name = config.name;
  this.x = config.x;
  this.y = config.y;
  this.hp = config.hp;
  this.maxHp = config.hp;
  this.attack = config.attack;
  this.defense = config.defense;
  this.speed = config.speed;
  this.isBoss = config.isBoss || false;
  this.scoreValue = config.scoreValue;
  this.level = config.level || 1;
  this.waveIndex = config.waveIndex;
  this.emoji = config.emoji || '👾';

  this.target = null;
  this.atkCooldown = 0;
  this.state = 'moving';           // 'moving' | 'attacking'
  this.alive = true;

  // 视觉效果状态
  this._flashTimer = 0;            // 受击闪白计时
  this._atkFlashTimer = 0;         // 攻击闪光计时
  this._damageNumbers = [];        // 浮动伤害数字队列

  // 创建 HP 血量条（ProgressBar hpMode）
  var barWidth = this.isBoss ? HP_BAR_WIDTH * 2 : HP_BAR_WIDTH;
  this.hpBar = new ProgressBar({
    x: this.x - barWidth / 2,
    y: this.y + HP_BAR_OFFSET_Y,
    width: barWidth,
    height: HP_BAR_HEIGHT,
    value: this.hp,
    maxValue: this.maxHp,
    hpMode: true,
    showText: false,
    animated: true,
    borderRadius: 3
  });
}

/**
 * 每帧更新 — 移动/攻击状态机
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} entityManager - EntityManager 实例
 * @param {Object} playerBase - PlayerBase 实例
 */
EnemyEntity.prototype.update = function(dt, entityManager, playerBase) {
  if (!this.alive) return;

  // 冷却计时递减
  if (this.atkCooldown > 0) {
    this.atkCooldown -= dt;
    if (this.atkCooldown < 0) this.atkCooldown = 0;
  }

  if (this.state === 'moving') {
    // 检查是否有英雄在攻击范围内
    if (entityManager) {
      var nearestHero = this._findNearestHero(entityManager);
      if (nearestHero) {
        this.target = nearestHero;
        this.state = 'attacking';
        this._attackHero(dt);
        return;
      }
    }
    // 向基地移动
    this._moveToBase(dt, playerBase);
  } else if (this.state === 'attacking') {
    // 检查当前目标是否仍然有效
    if (this.target && this.target.alive) {
      this._attackHero(dt);
    } else if (!this.target) {
      // 攻击基地模式
      this._attackBase(dt, playerBase);
    } else {
      // 目标死亡，切回移动状态
      this.target = null;
      this.state = 'moving';
    }
  }

  // 更新 HP_Bar 位置和动画
  this._updateHpBar(dt);
};

/**
 * 查找最近的英雄目标
 * @param {Object} entityManager
 * @returns {Object|null} 最近的英雄实体
 * @private
 */
EnemyEntity.prototype._findNearestHero = function(entityManager) {
  if (!entityManager || typeof entityManager.getAliveHeroes !== 'function') {
    return null;
  }
  var heroes = entityManager.getAliveHeroes();
  if (!heroes || heroes.length === 0) return null;

  var nearest = null;
  var minDist = Infinity;
  for (var i = 0; i < heroes.length; i++) {
    var hero = heroes[i];
    var dx = hero.x - this.x;
    var dy = hero.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist <= ATTACK_RANGE) {
      minDist = dist;
      nearest = hero;
    }
  }
  return nearest;
};

/**
 * 向玩家基地坐标移动，到达后切换为攻击基地
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} playerBase - PlayerBase 实例
 */
EnemyEntity.prototype._moveToBase = function(dt, playerBase) {
  if (!playerBase) {
    this.y += this.speed * dt;
    return;
  }

  var targetX = playerBase.x;
  var targetY = playerBase.y;
  var dx = targetX - this.x;
  var dy = targetY - this.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= ATTACK_RANGE) {
    // 到达基地攻击范围
    this.state = 'attacking';
    this.target = null;
    return;
  }

  // 归一化方向并移动
  var nx = dx / dist;
  var ny = dy / dist;
  var step = this.speed * dt;

  if (step >= dist) {
    this.x = targetX;
    this.y = targetY;
  } else {
    this.x += nx * step;
    this.y += ny * step;
  }
};

/**
 * 攻击英雄
 * @param {number} dt - 帧间隔（秒）
 */
EnemyEntity.prototype._attackHero = function(dt) {
  if (!this.target || !this.target.alive) return;

  if (this.atkCooldown <= 0) {
    var targetDefense = this.target.defense || 0;
    var damage = damageCalc.calculateDamage(this.attack, targetDefense);
    if (typeof this.target.takeDamage === 'function') {
      this.target.takeDamage(damage);
    }
    this._atkFlashTimer = 0.1;
    this.atkCooldown = ATTACK_INTERVAL;
  }
};

/**
 * 攻击基地
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} playerBase - PlayerBase 实例
 */
EnemyEntity.prototype._attackBase = function(dt, playerBase) {
  if (!playerBase || !playerBase.alive) return;

  if (this.atkCooldown <= 0) {
    var damage = damageCalc.calculateDamage(this.attack, 0);
    playerBase.takeDamage(damage);
    this._atkFlashTimer = 0.1;
    this.atkCooldown = ATTACK_INTERVAL;
  }
};

/**
 * 受到伤害
 * 扣血并钳制 hp >= 0，hp <= 0 时 alive = false。
 * @param {number} amount - 伤害值
 */
EnemyEntity.prototype.takeDamage = function(amount) {
  if (!this.alive || amount <= 0) return;

  this.hp -= amount;
  if (this.hp <= 0) {
    this.hp = 0;
    this.alive = false;
  }

  // 受击闪白
  this._flashTimer = 0.12;

  // 浮动伤害数字
  this._damageNumbers.push({
    value: Math.round(amount),
    x: this.x + (Math.random() - 0.5) * 20,
    y: this.y - 15,
    timer: 0.8,
    maxTimer: 0.8
  });

  // 更新血量条并触发受击闪烁
  this.hpBar.setValue(this.hp);
  this.hpBar.flashDamage();
};

/**
 * 更新 HP_Bar 位置和动画
 * @param {number} dt - 帧间隔（秒）
 * @private
 */
EnemyEntity.prototype._updateHpBar = function(dt) {
  var barWidth = this.isBoss ? HP_BAR_WIDTH * 2 : HP_BAR_WIDTH;
  this.hpBar.x = this.x - barWidth / 2;
  this.hpBar.y = this.y + HP_BAR_OFFSET_Y;
  this.hpBar.update(dt * 1000);

  // 视觉效果计时
  if (this._flashTimer > 0) this._flashTimer -= dt;
  if (this._atkFlashTimer > 0) this._atkFlashTimer -= dt;

  // 更新浮动伤害数字
  for (var i = this._damageNumbers.length - 1; i >= 0; i--) {
    var dn = this._damageNumbers[i];
    dn.timer -= dt;
    dn.y -= 40 * dt; // 向上飘
    if (dn.timer <= 0) {
      this._damageNumbers.splice(i, 1);
    }
  }
};

/**
 * 渲染敌人 emoji 和 HP_Bar
 * @param {CanvasRenderingContext2D} ctx
 */
EnemyEntity.prototype.render = function(ctx) {
  if (!ctx || !this.alive) return;

  ctx.save();

  // 受击闪白效果
  if (this._flashTimer > 0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this._flashTimer * 40);
  }

  // 攻击闪光（红色光圈）
  if (this._atkFlashTimer > 0) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 80, 80, ' + (this._atkFlashTimer / 0.1 * 0.4) + ')';
    ctx.fill();
  }

  // 渲染敌人 emoji
  var fontSize = this.isBoss ? BOSS_EMOJI_FONT_SIZE : EMOJI_FONT_SIZE;
  ctx.font = fontSize + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.emoji, this.x, this.y);

  ctx.restore();

  // 渲染 HP 血量条
  this.hpBar.render(ctx);

  // 渲染浮动伤害数字
  for (var i = 0; i < this._damageNumbers.length; i++) {
    var dn = this._damageNumbers[i];
    var alpha = Math.min(1, dn.timer / (dn.maxTimer * 0.3));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5252';
    ctx.fillText('-' + dn.value, dn.x, dn.y);
    ctx.restore();
  }
};

module.exports = EnemyEntity;
