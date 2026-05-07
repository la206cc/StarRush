/**
 * hero-entity.js — 英雄实体
 *
 * 单个已部署英雄的战场行为：根据 role 自动寻敌、移动、攻击、治疗、增益。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

var ProgressBar = require('../ui/progress-bar');
var damageCalc = require('./damage-calc');

/**
 * 常量
 */
var HP_BAR_WIDTH = 40;
var HP_BAR_HEIGHT = 6;
var HP_BAR_OFFSET_Y = -20;
var EMOJI_FONT_SIZE = 24;
var DEFAULT_SKILL_PERCENT = 100;
var TANK_FRONT_Y = 200;
var SEEK_RANGE = 9999;             // 全图寻敌范围（像素）

/**
 * HeroEntity 构造函数
 * @param {Object} config
 */
function HeroEntity(config) {
  this.id = config.id;
  this.name = config.name;
  this.emoji = config.emoji;
  this.role = config.role;         // 'melee' | 'ranged' | 'tank' | 'heal' | 'buff' | 'aoe'
  this.x = config.x;
  this.y = config.y;
  this.hp = config.hp;
  this.maxHp = config.hp;
  this.atk = config.atk;
  this.atkSpd = config.atkSpd;     // 攻击间隔（秒）
  this.range = config.range;
  this.moveSpd = config.moveSpd;
  this.skills = config.skills || [];
  this.healRatio = config.healRatio || 0;
  this.buffRatio = config.buffRatio || 0;
  this.defense = config.defense || 0;

  this.target = null;
  this.atkCooldown = 0;
  this.state = 'idle';             // 'idle' | 'moving' | 'attacking'
  this.alive = true;

  // 视觉效果状态
  this._flashTimer = 0;            // 受击闪白计时
  this._atkFlashTimer = 0;         // 攻击闪光计时
  this._damageNumbers = [];        // 浮动伤害数字队列
  this._projectiles = [];          // 弹道线队列（ranged 角色）

  // 创建 HP 血量条（ProgressBar hpMode）
  this.hpBar = new ProgressBar({
    x: this.x - HP_BAR_WIDTH / 2,
    y: this.y + HP_BAR_OFFSET_Y,
    width: HP_BAR_WIDTH,
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
 * 每帧更新 — 根据 role 执行不同 AI 行为
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} entityManager - EntityManager 实例
 * @param {Object} playerBase - PlayerBase 实例
 */
HeroEntity.prototype.update = function(dt, entityManager, playerBase) {
  if (!this.alive) return;

  // 冷却计时递减
  if (this.atkCooldown > 0) {
    this.atkCooldown -= dt;
    if (this.atkCooldown < 0) this.atkCooldown = 0;
  }

  // 根据 role 分派行为
  if (this.role === 'heal') {
    this._healAlly(dt, entityManager);
  } else if (this.role === 'buff') {
    this._buffAllies(dt, entityManager);
  } else if (this.role === 'tank') {
    this._updateTank(dt, entityManager);
  } else {
    // melee / ranged / aoe — 寻敌、移动、攻击
    this._updateAttacker(dt, entityManager);
  }

  // 更新 HP_Bar 位置和动画
  this._updateHpBar(dt);
};

/**
 * melee / ranged / aoe 角色的更新逻辑
 * @param {number} dt
 * @param {Object} entityManager
 * @private
 */
HeroEntity.prototype._updateAttacker = function(dt, entityManager) {
  // 寻找目标 — 优先在攻击范围内，否则全图寻敌
  if (!this.target || !this.target.alive) {
    this.target = this._findTarget(entityManager);
  }

  // 如果攻击范围内没有目标，全图寻敌并追击
  if (!this.target) {
    if (typeof entityManager.findNearestEnemy === 'function') {
      this.target = entityManager.findNearestEnemy(this.x, this.y, SEEK_RANGE);
    }
  }

  if (!this.target) {
    this.state = 'idle';
    return;
  }

  // 计算与目标的距离
  var dx = this.target.x - this.x;
  var dy = this.target.y - this.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= this.range) {
    this.state = 'attacking';
    this._attackTarget(dt);
  } else {
    this.state = 'moving';
    this._moveToTarget(dt);
  }
};

/**
 * tank 角色的更新逻辑 — 优先移动到最前方（Y 值最小的位置）
 * @param {number} dt
 * @param {Object} entityManager
 * @private
 */
HeroEntity.prototype._updateTank = function(dt, entityManager) {
  // tank 优先前置到最前方位置
  if (this.y > TANK_FRONT_Y) {
    this.state = 'moving';
    this.y -= this.moveSpd * dt;
    if (this.y < TANK_FRONT_Y) {
      this.y = TANK_FRONT_Y;
    }
  }

  // 到达前方后，全图寻敌
  if (!this.target || !this.target.alive) {
    this.target = this._findTarget(entityManager);
    if (!this.target && typeof entityManager.findNearestEnemy === 'function') {
      this.target = entityManager.findNearestEnemy(this.x, this.y, SEEK_RANGE);
    }
  }

  if (this.target) {
    var dx = this.target.x - this.x;
    var dy = this.target.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.range) {
      this.state = 'attacking';
      this._attackTarget(dt);
    } else if (this.y <= TANK_FRONT_Y) {
      this.state = 'moving';
      this._moveToTarget(dt);
    }
  } else if (this.y <= TANK_FRONT_Y) {
    this.state = 'idle';
  }
};

