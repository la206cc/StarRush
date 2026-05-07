/**
 * damage-calc.js — 伤害计算纯函数模块
 * 
 * 纯函数模块，计算伤害、治疗、波次缩放和敌人得分。
 * 不依赖微信小游戏运行时，可直接用 Jest 测试。
 */

/**
 * 计算基础伤害
 * @param {number} atk - 攻击力
 * @param {number} defense - 防御力
 * @returns {number} 最终伤害值（最小为1）
 */
function calculateDamage(atk, defense) {
  return Math.max(1, atk - defense);
}

/**
 * 计算技能伤害
 * @param {number} baseAtk - 基础攻击力
 * @param {number} skillPercent - 技能伤害百分比
 * @param {number} defense - 目标防御力
 * @returns {number} 技能伤害值（最小为1）
 */
function calculateSkillDamage(baseAtk, skillPercent, defense) {
  return Math.max(1, baseAtk * skillPercent / 100 - defense);
}

/**
 * 计算治疗量
 * @param {number} atk - 治疗者攻击力
 * @param {number} healRatio - 治疗系数
 * @param {number} skillPercent - 技能治疗百分比
 * @returns {number} 治疗量
 */
function calculateHeal(atk, healRatio, skillPercent) {
  return atk * healRatio * skillPercent / 100;
}

/**
 * 计算波次属性缩放
 * @param {number} baseValue - 基础属性值
 * @param {number} waveIndex - 波次索引（从0开始）
 * @param {number} scaleFactor - 缩放系数（0.10 ~ 0.15）
 * @returns {number} 缩放后的属性值
 */
function scaleByWave(baseValue, waveIndex, scaleFactor) {
  return baseValue * (1 + waveIndex * scaleFactor);
}

/**
 * 计算敌人得分
 * @param {boolean} isBoss - 是否为Boss
 * @param {number} level - 敌人等级
 * @returns {number} 得分值
 */
function calculateEnemyScore(isBoss, level) {
  var basePts = isBoss ? 50 : 10;
  return Math.floor(basePts * (1 + (level - 1) * 0.2));
}

module.exports = {
  calculateDamage: calculateDamage,
  calculateSkillDamage: calculateSkillDamage,
  calculateHeal: calculateHeal,
  scaleByWave: scaleByWave,
  calculateEnemyScore: calculateEnemyScore
};
