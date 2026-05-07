/**
 * battle-scene.js — 战斗场景控制器
 *
 * 完整的战斗场景实现，管理 prepare → fighting → paused → result 四阶段。
 * 渲染/交互层，将战斗逻辑委托给 BattleManager。
 * 使用 Constructor + prototype 模式，CommonJS 导出。
 */

var BattleManager = require('../battle/battle-manager');
var Panel = require('../ui/panel');
var ProgressBar = require('../ui/progress-bar');
var Button = require('../ui/button');
var gameData = require('../../data/game-data');

// ==================== 布局常量 ====================

var LAYOUT = {
  battleArea: { x: 0, y: 0, w: 750, h: 950 },
  playerBase: { x: 325, y: 1050, w: 100, h: 50 },
  spawnZone: { y: 0, maxY: 267 },
  deployZone: { yMin: 1000, yMax: 1100 },
  bottomArea: { x: 0, y: 950, w: 750, h: 384 },
  energyBar: { x: 75, y: 1100, w: 600, h: 30 },
  heroSlotPanel: { x: 25, y: 1150, w: 700, h: 130, maxSlots: 5 },
  scoreBar: { x: 0, y: 10, w: 750, h: 40 },
  pauseBtn: { x: 680, y: 10, w: 50, h: 40 }
};

var SLOT_WIDTH = 130;
var SLOT_HEIGHT = 110;
var SLOT_GAP = 10;

// ==================== BattleScene 构造函数 ====================

function BattleScene(game) {
  this.game = game;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.DESIGN_W = 750;
  this.DESIGN_H = 1334;

  this.phase = 'prepare';
  this.battleManager = null;
  this.chapterData = null;
  this.stageData = null;

  // UI component instances
  this.chapterInfoPanel = null;
  this.heroSlotPanel = null;
  this.energyBar = null;
  this.scoreBar = null;
  this.skillUpgradePanel = null;
  this.resultPanel = null;
  this.pauseMenu = null;

  // Hero data
  this.ownedHeroes = [];
  this.skillOptions = [];
  this.resultData = null;

  // Toast system
  this._toastText = '';
  this._toastTimer = 0;
}

// ==================== 8.1 — Scene Controller Foundation ====================

/**
 * onEnter — parse chapter/stage params, init UI, register touch areas, create BattleManager
 */
BattleScene.prototype.onEnter = function(params) {
  console.log('[BattleScene] onEnter');
  this.phase = 'prepare';
  this.resultData = null;
  this.skillOptions = [];
  this._toastText = '';
  this._toastTimer = 0;

  // Parse chapter/stage params
  this.chapterData = (params && params.chapter) ? params.chapter : null;
  if (!this.chapterData) {
    console.error('[BattleScene] 缺少章节数据，返回主页');
    this.game.sceneManager.switchScene('home');
    return;
  }

  // Pick first unlocked stage (or first stage)
  var stages = this.chapterData.stages || [];
  this.stageData = null;
  for (var i = 0; i < stages.length; i++) {
    if (!stages[i].isCleared || i === 0) {
      this.stageData = stages[i];
      break;
    }
  }
  if (!this.stageData && stages.length > 0) {
    this.stageData = stages[0];
  }

  // Load owned heroes for battle deployment
  var allHeroes = gameData.getDefaultHeroes();
  this.ownedHeroes = [];
  for (var h = 0; h < allHeroes.length; h++) {
    if (allHeroes[h].owned === true) {
      this.ownedHeroes.push(allHeroes[h]);
    }
  }

  this._initUI();
  this._registerTouchAreas();
};

/**
 * onExit — clear touch areas, destroy BattleManager
 */
BattleScene.prototype.onExit = function() {
  console.log('[BattleScene] onExit');
  this.touchManager.clearAreas();
  this.battleManager = null;
  this.chapterInfoPanel = null;
  this.pauseMenu = null;
  this.skillUpgradePanel = null;
  this.resultPanel = null;
  this.energyBar = null;
};

/**
 * _initUI — create all UI component instances
 */
