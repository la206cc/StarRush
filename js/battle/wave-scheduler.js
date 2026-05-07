/**
 * wave-scheduler.js — 波次调度器
 *
 * 根据关卡配置按时间调度敌人波次生成。
 * 解析 stageData.enemies 为波次数组，管理波次间隔计时、分批生成。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

var damageCalc = require('./damage-calc');
var gameData = require('../../data/game-data');
var EnemyEntity = require('./enemy-entity');

/**
 * 波次缩放系数（10-15% 范围内取 12%）
 */
var WAVE_SCALE_FACTOR = 0.12;

/**
 * 敌人生成区域常量
 */
var SPAWN_X_MIN = 0;
var SPAWN_X_MAX = 750;
var SPAWN_Y_MIN = 0;
var SPAWN_Y_MAX = 267;

/**
 * 全局敌人 ID 计数器
 */
var enemyIdCounter = 0;

/**
 * WaveScheduler 构造函数
 * @param {Object} stageData - 关卡配置数据，包含 enemies 数组
 */
function WaveScheduler(stageData) {
  this.waves = [];                 // 解析后的波次配置数组
  this.currentWaveIndex = 0;
  this.waveTimer = 0;              // 当前波次内分批生成计时器
  this.betweenWaveTimer = 0;       // 波次间隔计时器
  this.betweenWaveDelay = 4;       // 波次间隔（秒），首波前为准备时间
  this.spawnQueue = [];            // 待生成的敌人队列（分批生成用）
  this.spawnInterval = 0.5;        // 分批生成间隔（秒）
  this.spawnBatchSize = 4;         // 每批生成数量
  this.isComplete = false;         // 所有波次是否已完成
  this._waitingBetweenWaves = true; // 是否处于波次间隔等待中

  this._parseWaves(stageData);
}

/**
 * 解析 stageData.enemies 为波次数组
 * 每个 enemies 条目成为一个波次，Boss 敌人排在该波次最后生成。
 * @param {Object} stageData
 * @private
 */
WaveScheduler.prototype._parseWaves = function(stageData) {
  if (!stageData || !stageData.enemies || !Array.isArray(stageData.enemies)) {
    this.waves = [];
    this.isComplete = true;
    return;
  }

  var enemies = stageData.enemies;
  for (var i = 0; i < enemies.length; i++) {
    var entry = enemies[i];
    var template = gameData.getEnemyTemplate(entry.id);
    if (!template) {
      console.warn('[WaveScheduler] 找不到敌人模板: ' + entry.id + '，跳过');
      continue;
    }

    var wave = {
      waveIndex: this.waves.length,
      enemies: [],
      totalCount: entry.count || 1,
      spawnedCount: 0,
      isComplete: false
    };

    // 生成该波次的敌人列表，Boss 排在最后
    var normalEnemies = [];
    var bossEnemies = [];
    var count = entry.count || 1;

    for (var j = 0; j < count; j++) {
      var enemyConfig = {
        templateId: entry.id,
        level: entry.level || 1,
        name: template.name,
        hp: template.hp,
        attack: template.attack,
        defense: template.defense,
        speed: template.speed,
        isBoss: template.isBoss || false,
        emoji: template.emoji || '👾'
      };

      if (enemyConfig.isBoss) {
        bossEnemies.push(enemyConfig);
      } else {
        normalEnemies.push(enemyConfig);
      }
    }

    // Boss 在最后生成
    wave.enemies = normalEnemies.concat(bossEnemies);
    this.waves.push(wave);
  }

  if (this.waves.length === 0) {
    this.isComplete = true;
  }
};

/**
 * 每帧更新 — 管理波次间隔计时、分批生成
 * @param {number} dt - 帧间隔（秒）
 * @param {Object} entityManager - EntityManager 实例
 */
WaveScheduler.prototype.update = function(dt, entityManager) {
  if (this.isComplete) return;
  if (!entityManager) return;

  // 波次间隔等待阶段
  if (this._waitingBetweenWaves) {
    this.betweenWaveTimer += dt;
    if (this.betweenWaveTimer >= this.betweenWaveDelay) {
      this._waitingBetweenWaves = false;
      this.betweenWaveTimer = 0;
      this._startWave();
      // 立即生成第一批
      this._spawnBatch(entityManager);
    }
    return;
  }

  // 分批生成阶段
  if (this.spawnQueue.length > 0) {
    this.waveTimer += dt;
    if (this.waveTimer >= this.spawnInterval) {
      this.waveTimer -= this.spawnInterval;
      this._spawnBatch(entityManager);
    }
    return;
  }

  // 当前波次所有敌人已生成，检查是否进入下一波
  var currentWave = this.waves[this.currentWaveIndex];
  if (currentWave && currentWave.spawnedCount >= currentWave.totalCount) {
    currentWave.isComplete = true;

    if (this.currentWaveIndex < this.waves.length - 1) {
      // 进入下一波次间隔
      this.currentWaveIndex++;
      this._waitingBetweenWaves = true;
      this.betweenWaveTimer = 0;
    } else {
      // 所有波次已完成
      this.isComplete = true;
    }
  }
};

