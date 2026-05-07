/**
 * entity-manager.js — 实体管理器
 *
 * 管理战场上所有英雄和敌人实体的生命周期：添加、更新、移除、查询。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

/**
 * EntityManager 构造函数
 */
function EntityManager() {
  this.heroes = [];                // HeroEntity 数组
  this.enemies = [];               // EnemyEntity 数组
  this.maxEnemies = 25;            // 同屏敌人上限
  this.deadHeroIds = [];           // 本局已阵亡英雄 ID 列表
}

/**
 * 添加英雄实体到战场
 * @param {Object} heroEntity - HeroEntity 实例
 */
EntityManager.prototype.addHero = function(heroEntity) {
  if (heroEntity) {
    this.heroes.push(heroEntity);
  }
};

/**
 * 添加敌人实体到战场
 * @param {Object} enemyEntity - EnemyEntity 实例
 */
EntityManager.prototype.addEnemy = function(enemyEntity) {
  if (enemyEntity) {
    this.enemies.push(enemyEntity);
  }
};

/**
 * 每帧更新所有实体
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} playerBase - PlayerBase 实例
 */
EntityManager.prototype.update = function(dt, playerBase) {
  var i;
  for (i = 0; i < this.heroes.length; i++) {
    if (this.heroes[i].alive) {
      this.heroes[i].update(dt, this, playerBase);
    }
  }
  for (i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].alive) {
      this.enemies[i].update(dt, this, playerBase);
    }
  }
};


/**
 * 清理死亡实体，返回击杀的敌人列表（用于得分计算）
 * @returns {Array} 被击杀的敌人实体数组
 */
EntityManager.prototype.removeDeadEntities = function() {
  var killedEnemies = [];
  var i;

  // 收集死亡敌人
  for (i = this.enemies.length - 1; i >= 0; i--) {
    if (!this.enemies[i].alive) {
      killedEnemies.push(this.enemies[i]);
      this.enemies.splice(i, 1);
    }
  }

  // 收集死亡英雄并记录阵亡 ID
  for (i = this.heroes.length - 1; i >= 0; i--) {
    if (!this.heroes[i].alive) {
      var heroId = this.heroes[i].id;
      if (this.deadHeroIds.indexOf(heroId) === -1) {
        this.deadHeroIds.push(heroId);
      }
      this.heroes.splice(i, 1);
    }
  }

  return killedEnemies;
};

/**
 * 获取所有存活英雄
 * @returns {Array} 存活的 HeroEntity 数组
 */
EntityManager.prototype.getAliveHeroes = function() {
  var result = [];
  for (var i = 0; i < this.heroes.length; i++) {
    if (this.heroes[i].alive) {
      result.push(this.heroes[i]);
    }
  }
  return result;
};

/**
 * 获取所有存活敌人
 * @returns {Array} 存活的 EnemyEntity 数组
 */
EntityManager.prototype.getAliveEnemies = function() {
  var result = [];
  for (var i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].alive) {
      result.push(this.enemies[i]);
    }
  }
  return result;
};

/**
 * 获取存活英雄数量
 * @returns {number}
 */
EntityManager.prototype.getAliveHeroCount = function() {
  var count = 0;
  for (var i = 0; i < this.heroes.length; i++) {
    if (this.heroes[i].alive) {
      count++;
    }
  }
  return count;
};

/**
 * 查找最近的存活敌人
 * @param {number} x - 查询位置 X
 * @param {number} y - 查询位置 Y
 * @param {number} [range] - 可选范围限制（像素），不传则不限距离
 * @returns {Object|null} 最近的 EnemyEntity 或 null
 */
EntityManager.prototype.findNearestEnemy = function(x, y, range) {
  var nearest = null;
  var minDist = Infinity;

  for (var i = 0; i < this.enemies.length; i++) {
    var enemy = this.enemies[i];
    if (!enemy.alive) continue;

    var dx = enemy.x - x;
    var dy = enemy.y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      nearest = enemy;
    }
  }

  // 如果指定了范围限制，检查最近敌人是否在范围内
  if (range !== undefined && range !== null && minDist > range) {
    return null;
  }

  return nearest;
};

/**
 * 查找范围内血量最低的存活英雄
 * @param {number} x - 查询位置 X
 * @param {number} y - 查询位置 Y
 * @param {number} range - 范围限制（像素）
 * @returns {Object|null} 血量最低的 HeroEntity 或 null
 */
EntityManager.prototype.findLowestHpHero = function(x, y, range) {
  var lowest = null;
  var lowestHp = Infinity;

  for (var i = 0; i < this.heroes.length; i++) {
    var hero = this.heroes[i];
    if (!hero.alive) continue;

    var dx = hero.x - x;
    var dy = hero.y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= range && hero.hp < lowestHp) {
      lowestHp = hero.hp;
      lowest = hero;
    }
  }

  return lowest;
};

/**
 * 查找范围内所有存活英雄
 * @param {number} x - 查询位置 X
 * @param {number} y - 查询位置 Y
 * @param {number} range - 范围限制（像素）
 * @returns {Array} 范围内的 HeroEntity 数组
 */
EntityManager.prototype.findHeroesInRange = function(x, y, range) {
  var result = [];

  for (var i = 0; i < this.heroes.length; i++) {
    var hero = this.heroes[i];
    if (!hero.alive) continue;

    var dx = hero.x - x;
    var dy = hero.y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= range) {
      result.push(hero);
    }
  }

  return result;
};

/**
 * 是否可以生成新敌人（存活敌人 < maxEnemies）
 * @returns {boolean}
 */
EntityManager.prototype.canSpawnEnemy = function() {
  var aliveCount = 0;
  for (var i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].alive) {
      aliveCount++;
    }
  }
  return aliveCount < this.maxEnemies;
};

/**
 * 检查英雄是否已阵亡（本局内）
 * @param {string} heroId - 英雄 ID
 * @returns {boolean} 是否已阵亡
 */
EntityManager.prototype.isHeroDead = function(heroId) {
  return this.deadHeroIds.indexOf(heroId) !== -1;
};

module.exports = EntityManager;