BattleScene.prototype._initUI = function() {
  var self = this;

  // Chapter Info Panel (prepare phase)
  this.chapterInfoPanel = new Panel({
    x: 56,
    y: 120,
    width: 638,
    height: 750,
    title: this.chapterData ? this.chapterData.name : '章节信息',
    closable: false,
    visible: false
  });
  this.chapterInfoPanel.show();

  // Energy Bar (fighting phase)
  this.energyBar = new ProgressBar({
    x: LAYOUT.energyBar.x,
    y: LAYOUT.energyBar.y,
    width: LAYOUT.energyBar.w,
    height: LAYOUT.energyBar.h,
    value: 0,
    maxValue: 100,
    fillColor: '#4fc3f7',
    gradientColors: ['#4fc3f7', '#69f0ae'],
    glow: false,
    showText: true,
    textPosition: 'inside',
    animated: true,
    borderRadius: 15
  });

  // Pause Menu Panel
  this.pauseMenu = new Panel({
    x: 175,
    y: 400,
    width: 400,
    height: 300,
    title: '暂停',
    closable: false,
    visible: false
  });

  // Skill Upgrade Panel
  this.skillUpgradePanel = new Panel({
    x: 56,
    y: 250,
    width: 638,
    height: 500,
    title: '技能升级',
    closable: false,
    visible: false
  });

  // Result Panel
  this.resultPanel = new Panel({
    x: 56,
    y: 200,
    width: 638,
    height: 650,
    title: '战斗结算',
    closable: false,
    visible: false
  });
};

/**
 * _registerTouchAreas — register pause button, hero slots, start battle button, back button
 */
BattleScene.prototype._registerTouchAreas = function() {
  var self = this;

  // Back button (prepare phase)
  this.touchManager.registerArea('battle-back', 10, 10, 80, 50, function() {
    if (self.phase === 'prepare') {
      self.game.sceneManager.switchScene('home');
    }
  });

  // Start battle button (prepare phase)
  this.touchManager.registerArea('start-battle', 225, 780, 300, 60, function() {
    if (self.phase === 'prepare') {
      self._onStartBattle();
    }
  });

  // Pause button (fighting phase)
  this.touchManager.registerArea('pause-btn', LAYOUT.pauseBtn.x, LAYOUT.pauseBtn.y,
    LAYOUT.pauseBtn.w, LAYOUT.pauseBtn.h, function() {
    if (self.phase === 'fighting') {
      self._onPause();
    }
  });

  // Hero slot touch areas (fighting phase)
  for (var i = 0; i < Math.min(this.ownedHeroes.length, LAYOUT.heroSlotPanel.maxSlots); i++) {
    (function(index) {
      var slotX = LAYOUT.heroSlotPanel.x + index * (SLOT_WIDTH + SLOT_GAP);
      var slotY = LAYOUT.heroSlotPanel.y;
      self.touchManager.registerArea('hero-slot-' + index, slotX, slotY,
        SLOT_WIDTH, SLOT_HEIGHT, function() {
        if (self.phase === 'fighting') {
          self._onHeroSlotClick(index);
        }
      });
    })(i);
  }

  // Pause menu: Continue button
  this.touchManager.registerArea('pause-continue', 225, 500, 300, 50, function() {
    if (self.phase === 'paused' && self.pauseMenu && self.pauseMenu.isVisible()) {
      if (!self.skillUpgradePanel || !self.skillUpgradePanel.isVisible()) {
        self._onResume();
      }
    }
  });

  // Pause menu: Exit button
  this.touchManager.registerArea('pause-exit', 225, 570, 300, 50, function() {
    if (self.phase === 'paused' && self.pauseMenu && self.pauseMenu.isVisible()) {
      if (!self.skillUpgradePanel || !self.skillUpgradePanel.isVisible()) {
        self.game.sceneManager.switchScene('home');
      }
    }
  });

  // Skill upgrade options (3 options)
  for (var s = 0; s < 3; s++) {
    (function(idx) {
      var optY = 330 + idx * 120;
      self.touchManager.registerArea('skill-opt-' + idx, 80, optY, 590, 100, function() {
        if (self.phase === 'paused' && self.skillUpgradePanel.isVisible()) {
          self._onSkillSelected(idx);
        }
      });
    })(s);
  }

  // Result panel: Return Home button
  this.touchManager.registerArea('result-home', 225, 750, 300, 60, function() {
    if (self.phase === 'result') {
      self.game.sceneManager.switchScene('home', { settlement: self.resultData });
    }
  });
};

/**
 * update(dt) — delegate to BattleManager based on phase, update UI components
 */
BattleScene.prototype.update = function(dt) {
  // Toast timer
  if (this._toastTimer > 0) {
    this._toastTimer -= dt;
    if (this._toastTimer <= 0) {
      this._toastTimer = 0;
      this._toastText = '';
    }
  }

  if (this.phase === 'prepare') {
    if (this.chapterInfoPanel) this.chapterInfoPanel.update(dt * 1000);
  } else if (this.phase === 'fighting') {
    // Update battle manager
    if (this.battleManager) {
      this.battleManager.update(dt);

      // Sync energy bar
      var state = this.battleManager.getState();
      this.energyBar.setValue(state.energy);
      this.energyBar.glow = state.energyFull;
    }
    if (this.energyBar) this.energyBar.update(dt * 1000);
  } else if (this.phase === 'paused') {
    if (this.pauseMenu) this.pauseMenu.update(dt * 1000);
    if (this.skillUpgradePanel) this.skillUpgradePanel.update(dt * 1000);
  } else if (this.phase === 'result') {
    if (this.resultPanel) this.resultPanel.update(dt * 1000);
  }
};