/**
 * 查找目标
 * melee/ranged/aoe: 寻找最近敌人
 * heal: 寻找最低血量友方
 * tank: 寻找最近敌人
 * @param {Object} entityManager
 * @returns {Object|null}
 * @private
 */
HeroEntity.prototype._findTarget = function(entityManager) {
  if (!entityManager) return null;

  if (this.role === 'heal') {
    // heal 角色寻找最低血量友方英雄
    if (typeof entityManager.findLowestHpHero === 'function') {
      return entityManager.findLowestHpHero(this.x, this.y, this.range);
    }
    return null;
  }

  // melee / ranged / aoe / tank — 寻找最近敌人
  if (typeof entityManager.findNearestEnemy === 'function') {
    return entityManager.findNearestEnemy(this.x, this.y, this.range);
  }

  // 回退：手动查找最近敌人
  if (typeof entityManager.getAliveEnemies !== 'function') return null;
  var enemies = entityManager.getAliveEnemies();
  if (!enemies || enemies.length === 0) return null;

  var nearest = null;
  var minDist = Infinity;
  for (var i = 0; i < enemies.length; i++) {
    var enemy = enemies[i];
    var dx = enemy.x - this.x;
    var dy = enemy.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = enemy;
    }
  }
  return nearest;
};

/**
 * 向目标移动
 * @param {number} dt - 帧间隔（秒）
 * @private
 */
HeroEntity.prototype._moveToTarget = function(dt) {
  if (!this.target) return;

  var dx = this.target.x - this.x;
  var dy = this.target.y - this.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 0) return;

  // 归一化方向向量并按速度移动
  var nx = dx / dist;
  var ny = dy / dist;
  var step = this.moveSpd * dt;

  // 防止越过目标
  if (step >= dist) {
    this.x = this.target.x;
    this.y = this.target.y;
  } else {
    this.x += nx * step;
    this.y += ny * step;
  }
};

/**
 * 攻击目标 — 使用 damage-calc 计算伤害
 * @param {number} dt - 帧间隔（秒）
 * @private
 */
HeroEntity.prototype._attackTarget = function(dt) {
  if (!this.target || !this.target.alive) return;

  if (this.atkCooldown <= 0) {
    var targetDefense = this.target.defense || 0;
    var skillPercent = this._getActiveSkillPercent();
    var damage;

    if (skillPercent > 0 && skillPercent !== DEFAULT_SKILL_PERCENT) {
      damage = damageCalc.calculateSkillDamage(this.atk, skillPercent, targetDefense);
    } else {
      damage = damageCalc.calculateDamage(this.atk, targetDefense);
    }

    if (typeof this.target.takeDamage === 'function') {
      this.target.takeDamage(damage);
    }

    // 攻击闪光
    this._atkFlashTimer = 0.12;

    // 远程角色发射弹道
    if (this.role === 'ranged' || this.role === 'aoe') {
      this._projectiles.push({
        fromX: this.x, fromY: this.y,
        toX: this.target.x, toY: this.target.y,
        timer: 0.2, maxTimer: 0.2
      });
    }

    this.atkCooldown = this.atkSpd;
  }
};

/**
 * heal 角色治疗逻辑
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} entityManager
 * @private
 */
HeroEntity.prototype._healAlly = function(dt, entityManager) {
  // 寻找最低血量友方
  if (!this.target || !this.target.alive || this.target.hp >= this.target.maxHp) {
    this.target = this._findTarget(entityManager);
  }

  if (!this.target) {
    this.state = 'idle';
    return;
  }

  // 计算与目标的距离
  var dx = this.target.x - this.x;
  var dy = this.target.y - this.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= this.range) {
    this.state = 'attacking';
    // 执行治疗
    if (this.atkCooldown <= 0) {
      var skillPercent = this._getActiveSkillPercent();
      if (skillPercent <= 0) skillPercent = DEFAULT_SKILL_PERCENT;
      var healAmount = damageCalc.calculateHeal(this.atk, this.healRatio, skillPercent);

      if (healAmount > 0 && typeof this.target.heal === 'function') {
        this.target.heal(healAmount);
      }

      this.atkCooldown = this.atkSpd;
    }
  } else {
    this.state = 'moving';
    this._moveToTarget(dt);
  }
};

/**
 * buff 角色增益逻辑 — 对范围内友方英雄施加增益
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} entityManager
 * @private
 */
