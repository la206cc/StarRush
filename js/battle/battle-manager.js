/**
 * battle-manager.js — 战斗管理器
 *
 * 战斗核心逻辑协调层，管理战斗阶段状态机、子系统更新循环、
 * 英雄部署、技能升级、胜负判定。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

var EntityManager = require('./entity-manager');
var WaveScheduler = require('./wave-scheduler');
var ScoreSystem = require('./score-system');
var EnergySystem = require('./energy-system');
var PlayerBase = require('./player-base');
var HeroEntity = require('./hero-entity');

/**
 * 英雄部署区域常量
 */
var DEPLOY_X_MIN = 25;
var DEPLOY_X_MAX = 725;
var DEPLOY_Y_MIN = 1000;
var DEPLOY_Y_MAX = 1100;

/**
 * BattleManager 构造函数
 * @param {Object} config
 * @param {Object} config.stageData - 关卡配置数据
 * @param {Array}  config.heroTable - 英雄数据表
 * @param {number} [config.chargePerSec=2] - 每秒能量充能量
 */
function BattleManager(config) {
  this.phase = 'fighting';
  this.stageData = config.stageData;
  this.heroTable = config.heroTable;

  this.entityManager = new EntityManager();
  this.waveScheduler = new WaveScheduler(config.stageData);
  this.scoreSystem = new ScoreSystem();
  this.energySystem = new EnergySystem(config.chargePerSec || 2);
  this.playerBase = new PlayerBase({ x: 375, y: 1100, hp: 1000 });

  this.result = null;

  // Callbacks
  this.onScoreThreshold = null;
  this.onBattleEnd = null;
  this.onWaveWarning = null;

  // Compute baseCost: minimum cost among all heroes in heroTable
  this.baseCost = this._computeBaseCost();
}


/**
 * Compute the minimum cost among all heroes in heroTable.
 * Defaults to 20 if heroTable is empty or unavailable.
 * @returns {number}
 * @private
 */
BattleManager.prototype._computeBaseCost = function() {
  if (!this.heroTable || this.heroTable.length === 0) return 20;
  var min = Infinity;
  for (var i = 0; i < this.heroTable.length; i++) {
    var cost = this.heroTable[i].cost;
    if (typeof cost === 'number' && cost < min) {
      min = cost;
    }
  }
  return min === Infinity ? 20 : min;
};

/**
 * 每帧更新所有子系统
 * @param {number} dt - 帧间隔（秒）
 */
BattleManager.prototype.update = function(dt) {
  // Clamp dt to [0, 0.1]
  if (dt < 0) dt = 0;
  if (dt > 0.1) dt = 0.1;

  // Only update during fighting phase
  if (this.phase !== 'fighting') return;

  // 1. Wave scheduling — spawn enemies
  this.waveScheduler.update(dt, this.entityManager);

  // 2. Entity updates — heroes and enemies AI
  this.entityManager.update(dt, this.playerBase);

  // 3. PlayerBase update (flash timer, hp bar animation)
  this.playerBase.update(dt);

  // 4. Energy system update
  this.energySystem.update(dt);

  // 5. Remove dead entities and accumulate score
  var killedEnemies = this.entityManager.removeDeadEntities();
  for (var i = 0; i < killedEnemies.length; i++) {
    var enemy = killedEnemies[i];
    var points = enemy.scoreValue || 0;
    var result = this.scoreSystem.addScore(points);

    // Check score threshold callback
    if (result.thresholdReached && typeof this.onScoreThreshold === 'function') {
      this.onScoreThreshold(result.newScore);
    }
  }

  // 6. Emergency energy mode — no alive heroes → 2x charge
  var aliveHeroCount = this.entityManager.getAliveHeroCount();
  var shouldEmergency = aliveHeroCount === 0 && !this.energySystem.isFull();
  this.energySystem.setEmergencyMode(shouldEmergency);

  // 7. Wave warning callback
  var countdown = this.waveScheduler.getNextWaveCountdown();
  if (countdown > 0 && typeof this.onWaveWarning === 'function') {
    this.onWaveWarning(countdown);
  }

  // 8. Check victory / defeat conditions
  this._checkDefeat();
  this._checkVictory();
};


/**
 * 暂停战斗
 */
BattleManager.prototype.pause = function() {
  if (this.phase === 'fighting') {
    this.phase = 'paused';
  }
};

/**
 * 恢复战斗
 */
BattleManager.prototype.resume = function() {
  if (this.phase === 'paused') {
    this.phase = 'fighting';
  }
};

/**
 * 部署英雄到战场
 * @param {Object} heroData - 英雄数据（来自 heroTable）
 * @returns {Object|null} 部署的 HeroEntity 实例，失败返回 null
 */