/**
 * render(ctx) — render battle area background, all entities, UI components
 */
BattleScene.prototype.render = function(ctx) {
  var W = this.DESIGN_W;
  var H = this.DESIGN_H;

  // Background
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, W, H);

  if (this.phase === 'prepare') {
    this._renderPreparePhase(ctx);
  } else if (this.phase === 'fighting') {
    this._renderFightingPhase(ctx);
  } else if (this.phase === 'paused') {
    this._renderFightingPhase(ctx);
    this._renderPauseOverlay(ctx);
  } else if (this.phase === 'result') {
    this._renderFightingPhase(ctx);
    this._renderResultPanel(ctx);
  }

  // Toast overlay
  if (this._toastText && this._toastTimer > 0) {
    this._renderToast(ctx);
  }
};

// ==================== 8.2 — Prepare Phase ====================

/**
 * Render prepare phase: ChapterInfoPanel with chapter details
 */
BattleScene.prototype._renderPreparePhase = function(ctx) {
  var W = this.DESIGN_W;

  // Back button
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('< 返回', 20, 35);

  // Render chapter info panel
  if (this.chapterInfoPanel) {
    this.chapterInfoPanel.render(ctx);
  }

  // Draw chapter info content inside panel
  if (this.chapterData && this.chapterInfoPanel) {
    var region = this.chapterInfoPanel.getContentRegion();
    var cx = region.x;
    var cy = region.y;
    var cw = region.width;

    ctx.save();

    // Chapter name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.chapterData.name, cx + cw / 2, cy);

    // Description
    ctx.fillStyle = '#8892b0';
    ctx.font = '20px sans-serif';
    ctx.fillText(this.chapterData.description || '', cx + cw / 2, cy + 40);

    // Difficulty stars
    var stars = '';
    for (var d = 0; d < (this.chapterData.difficulty || 1); d++) stars += '★';
    ctx.fillStyle = '#ffd740';
    ctx.font = '22px sans-serif';
    ctx.fillText('难度: ' + stars, cx + cw / 2, cy + 75);

    // Enemy types
    ctx.fillStyle = '#ff8a80';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('敌人类型:', cx, cy + 120);

    var enemyY = cy + 150;
    if (this.stageData && this.stageData.enemies) {
      for (var e = 0; e < this.stageData.enemies.length; e++) {
        var enemyEntry = this.stageData.enemies[e];
        var template = gameData.getEnemyTemplate(enemyEntry.id);
        if (template) {
          var qualityColor = '#9e9e9e';
          if (template.quality === 'rare') qualityColor = '#4fc3f7';
          else if (template.quality === 'epic') qualityColor = '#7c4dff';
          ctx.fillStyle = qualityColor;
          ctx.fillText('  • ' + template.name + ' (x' + (enemyEntry.count || 1) + ')', cx, enemyY);
          enemyY += 28;
        }
      }
    }

    // Rewards
    ctx.fillStyle = '#69f0ae';
    ctx.font = '18px sans-serif';
    ctx.fillText('通关奖励:', cx, enemyY + 15);
    enemyY += 45;

    if (this.stageData && this.stageData.rewards) {
      var rewards = this.stageData.rewards;
      if (rewards.crystal) {
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText('  💎 晶矿: ' + rewards.crystal[0] + ' ~ ' + rewards.crystal[1], cx, enemyY);
        enemyY += 26;
      }
      if (rewards.essence) {
        ctx.fillStyle = '#7c4dff';
        ctx.fillText('  🧪 源质: ' + rewards.essence[0] + ' ~ ' + rewards.essence[1], cx, enemyY);
        enemyY += 26;
      }
      if (rewards.exp) {
        ctx.fillStyle = '#ffd740';
        ctx.fillText('  ⭐ 经验: ' + rewards.exp[0] + ' ~ ' + rewards.exp[1], cx, enemyY);
        enemyY += 26;
      }
    }

    // Recommended power
    if (this.stageData && this.stageData.recommendedPower) {
      ctx.fillStyle = '#ff8a80';
      ctx.font = '18px sans-serif';
      ctx.fillText('推荐战力: ' + this.stageData.recommendedPower, cx, enemyY + 15);
    }

    ctx.restore();
  }

  // Start Battle button
  ctx.fillStyle = 'rgba(105,240,174,0.3)';
  _drawRoundRect(ctx, 225, 780, 300, 60, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(105,240,174,0.5)';
  ctx.lineWidth = 2;
  _drawRoundRect(ctx, 225, 780, 300, 60, 14);
  ctx.stroke();
  ctx.fillStyle = '#69f0ae';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚔️ 开始战斗', this.DESIGN_W / 2, 810);
};

/**
 * _onStartBattle — switch phase to fighting, create BattleManager
 */
BattleScene.prototype._onStartBattle = function() {
  var self = this;
  this.phase = 'fighting';

  if (this.chapterInfoPanel) {
    this.chapterInfoPanel.hide();
  }

  // Create BattleManager
  this.battleManager = new BattleManager({
    stageData: this.stageData,
    heroTable: this.ownedHeroes,
    chargePerSec: 2
  });

  // Wire callbacks
  this.battleManager.onScoreThreshold = function(score) {
    self._onScoreThreshold(score);
  };
  this.battleManager.onBattleEnd = function(result) {
    self._onBattleEnd(result);
  };
  this.battleManager.onWaveWarning = function(countdown) {
    self._waveCountdown = countdown;
  };

  this._waveCountdown = 0;
};

// ==================== 8.3 — Fighting Phase UI ====================

/**
 * Render fighting phase: battle area, entities, energy bar, hero slots, score bar, pause btn
 */
BattleScene.prototype._renderFightingPhase = function(ctx) {
  var W = this.DESIGN_W;

  // Battle area background
  ctx.fillStyle = '#0d1b3e';
  ctx.fillRect(LAYOUT.battleArea.x, LAYOUT.battleArea.y, LAYOUT.battleArea.w, LAYOUT.battleArea.h);

  // Spawn zone indicator
  ctx.fillStyle = 'rgba(255, 82, 82, 0.05)';
  ctx.fillRect(0, LAYOUT.spawnZone.y, W, LAYOUT.spawnZone.maxY);

  // Bottom area background
  ctx.fillStyle = 'rgba(20, 20, 45, 0.95)';
  ctx.fillRect(LAYOUT.bottomArea.x, LAYOUT.bottomArea.y, LAYOUT.bottomArea.w, LAYOUT.bottomArea.h);

  // Render entities
  if (this.battleManager) {
    var em = this.battleManager.entityManager;

    // Render player base
    if (this.battleManager.playerBase) {
      this.battleManager.playerBase.render(ctx);
    }

    // Render enemies
    for (var e = 0; e < em.enemies.length; e++) {
      if (em.enemies[e].alive) {
        em.enemies[e].render(ctx);
      }
    }

    // Render heroes
    for (var h = 0; h < em.heroes.length; h++) {
      if (em.heroes[h].alive) {
        em.heroes[h].render(ctx);
      }
    }
  }

  // Score Bar (top)
  this._renderScoreBar(ctx);

  // Pause button (top right)
  this._renderPauseButton(ctx);

  // Energy Bar
  if (this.energyBar) {
    this.energyBar.render(ctx);
  }

  // Hero Slot Panel
  this._renderHeroSlotPanel(ctx);
};

/**
 * Render score bar at top of screen — 含升级进度条
 */
BattleScene.prototype._renderScoreBar = function(ctx) {
  var W = this.DESIGN_W;

  // Score bar background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(LAYOUT.scoreBar.x, LAYOUT.scoreBar.y, LAYOUT.scoreBar.w, LAYOUT.scoreBar.h);

  if (!this.battleManager) return;

  var state = this.battleManager.getState();

  // Score text
  ctx.fillStyle = '#ffd740';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('分数: ' + state.score, 15, LAYOUT.scoreBar.y + LAYOUT.scoreBar.h / 2);

  // Wave info
  ctx.fillStyle = '#4fc3f7';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  var waveText = '';
  if (state.waveInfo) {
    waveText = '波次 ' + (state.waveInfo.waveIndex + 1) + '/' + (state.waveInfo.totalWaves || 1);
  }
  ctx.fillText(waveText, W / 2, LAYOUT.scoreBar.y + LAYOUT.scoreBar.h / 2);

  // 升级进度条（显示距离下一次升级的进度）
  var scoreSystem = this.battleManager.scoreSystem;
  var nextThreshold = scoreSystem.getNextThreshold();
  if (nextThreshold !== null) {
    var progress = scoreSystem.getProgress();
    var barX = 15, barY = LAYOUT.scoreBar.y + LAYOUT.scoreBar.h + 4, barW = W - 30, barH = 8;
    _drawRoundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    if (progress > 0) {
      _drawRoundRect(ctx, barX, barY, barW * progress, barH, 4);
      ctx.fillStyle = '#ffd740'; ctx.fill();
    }
    ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd740';
    ctx.fillText('下次升级: ' + nextThreshold, barX + barW, barY + barH + 12);
  }

  // Next wave countdown
  if (this._waveCountdown > 0) {
    ctx.fillStyle = '#ff8a80';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('下一波: ' + Math.ceil(this._waveCountdown) + '秒', W / 2, LAYOUT.scoreBar.y + LAYOUT.scoreBar.h + 28);
  }
};

/**
 * Render pause button
 */
BattleScene.prototype._renderPauseButton = function(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  _drawRoundRect(ctx, LAYOUT.pauseBtn.x, LAYOUT.pauseBtn.y, LAYOUT.pauseBtn.w, LAYOUT.pauseBtn.h, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏸', LAYOUT.pauseBtn.x + LAYOUT.pauseBtn.w / 2, LAYOUT.pauseBtn.y + LAYOUT.pauseBtn.h / 2);
};

/**
 * Render hero slot panel at bottom
 */
BattleScene.prototype._renderHeroSlotPanel = function(ctx) {
  var panelX = LAYOUT.heroSlotPanel.x;
  var panelY = LAYOUT.heroSlotPanel.y;
  var deadHeroIds = this.battleManager ? this.battleManager.entityManager.deadHeroIds : [];
  var currentEnergy = this.battleManager ? this.battleManager.energySystem.getEnergy() : 0;

  for (var i = 0; i < Math.min(this.ownedHeroes.length, LAYOUT.heroSlotPanel.maxSlots); i++) {
    var hero = this.ownedHeroes[i];
    var slotX = panelX + i * (SLOT_WIDTH + SLOT_GAP);
    var slotY = panelY;
    var isDead = deadHeroIds.indexOf(hero.id) !== -1;
    var canAfford = !isDead && currentEnergy >= (hero.cost || 0);

    ctx.save();

    // Slot background
    if (isDead) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.globalAlpha = 0.5;
    } else if (!canAfford) {
      ctx.fillStyle = 'rgba(60, 60, 80, 0.3)';
      ctx.globalAlpha = 0.7;
    } else {
      ctx.fillStyle = 'rgba(79, 195, 247, 0.12)';
    }
    _drawRoundRect(ctx, slotX, slotY, SLOT_WIDTH, SLOT_HEIGHT, 10);
    ctx.fill();

    // Slot border — glow green when affordable
    ctx.strokeStyle = isDead ? 'rgba(100,100,100,0.3)' :
                      canAfford ? 'rgba(105, 240, 174, 0.5)' : 'rgba(79, 195, 247, 0.2)';
    ctx.lineWidth = canAfford ? 1.5 : 1;
    _drawRoundRect(ctx, slotX, slotY, SLOT_WIDTH, SLOT_HEIGHT, 10);
    ctx.stroke();

    // Hero emoji
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDead ? '#666666' : '#ffffff';
    ctx.fillText(hero.emoji, slotX + SLOT_WIDTH / 2, slotY + 35);

    // Hero name
    ctx.font = '14px sans-serif';
    ctx.fillStyle = isDead ? '#666666' : '#ffffff';
    ctx.fillText(hero.name, slotX + SLOT_WIDTH / 2, slotY + 65);

    // Cost — highlight when affordable
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = isDead ? '#555555' : canAfford ? '#69f0ae' : '#ffd740';
    ctx.fillText('⚡' + hero.cost, slotX + SLOT_WIDTH / 2, slotY + 88);

    // Dead overlay text
    if (isDead) {
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#ff5252';
      ctx.fillText('阵亡', slotX + SLOT_WIDTH / 2, slotY + SLOT_HEIGHT / 2);
    }

    ctx.restore();
  }
};

/**
 * _onHeroSlotClick — deploy hero if energy sufficient
 */
BattleScene.prototype._onHeroSlotClick = function(index) {
  if (!this.battleManager) return;
  if (index < 0 || index >= this.ownedHeroes.length) return;

  var hero = this.ownedHeroes[index];

  // Check if hero is dead
  if (this.battleManager.entityManager.isHeroDead(hero.id)) {
    return;
  }

  // Try to deploy
  var deployed = this.battleManager.deployHero(hero);
  if (!deployed) {
    // Energy insufficient
    this._showToast('能量不足');
  }
};

/**
 * _onPause — pause battle
 */
BattleScene.prototype._onPause = function() {
  this.phase = 'paused';
  if (this.battleManager) {
    this.battleManager.pause();
  }
  if (this.pauseMenu) {
    this.pauseMenu.show();
  }
};

/**
 * _onResume — resume battle
 */
BattleScene.prototype._onResume = function() {
  this.phase = 'fighting';
  if (this.battleManager) {
    this.battleManager.resume();
  }
  if (this.pauseMenu) {
    this.pauseMenu.hide();
  }
};

// ==================== 8.4 — Pause Menu and Skill Upgrade Panel ====================

/**
 * Render pause overlay (pause menu or skill upgrade panel)
 */
BattleScene.prototype._renderPauseOverlay = function(ctx) {
  if (this.skillUpgradePanel && this.skillUpgradePanel.isVisible()) {
    this._renderSkillUpgradePanel(ctx);
  } else if (this.pauseMenu && this.pauseMenu.isVisible()) {
    this._renderPauseMenu(ctx);
  }
};

/**
 * Render pause menu
 */
BattleScene.prototype._renderPauseMenu = function(ctx) {
  var W = this.DESIGN_W;

  this.pauseMenu.render(ctx);

  var region = this.pauseMenu.getContentRegion();

  // Continue button
  ctx.fillStyle = 'rgba(105, 240, 174, 0.25)';
  _drawRoundRect(ctx, 225, 500, 300, 50, 12);
  ctx.fill();
  ctx.fillStyle = '#69f0ae';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('继续战斗', W / 2, 525);

  // Exit button
  ctx.fillStyle = 'rgba(255, 82, 82, 0.25)';
  _drawRoundRect(ctx, 225, 570, 300, 50, 12);
  ctx.fill();
  ctx.fillStyle = '#ff5252';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('退出战斗', W / 2, 595);
};

/**
 * _onScoreThreshold — triggered by BattleManager when score reaches threshold
 */
BattleScene.prototype._onScoreThreshold = function(score) {
  // Pause battle
  this.phase = 'paused';
  if (this.battleManager) {
    this.battleManager.pause();
  }

  // Collect skill upgrade options from deployed heroes
  this.skillOptions = this._collectSkillOptions();

  if (this.skillOptions.length === 0) {
    // No upgradeable skills, resume immediately
    this._onResume();
    return;
  }

  // Show skill upgrade panel
  if (this.skillUpgradePanel) {
    this.skillUpgradePanel.show();
  }
};

/**
 * Collect up to 3 random skill upgrade options — 肉鸽风格
 * 使用 BATTLE_UPGRADE_POOL 生成丰富的升级选项
 */
BattleScene.prototype._collectSkillOptions = function() {
  if (!this.battleManager) return [];

  // 尝试使用新的升级池
  if (typeof gameData.generateBattleUpgradeOptions === 'function') {
    var heroes = this.battleManager.entityManager.heroes;
    var aliveHero = null;
    for (var h = 0; h < heroes.length; h++) {
      if (heroes[h].alive) { aliveHero = heroes[h]; break; }
    }
    if (aliveHero) {
      // 收集当前已有的升级
      var currentUpgrades = this.battleManager._battleUpgrades || {};
      var opts = gameData.generateBattleUpgradeOptions(aliveHero, currentUpgrades);
      if (opts && opts.length > 0) {
        // 标记为全局升级（影响所有英雄）
        for (var o = 0; o < opts.length; o++) {
          opts[o].isGlobal = true;
        }
        return opts;
      }
    }
  }

  // 回退：使用旧的英雄技能升级逻辑
  var heroes2 = this.battleManager.entityManager.heroes;
  var options = [];
  for (var i = 0; i < heroes2.length; i++) {
    var hero = heroes2[i];
    if (!hero.alive || !hero.skills) continue;
    for (var s = 0; s < hero.skills.length; s++) {
      var skill = hero.skills[s];
      if (!skill || !skill.levels) continue;
      var currentLevel = skill.currentLevel || 0;
      if (currentLevel < skill.levels.length - 1) {
        options.push({
          heroId: hero.id, heroName: hero.name, heroEmoji: hero.emoji,
          skillIndex: s, skillName: skill.name || '技能', skillIcon: skill.icon || '⚡',
          currentLevel: currentLevel, nextLevel: currentLevel + 1,
          nextPercent: skill.levels[currentLevel + 1]
        });
      }
    }
  }
  // Shuffle and pick up to 3
  for (var j = options.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var temp = options[j]; options[j] = options[k]; options[k] = temp;
  }
  return options.slice(0, 3);
};

/**
 * Render skill upgrade panel — 肉鸽风格升级选择
 */
BattleScene.prototype._renderSkillUpgradePanel = function(ctx) {
  var W = this.DESIGN_W;

  this.skillUpgradePanel.render(ctx);

  // Title hint
  ctx.fillStyle = '#8892b0';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('选择一项升级', W / 2, 310);

  // Render skill options
  for (var i = 0; i < this.skillOptions.length; i++) {
    var opt = this.skillOptions[i];
    var optY = 330 + i * 120;

    // Option background with category color
    var catColors = {
      basic: 'rgba(105,240,174,0.08)', mechanic: 'rgba(79,195,247,0.08)',
      special: 'rgba(255,215,0,0.08)', combo: 'rgba(180,74,255,0.08)'
    };
    var borderColors = {
      basic: 'rgba(105,240,174,0.3)', mechanic: 'rgba(79,195,247,0.3)',
      special: 'rgba(255,215,0,0.3)', combo: 'rgba(180,74,255,0.3)'
    };
    var bgCol = (opt.category && catColors[opt.category]) || 'rgba(79,195,247,0.1)';
    var bdCol = (opt.category && borderColors[opt.category]) || 'rgba(79,195,247,0.3)';

    _drawRoundRect(ctx, 80, optY, 590, 100, 12);
    ctx.fillStyle = bgCol; ctx.fill();
    ctx.strokeStyle = bdCol; ctx.lineWidth = 1.5;
    _drawRoundRect(ctx, 80, optY, 590, 100, 12); ctx.stroke();

    if (opt.isGlobal) {
      // 新版肉鸽升级选项
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.icon + '  ' + opt.name, 100, optY + 32);

      // 类别标签
      var catLabels = { basic:'基础', mechanic:'机制', special:'特殊', combo:'组合' };
      var catTextColors = { basic:'#69f0ae', mechanic:'#4fc3f7', special:'#ffd740', combo:'#B44AFF' };
      if (opt.category) {
        ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
        ctx.fillStyle = catTextColors[opt.category] || '#888';
        ctx.fillText('[' + (catLabels[opt.category] || '') + ']', 650, optY + 22);
      }

      // 效果描述
      ctx.fillStyle = '#aabbcc';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(opt.desc, 100, optY + 62);

      // 等级
      ctx.fillStyle = '#ffd740';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Lv.' + opt.nextLevel, 650, optY + 62);
    } else {
      // 旧版英雄技能升级
      ctx.fillStyle = '#ffffff';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.heroEmoji + ' ' + opt.heroName, 100, optY + 30);

      ctx.fillStyle = '#ffd740';
      ctx.font = '18px sans-serif';
      ctx.fillText(opt.skillIcon + ' ' + opt.skillName, 100, optY + 60);

      ctx.fillStyle = '#69f0ae';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Lv.' + (opt.currentLevel + 1) + ' → Lv.' + (opt.nextLevel + 1), 650, optY + 45);
      ctx.fillText(opt.nextPercent + '%', 650, optY + 70);
    }
  }
};