HeroEntity.prototype._buffAllies = function(dt, entityManager) {
  if (!entityManager || typeof entityManager.findHeroesInRange !== 'function') {
    this.state = 'idle';
    return;
  }

  if (this.atkCooldown <= 0) {
    var allies = entityManager.findHeroesInRange(this.x, this.y, this.range);
    if (allies && allies.length > 0) {
      this.state = 'attacking';
      for (var i = 0; i < allies.length; i++) {
        var ally = allies[i];
        if (ally.id === this.id) continue; // 不给自己加 buff
        if (!ally.alive) continue;

        // 增益效果：临时增加攻击力（基于 buffRatio）
        var buffAmount = Math.floor(this.atk * this.buffRatio);
        if (buffAmount > 0) {
          ally.atk += buffAmount;
        }
      }
      this.atkCooldown = this.atkSpd;
    } else {
      this.state = 'idle';
    }
  }
};

/**
 * 获取当前激活技能的百分比
 * @returns {number} 技能百分比，无技能时返回 DEFAULT_SKILL_PERCENT
 * @private
 */
HeroEntity.prototype._getActiveSkillPercent = function() {
  if (!this.skills || this.skills.length === 0) return DEFAULT_SKILL_PERCENT;

  // 使用第一个技能的百分比（如果有 level 和 percent 属性）
  var skill = this.skills[0];
  if (skill && typeof skill.percent === 'number') {
    return skill.percent;
  }
  return DEFAULT_SKILL_PERCENT;
};

/**
 * 受到伤害
 * 扣血并钳制 hp >= 0，hp <= 0 时 alive = false。
 * @param {number} amount - 伤害值
 */
HeroEntity.prototype.takeDamage = function(amount) {
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
 * 治疗恢复
 * 恢复血量并钳制 hp <= maxHp。
 * @param {number} amount - 治疗量
 */
HeroEntity.prototype.heal = function(amount) {
  if (!this.alive || amount <= 0) return;

  this.hp += amount;
  if (this.hp > this.maxHp) {
    this.hp = this.maxHp;
  }

  // 更新血量条
  this.hpBar.setValue(this.hp);
};

/**
 * 更新 HP_Bar 位置和动画
 * @param {number} dt - 帧间隔（秒）
 * @private
 */
HeroEntity.prototype._updateHpBar = function(dt) {
  this.hpBar.x = this.x - HP_BAR_WIDTH / 2;
  this.hpBar.y = this.y + HP_BAR_OFFSET_Y;
  this.hpBar.update(dt * 1000);

  // 视觉效果计时
  if (this._flashTimer > 0) this._flashTimer -= dt;
  if (this._atkFlashTimer > 0) this._atkFlashTimer -= dt;

  // 更新浮动伤害数字
  for (var i = this._damageNumbers.length - 1; i >= 0; i--) {
    var dn = this._damageNumbers[i];
    dn.timer -= dt;
    dn.y -= 40 * dt;
    if (dn.timer <= 0) {
      this._damageNumbers.splice(i, 1);
    }
  }

  // 更新弹道线
  for (var j = this._projectiles.length - 1; j >= 0; j--) {
    this._projectiles[j].timer -= dt;
    if (this._projectiles[j].timer <= 0) {
      this._projectiles.splice(j, 1);
    }
  }
};

/**
 * 渲染英雄 emoji 和 HP_Bar
 * @param {CanvasRenderingContext2D} ctx
 */
HeroEntity.prototype.render = function(ctx) {
  if (!ctx || !this.alive) return;

  ctx.save();

  // 受击闪白效果
  if (this._flashTimer > 0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this._flashTimer * 40);
  }

  // 攻击闪光（蓝色光圈）
  if (this._atkFlashTimer > 0) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(79, 195, 247, ' + (this._atkFlashTimer / 0.12 * 0.4) + ')';
    ctx.fill();
  }

  // 渲染英雄 emoji
  ctx.font = EMOJI_FONT_SIZE + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.emoji, this.x, this.y);

  ctx.restore();

  // 渲染弹道线
  for (var p = 0; p < this._projectiles.length; p++) {
    var proj = this._projectiles[p];
    var progress = 1 - (proj.timer / proj.maxTimer);
    var px = proj.fromX + (proj.toX - proj.fromX) * progress;
    var py = proj.fromY + (proj.toY - proj.fromY) * progress;
    var alpha = proj.timer / proj.maxTimer;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(proj.fromX, proj.fromY);
    ctx.lineTo(px, py);
    ctx.stroke();
    // 弹头光点
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#69f0ae';
    ctx.fill();
    ctx.restore();
  }

  // 渲染 HP 血量条
  this.hpBar.render(ctx);

  // 渲染浮动伤害数字
  for (var i = 0; i < this._damageNumbers.length; i++) {
    var dn = this._damageNumbers[i];
    var dnAlpha = Math.min(1, dn.timer / (dn.maxTimer * 0.3));
    ctx.save();
    ctx.globalAlpha = dnAlpha;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff8a80';
    ctx.fillText('-' + dn.value, dn.x, dn.y);
    ctx.restore();
  }
};

module.exports = HeroEntity;
