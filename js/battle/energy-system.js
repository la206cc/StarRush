/**
 * energy-system.js — 能量系统模块
 *
 * 持续充能模式：每秒固定充能，部署英雄消耗对应 cost 的能量。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

/**
 * EnergySystem 构造函数
 * @param {number} [chargePerSec=2] - 每秒充能量
 */
function EnergySystem(chargePerSec) {
  this.energy = 0;
  this.maxEnergy = 100;
  this.chargeRate = chargePerSec || 2;       // 每秒充能量
  this.emergencyMultiplier = 1;               // 紧急充能倍率
}

/**
 * 每帧更新能量，按 chargeRate * emergencyMultiplier 充能，钳制在 [0, maxEnergy]。
 * @param {number} dt - 帧间隔（秒）
 */
EnergySystem.prototype.update = function(dt) {
  this.energy += this.chargeRate * this.emergencyMultiplier * dt;
  if (this.energy > this.maxEnergy) {
    this.energy = this.maxEnergy;
  }
  if (this.energy < 0) {
    this.energy = 0;
  }
};

/**
 * 判断当前能量是否足够部署英雄。
 * @param {number} heroCost - 英雄的 cost 值
 * @returns {boolean}
 */
EnergySystem.prototype.canDeploy = function(heroCost) {
  return this.energy >= (heroCost || 0);
};

/**
 * 消耗指定数量的能量。
 * @param {number} amount - 消耗量
 */
EnergySystem.prototype.consume = function(amount) {
  this.energy -= (amount || 0);
  if (this.energy < 0) this.energy = 0;
};

/**
 * 设置紧急充能模式。
 * 当场上无存活英雄且能量未满时启用，充能速率 ×2。
 * @param {boolean} active - 是否启用紧急充能
 */
EnergySystem.prototype.setEmergencyMode = function(active) {
  this.emergencyMultiplier = active ? 2 : 1;
};

/**
 * 获取当前能量值。
 * @returns {number}
 */
EnergySystem.prototype.getEnergy = function() {
  return this.energy;
};

/**
 * 获取当前能量百分比（0~1）。
 * @returns {number}
 */
EnergySystem.prototype.getPercent = function() {
  return this.energy / this.maxEnergy;
};

/**
 * 判断能量是否已满。
 * @returns {boolean}
 */
EnergySystem.prototype.isFull = function() {
  return this.energy >= this.maxEnergy;
};

module.exports = EnergySystem;