/**
 * _onSkillSelected — apply skill upgrade and resume
 * 支持新版肉鸽全局升级和旧版英雄技能升级
 */
BattleScene.prototype._onSkillSelected = function(index) {
  if (index < 0 || index >= this.skillOptions.length) return;

  var opt = this.skillOptions[index];

  if (opt.isGlobal && this.battleManager) {
    // 新版肉鸽升级：应用全局效果到所有存活英雄
    if (!this.battleManager._battleUpgrades) this.battleManager._battleUpgrades = {};
    var curLv = this.battleManager._battleUpgrades[opt.id] || 0;
    this.battleManager._battleUpgrades[opt.id] = curLv + 1;

    // 应用效果到所有存活英雄
    var heroes = this.battleManager.entityManager.heroes;
    for (var h = 0; h < heroes.length; h++) {
      var hero = heroes[h];
      if (!hero.alive) continue;
      this._applyBattleUpgrade(hero, opt);
    }
    this._showToast(opt.icon + ' ' + opt.name + ' Lv.' + (curLv + 1));
  } else if (this.battleManager) {
    // 旧版英雄技能升级
    this.battleManager.applySkillUpgrade(opt.heroId, opt.skillIndex);
  }

  // Close panel and resume
  if (this.skillUpgradePanel) this.skillUpgradePanel.hide();
  this.skillOptions = [];
  this._onResume();
};