BattleManager.prototype.deployHero = function(heroData) {
  if (!heroData) return null;

  // Check if hero is already dead in this battle
  if (this.entityManager.isHeroDead(heroData.id)) {
    return null;
  }

  var heroCost = heroData.cost || this.baseCost;

  // Check energy
  if (!this.energySystem.canDeploy(heroCost)) {
    return null;
  }

  // Random position in deploy zone
  var x = Math.floor(Math.random() * (DEPLOY_X_MAX - DEPLOY_X_MIN + 1)) + DEPLOY_X_MIN;
  var y = Math.floor(Math.random() * (DEPLOY_Y_MAX - DEPLOY_Y_MIN + 1)) + DEPLOY_Y_MIN;

  var hero = new HeroEntity({
    id: heroData.id,
    name: heroData.name,
    emoji: heroData.emoji,
    role: heroData.role,
    x: x,
    y: y,
    hp: heroData.hp || heroData.initHp || 300,
    atk: heroData.atk || heroData.initAtk || 50,
    atkSpd: heroData.atkSpd || 1.5,
    range: heroData.range || 100,
    moveSpd: heroData.moveSpd || 2,
    skills: heroData.skills ? heroData.skills.slice() : [],
    healRatio: heroData.healRatio || 0,
    buffRatio: heroData.buffRatio || 0,
    defense: heroData.defense || 0
  });

  this.entityManager.addHero(hero);
  this.energySystem.consume(heroCost);

  return hero;
};

/**
 * 应用技能升级
 * @param {string} heroId - 英雄 ID
 * @param {number} skillIndex - 技能索引
 */
BattleManager.prototype.applySkillUpgrade = function(heroId, skillIndex) {
  var heroes = this.entityManager.heroes;
  var hero = null;
  for (var i = 0; i < heroes.length; i++) {
    if (heroes[i].id === heroId && heroes[i].alive) {
      hero = heroes[i];
      break;
    }
  }
  if (!hero) return;
  if (!hero.skills || skillIndex < 0 || skillIndex >= hero.skills.length) return;

  var skill = hero.skills[skillIndex];
  if (!skill) return;

  // Upgrade: increment the skill's current level index
  if (typeof skill.currentLevel === 'undefined') {
    skill.currentLevel = 0;
  }
  if (skill.levels && skill.currentLevel < skill.levels.length - 1) {
    skill.currentLevel += 1;
    skill.percent = skill.levels[skill.currentLevel];
  }
};


/**
 * 获取当前战斗状态快照
 * @returns {Object} 状态快照
 */
BattleManager.prototype.getState = function() {
  var waveInfo = this.waveScheduler.getCurrentWaveInfo();
  return {
    phase: this.phase,
    score: this.scoreSystem.getScore(),
    kills: this.scoreSystem.getKills(),
    waveInfo: waveInfo,
    remainingWaves: this.waveScheduler.getRemainingWaves(),
    nextWaveCountdown: this.waveScheduler.getNextWaveCountdown(),
    energy: this.energySystem.getEnergy(),
    energyPercent: this.energySystem.getPercent(),
    energyFull: this.energySystem.isFull(),
    heroes: this.entityManager.heroes.slice(),
    enemies: this.entityManager.enemies.slice(),
    aliveHeroCount: this.entityManager.getAliveHeroCount(),
    aliveEnemyCount: this.entityManager.getAliveEnemies().length,
    playerBaseHp: this.playerBase.hp,
    playerBaseAlive: this.playerBase.alive,
    result: this.result
  };
};

/**
 * 检查胜利条件
 * 所有波次完成且无存活敌人时胜利。
 * @private
 */
BattleManager.prototype._checkVictory = function() {
  if (this.result) return; // Already resolved

  if (this.waveScheduler.isComplete &&
      this.entityManager.getAliveEnemies().length === 0) {
    var rewards = this._calculateRewards(true);
    this.result = {
      victory: true,
      score: this.scoreSystem.getScore(),
      kills: this.scoreSystem.getKills(),
      rewards: rewards
    };
    this.phase = 'result';
    if (typeof this.onBattleEnd === 'function') {
      this.onBattleEnd(this.result);
    }
  }
};

/**
 * 检查失败条件
 * PlayerBase.alive === false 时失败。
 * @private
 */
BattleManager.prototype._checkDefeat = function() {
  if (this.result) return; // Already resolved

  if (!this.playerBase.alive) {
    var victoryRewards = this._calculateRewards(true);
    var defeatRewards = {
      crystal: Math.floor(victoryRewards.crystal * 0.3),
      essence: Math.floor(victoryRewards.essence * 0.3),
      exp: Math.floor(victoryRewards.exp * 0.3)
    };
    this.result = {
      victory: false,
      score: this.scoreSystem.getScore(),
      kills: this.scoreSystem.getKills(),
      rewards: defeatRewards
    };
    this.phase = 'result';
    if (typeof this.onBattleEnd === 'function') {
      this.onBattleEnd(this.result);
    }
  }
};

/**
 * 计算奖励
 * 胜利：在 stageData.rewards 范围内随机取值
 * 失败：胜利奖励的 30%
 * @param {boolean} isVictory
 * @returns {Object} { crystal, essence, exp }
 * @private
 */
BattleManager.prototype._calculateRewards = function(isVictory) {
  var rewards = (this.stageData && this.stageData.rewards) || {};
  var crystal = this._randomInRange(rewards.crystal);
  var essence = this._randomInRange(rewards.essence);
  var exp = this._randomInRange(rewards.exp);

  if (!isVictory) {
    crystal = Math.floor(crystal * 0.3);
    essence = Math.floor(essence * 0.3);
    exp = Math.floor(exp * 0.3);
  }

  return { crystal: crystal, essence: essence, exp: exp };
};

/**
 * 在 [min, max] 范围内随机取整数值
 * @param {Array|undefined} range - [min, max] 数组
 * @returns {number}
 * @private
 */
BattleManager.prototype._randomInRange = function(range) {
  if (!range || !Array.isArray(range) || range.length < 2) return 0;
  var min = range[0];
  var max = range[1];
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = BattleManager;