/**
 * 开始当前波次 — 将敌人配置加入生成队列
 * @private
 */
WaveScheduler.prototype._startWave = function() {
  var wave = this.waves[this.currentWaveIndex];
  if (!wave) return;

  // 将该波次所有敌人加入生成队列
  this.spawnQueue = wave.enemies.slice(0);
  this.waveTimer = 0;

  wave.spawnedCount = 0;
};

/**
 * 分批生成敌人
 * @param {Object} entityManager - EntityManager 实例
 * @private
 */
WaveScheduler.prototype._spawnBatch = function(entityManager) {
  var wave = this.waves[this.currentWaveIndex];
  if (!wave) return;

  var spawned = 0;
  while (spawned < this.spawnBatchSize && this.spawnQueue.length > 0) {
    if (!entityManager.canSpawnEnemy()) {
      // 达到同屏上限，等待下一帧再试
      return;
    }

    var config = this.spawnQueue.shift();
    var enemy = this._createEnemy(config, this.currentWaveIndex);
    entityManager.addEnemy(enemy);
    wave.spawnedCount++;
    spawned++;
  }
};

/**
 * 创建一个 EnemyEntity 实例
 * 使用 scaleByWave 对 HP 和攻击力进行波次缩放。
 * @param {Object} config - 敌人配置
 * @param {number} waveIndex - 当前波次索引
 * @returns {Object} EnemyEntity 实例
 * @private
 */
WaveScheduler.prototype._createEnemy = function(config, waveIndex) {
  var scaledHp = damageCalc.scaleByWave(config.hp, waveIndex, WAVE_SCALE_FACTOR);
  var scaledAttack = damageCalc.scaleByWave(config.attack, waveIndex, WAVE_SCALE_FACTOR);
  var scoreValue = damageCalc.calculateEnemyScore(config.isBoss, config.level);

  var x = Math.floor(Math.random() * (SPAWN_X_MAX - SPAWN_X_MIN + 1)) + SPAWN_X_MIN;
  var y = Math.floor(Math.random() * (SPAWN_Y_MAX - SPAWN_Y_MIN + 1)) + SPAWN_Y_MIN;

  enemyIdCounter++;

  return new EnemyEntity({
    id: 'enemy_' + enemyIdCounter,
    templateId: config.templateId,
    name: config.name,
    hp: scaledHp,
    attack: scaledAttack,
    defense: config.defense,
    speed: config.speed,
    isBoss: config.isBoss,
    x: x,
    y: y,
    scoreValue: scoreValue,
    level: config.level,
    waveIndex: waveIndex,
    emoji: config.emoji
  });
};

/**
 * 获取当前波次信息
 * @returns {Object|null} { waveIndex, totalCount, spawnedCount, isComplete }
 */
WaveScheduler.prototype.getCurrentWaveInfo = function() {
  if (this.currentWaveIndex >= this.waves.length) return null;
  var wave = this.waves[this.currentWaveIndex];
  return {
    waveIndex: wave.waveIndex,
    totalCount: wave.totalCount,
    spawnedCount: wave.spawnedCount,
    isComplete: wave.isComplete,
    totalWaves: this.waves.length
  };
};

/**
 * 获取剩余波次数（包含当前未完成的波次）
 * @returns {number}
 */
WaveScheduler.prototype.getRemainingWaves = function() {
  if (this.isComplete) return 0;
  return this.waves.length - this.currentWaveIndex;
};

/**
 * 获取下一波倒计时（秒）
 * 如果当前处于波次间隔等待中，返回剩余等待时间。
 * 否则返回 0。
 * @returns {number}
 */
WaveScheduler.prototype.getNextWaveCountdown = function() {
  if (this.isComplete) return 0;
  if (this._waitingBetweenWaves) {
    return Math.max(0, this.betweenWaveDelay - this.betweenWaveTimer);
  }
  return 0;
};

module.exports = WaveScheduler;