/**
 * 应用战斗中升级效果到英雄
 */
BattleScene.prototype._applyBattleUpgrade = function(hero, opt) {
  if (!hero || !opt) return;
  var val = opt.perLevel;
  if (opt.type === 'percent') {
    // 百分比加成
    if (opt.stat === 'atk') hero.atk = Math.round(hero.atk * (1 + val / 100));
    else if (opt.stat === 'hp') {
      var bonus = Math.round(hero.maxHp * val / 100);
      hero.maxHp += bonus; hero.hp += bonus;
      hero.hpBar.maxValue = hero.maxHp; hero.hpBar.setValue(hero.hp);
    }
    else if (opt.stat === 'atkSpd') hero.atkSpd = Math.max(0.3, hero.atkSpd * (1 - val / 100));
  } else {
    // 固定值加成
    if (opt.stat === 'defense') hero.defense = (hero.defense || 0) + val;
    else if (opt.stat === 'range') hero.range += val;
    else if (opt.stat === 'extraHits') hero.extraHits = (hero.extraHits || 0) + val;
    else if (opt.stat === 'splitCount') hero.splitCount = (hero.splitCount || 0) + val;
    else if (opt.stat === 'pierceCount') hero.pierceCount = (hero.pierceCount || 0) + val;
    else if (opt.stat === 'chainCount') hero.chainCount = (hero.chainCount || 0) + val;
    else if (opt.stat === 'burnChance') hero.burnChance = (hero.burnChance || 0) + val;
    else if (opt.stat === 'freezeChance') hero.freezeChance = (hero.freezeChance || 0) + val;
    else if (opt.stat === 'lifesteal') hero.lifesteal = (hero.lifesteal || 0) + val;
    else if (opt.stat === 'critChance') hero.critChance = (hero.critChance || 0) + val;
    else if (opt.stat === 'knockback') hero.knockback = (hero.knockback || 0) + val;
  }
};

