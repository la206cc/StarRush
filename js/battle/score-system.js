/**
 * score-system.js — 得分系统模块
 *
 * 管理战斗中的得分累计和技能升级阈值判定。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

var damageCalc = require('./damage-calc');

/**
 * ScoreSystem 构造函数
 * 管理得分累计、击杀计数和技能升级阈值触发。
 */
function ScoreSystem() {
  this.score = 0;
  this.kills = 0;
  // 更多升级阈值，让玩家有更多升级机会（肉鸽风格）
  this.thresholds = [80, 180, 320, 500, 720, 980, 1300, 1700, 2200, 2800];
  this.currentThresholdIndex = 0;
}

/**
 * 累加分数，检查是否达到下一个技能升级阈值。
 * @param {number} points - 要累加的分数
 * @returns {{ newScore: number, thresholdReached: boolean }}
 */
ScoreSystem.prototype.addScore = function(points) {
  this.score += points;
  this.kills += 1;

  var thresholdReached = false;
  if (this.currentThresholdIndex < this.thresholds.length &&
      this.score >= this.thresholds[this.currentThresholdIndex]) {
    thresholdReached = true;
    this.currentThresholdIndex += 1;
  }

  return { newScore: this.score, thresholdReached: thresholdReached };
};

/**
 * 获取当前累计分数。
 * @returns {number}
 */
ScoreSystem.prototype.getScore = function() {
  return this.score;
};

/**
 * 获取当前击杀数。
 * @returns {number}
 */
ScoreSystem.prototype.getKills = function() {
  return this.kills;
};

/**
 * 获取下一个技能升级阈值，若所有阈值已触发则返回 null。
 * @returns {number|null}
 */
ScoreSystem.prototype.getNextThreshold = function() {
  if (this.currentThresholdIndex >= this.thresholds.length) {
    return null;
  }
  return this.thresholds[this.currentThresholdIndex];
};

/**
 * 获取当前分数到下一阈值的进度（0~1）。
 * 若所有阈值已触发，返回 1。
 * @returns {number}
 */
ScoreSystem.prototype.getProgress = function() {
  if (this.currentThresholdIndex >= this.thresholds.length) {
    return 1;
  }

  var nextThreshold = this.thresholds[this.currentThresholdIndex];
  var prevThreshold = this.currentThresholdIndex > 0
    ? this.thresholds[this.currentThresholdIndex - 1]
    : 0;

  var range = nextThreshold - prevThreshold;
  if (range <= 0) {
    return 1;
  }

  var progress = (this.score - prevThreshold) / range;
  return Math.min(1, Math.max(0, progress));
};

/**
 * 计算敌人的得分值，委托给 damage-calc 模块。
 * @param {{ isBoss: boolean, level: number }} enemy - 敌人对象
 * @returns {number}
 */
ScoreSystem.prototype.calculateEnemyScore = function(enemy) {
  return damageCalc.calculateEnemyScore(enemy.isBoss, enemy.level);
};

module.exports = ScoreSystem;