// ==================== 8.5 — Result Phase ====================

/**
 * _onBattleEnd — called when battle ends (victory or defeat)
 */
BattleScene.prototype._onBattleEnd = function(result) {
  this.phase = 'result';
  this.resultData = result;

  if (this.resultPanel) {
    this.resultPanel.title = result.victory ? '🎉 胜利' : '💀 失败';
    this.resultPanel.show();
  }
};

/**
 * Render result panel
 */
BattleScene.prototype._renderResultPanel = function(ctx) {
  var W = this.DESIGN_W;

  if (!this.resultPanel || !this.resultData) return;

  this.resultPanel.render(ctx);

  var region = this.resultPanel.getContentRegion();
  var cx = region.x;
  var cy = region.y;
  var cw = region.width;

  ctx.save();

  // Victory/Defeat title
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = this.resultData.victory ? '#69f0ae' : '#ff5252';
  ctx.fillText(this.resultData.victory ? '战斗胜利!' : '战斗失败', cx + cw / 2, cy);

  // Score
  ctx.fillStyle = '#ffd740';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('总分数: ' + this.resultData.score, cx + cw / 2, cy + 60);

  // Kills
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText('击杀数: ' + this.resultData.kills, cx + cw / 2, cy + 100);

  // Rewards
  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('— 获得奖励 —', cx + cw / 2, cy + 150);

  if (this.resultData.rewards) {
    var ry = cy + 190;
    var rewards = this.resultData.rewards;

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText('💎 晶矿: ' + (rewards.crystal || 0), cx + cw / 2, ry);

    ctx.fillStyle = '#7c4dff';
    ctx.fillText('🧪 源质: ' + (rewards.essence || 0), cx + cw / 2, ry + 35);

    ctx.fillStyle = '#ffd740';
    ctx.fillText('⭐ 经验: ' + (rewards.exp || 0), cx + cw / 2, ry + 70);

    if (!this.resultData.victory) {
      ctx.fillStyle = '#ff8a80';
      ctx.font = '16px sans-serif';
      ctx.fillText('(失败奖励为胜利的30%)', cx + cw / 2, ry + 110);
    }
  }

  ctx.restore();

  // Return Home button
  ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
  _drawRoundRect(ctx, 225, 750, 300, 60, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
  ctx.lineWidth = 2;
  _drawRoundRect(ctx, 225, 750, 300, 60, 14);
  ctx.stroke();
  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏠 返回主页', W / 2, 780);
};

// ==================== Toast System ====================

/**
 * Show a toast message
 */
BattleScene.prototype._showToast = function(text) {
  this._toastText = text;
  this._toastTimer = 1.5;
};

/**
 * Render toast overlay
 */
BattleScene.prototype._renderToast = function(ctx) {
  var W = this.DESIGN_W;
  var alpha = Math.min(1, this._toastTimer / 0.3);

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
  var textWidth = this._toastText.length * 22 + 60;
  var tx = (W - textWidth) / 2;
  _drawRoundRect(ctx, tx, 500, textWidth, 50, 12);
  ctx.fill();

  ctx.fillStyle = '#ffd740';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this._toastText, W / 2, 525);

  ctx.restore();
};

// ==================== Utility ====================

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

module.exports = BattleScene;
