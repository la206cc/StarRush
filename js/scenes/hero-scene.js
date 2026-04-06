/**
 * 英雄系统场景 - HeroScene
 * 参考 heroes.html 还原英雄界面
 */
const UI = require('../ui/index');

var DESIGN_W = 750;
var DESIGN_H = 1334;

var HERO_CONFIG = {
  levelCostBase: 500,
  levelCostPerLv: 200,
  levelAtkGrowth: [0.10, 0.15],
  levelHpGrowth: 0.12,
  stageCostBase: 150,
  stageCostPerStage: 100,
  stageMaxLevel: 20,
  levelMaxLevel: 160,
  stageBonus: [0, 0.05, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.10, 0.10, 0.10, 0.10, 0.10, 0.12, 0.12, 0.12, 0.12, 0.12],
  stageCurrencyMap: {
    crystal: { resource: 'crystal', icon: '💎', name: '晶矿' },
    energy:  { resource: 'starEnergy', icon: '⚡', name: '星能' },
    source:  { resource: 'essence', icon: '🧪', name: '源质' }
  }
};

var LOCAL_HEROES = [
  {
    id: 'hero_001',
    name: '机械犬',
    emoji: '🐕',
    category: 'crystal',
    attributeType: 'single',
    type: '近战',
    level: 5,
    stage: 2,
    atk: 62,
    hp: 345,
    range: 80,
    spd: 3.0,
    owned: true,
    skills: [
      { icon: '🔥', name: '重击', desc: '对单体造成{x}%伤害', levels: [150, 170, 200], unlockLv: [1, 5, 10] },
      { icon: '🛡️', name: '铁壁', desc: '减伤{x}%持续3秒', levels: [20, 30, 40], unlockLv: [3, 8, 15] },
      { icon: '💥', name: '狂暴', desc: '攻速提升{x}%持续5秒', levels: [30, 50, 70], unlockLv: [7, 12, 20] }
    ]
  },
  {
    id: 'hero_101',
    name: '光子猫',
    emoji: '🐱',
    category: 'energy',
    attributeType: 'single',
    type: '单体',
    level: 4,
    stage: 2,
    atk: 72,
    hp: 210,
    range: 250,
    spd: 2.5,
    owned: true,
    skills: [
      { icon: '✨', name: '光子弹', desc: '单体{x}%伤害', levels: [180, 220, 280], unlockLv: [1, 5, 10] },
      { icon: '🌀', name: '折射', desc: '弹射{x}个目标', levels: [2, 3, 4], unlockLv: [4, 9, 15] },
      { icon: '💫', name: '超载', desc: '暴击率+{x}%', levels: [15, 25, 40], unlockLv: [8, 14, 20] }
    ]
  },
  {
    id: 'hero_201',
    name: '纳米兔',
    emoji: '🐰',
    category: 'source',
    attributeType: 'single',
    type: '治疗',
    level: 4,
    stage: 1,
    atk: 25,
    hp: 180,
    range: 150,
    spd: 2.8,
    owned: true,
    skills: [
      { icon: '💚', name: '治愈', desc: '基于攻击力{x}%转化治疗量', levels: [80, 100, 130], unlockLv: [1, 5, 10] },
      { icon: '🌿', name: '再生', desc: '攻击力{x}%持续回血/秒', levels: [20, 35, 50], unlockLv: [3, 8, 15] },
      { icon: '🌟', name: '复苏', desc: '攻击力{x}%复活血量', levels: [150, 250, 400], unlockLv: [7, 12, 20] }
    ]
  }
];

var CATEGORY_COLORS = {
  crystal: '#4A9EFF',
  energy: '#B44AFF',
  source: '#4AE68A'
};

var CATEGORY_NAMES = {
  crystal: '晶矿',
  energy: '星能',
  source: '源质'
};

var CATEGORY_ICONS = {
  crystal: '💎',
  energy: '⚡',
  source: '🧪'
};

function HeroScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.resourceManager = game.resourceManager;

  this.heroes = JSON.parse(JSON.stringify(LOCAL_HEROES));
  this.selectedHeroIdx = 0;
  this.sortMode1 = 'level';
  this.sortMode2 = '';
  this.typeFilter = 'all';

  this.toastMsg = null;
  this.toastTimer = 0;

  this.skillPopupHero = null;
  this.skillPopupIdx = -1;
  this.showSkillPopup = false;

  this._initUI();
}

HeroScene.prototype._initUI = function() {
  var self = this;

  this.resourceBar = new UI.ResourceBar({
    x: 0,
    y: 0,
    width: DESIGN_W,
    height: 60,
    resources: {
      crystal: this.game.gameState.resources.crystal || 0,
      essence: this.game.gameState.resources.essence || 0,
      starEnergy: this.game.gameState.resources.starEnergy || 0,
      starCoin: this.game.gameState.resources.starCoin || 0
    },
    resourceManager: this.resourceManager
  });
};

HeroScene.prototype.onEnter = function(params) {
  console.log('[HeroScene] onEnter');
  var self = this;

  this.touchManager.registerArea('back-btn', 10, 10, 100, 44, function() {
    self.game.sceneManager.switchScene('home');
  });

  this._registerHeroCardAreas();
  this._registerDetailAreas();
};

HeroScene.prototype._registerHeroCardAreas = function() {
  var self = this;
  var gridY = 520;
  var cardW = 130;
  var cardH = 150;
  var gap = 10;
  var cols = 5;
  var startX = 20;
  var startY = gridY;

  this.touchManager.registerArea('hero-cards', 0, gridY, DESIGN_W, DESIGN_H - gridY - 80, function(id, x, y) {
    var col = Math.floor((x - startX) / (cardW + gap));
    var row = Math.floor((y - startY) / (cardH + gap));
    if (col >= 0 && col < cols) {
      var idx = row * cols + col;
      var sortedHeroes = self._getSortedHeroes();
      if (idx >= 0 && idx < sortedHeroes.length) {
        self.selectedHeroIdx = self.heroes.findIndex(function(h) { return h.id === sortedHeroes[idx].id; });
      }
    }
  });
};

HeroScene.prototype._registerDetailAreas = function() {
  var self = this;

  this.touchManager.registerArea('hero-nav-left', 180, 200, 50, 50, function() {
    self._switchHero(-1);
  });

  this.touchManager.registerArea('hero-nav-right', 520, 200, 50, 50, function() {
    self._switchHero(1);
  });

  this.touchManager.registerArea('levelup-btn', 200, 380, 150, 44, function() {
    self._levelUpHero();
  });

  this.touchManager.registerArea('stageup-btn', 400, 380, 150, 44, function() {
    self._stageUpHero();
  });

  this.touchManager.registerArea('skill-slots', 580, 100, 80, 200, function(id, x, y) {
    var slotIdx = Math.floor((y - 100) / 60);
    if (slotIdx >= 0 && slotIdx < 3) {
      self._openSkillPopup(slotIdx);
    }
  });

  this.touchManager.registerArea('skill-popup-close', 0, 0, DESIGN_W, DESIGN_H, function() {
    if (self.showSkillPopup) {
      self.showSkillPopup = false;
    }
  });
};

HeroScene.prototype.onExit = function() {
  this.touchManager.clearAreas();
};

HeroScene.prototype.update = function(dt) {
  if (this.toastTimer > 0) {
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) {
      this.toastMsg = null;
    }
  }

  if (this.resourceBar) {
    this.resourceBar.setResources({
      crystal: this.game.gameState.resources.crystal || 0,
      essence: this.game.gameState.resources.essence || 0,
      starEnergy: this.game.gameState.resources.starEnergy || 0,
      starCoin: this.game.gameState.resources.starCoin || 0
    });
    this.resourceBar.update(dt);
  }
};

HeroScene.prototype.render = function(ctx) {
  var W = DESIGN_W, H = DESIGN_H;

  var gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0b1628');
  gradient.addColorStop(1, '#091422');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  if (this.resourceBar) {
    this.resourceBar.render(ctx);
  }
  this._renderBackBtn(ctx);
  this._renderHeroDetail(ctx);
  this._renderHeroGrid(ctx);

  if (this.toastMsg) {
    this._renderToast(ctx);
  }

  if (this.showSkillPopup) {
    this._renderSkillPopup(ctx);
  }
};

HeroScene.prototype._renderBackBtn = function(ctx) {
  ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
  this._drawRoundRect(ctx, 10, 70, 100, 36, 8);
  ctx.fill();

  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('← 返回基地', 60, 88);
};

HeroScene.prototype._renderHeroDetail = function(ctx) {
  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero) return;

  var panelY = 115;
  var panelH = 355;

  ctx.fillStyle = 'rgba(11, 22, 40, 0.95)';
  this._drawRoundRect(ctx, 10, panelY, DESIGN_W - 20, panelH, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(26, 42, 68, 1)';
  ctx.lineWidth = 1;
  this._drawRoundRect(ctx, 10, panelY, DESIGN_W - 20, panelH, 12);
  ctx.stroke();

  this._renderStatBars(ctx, hero, 20, panelY + 15);
  this._renderHeroCenter(ctx, hero, 180, panelY + 20);
  this._renderSkillSlots(ctx, hero, 590, panelY + 20);
  this._renderActionButtons(ctx, hero, panelY + 280);
};

HeroScene.prototype._renderStatBars = function(ctx, hero, x, y) {
  var stats = [
    { label: '生命', value: hero.hp, max: 1000, color: '#4AE68A', cls: 'hp' },
    { label: '攻击', value: hero.atk, max: 200, color: '#FF6347', cls: 'atk' },
    { label: '防御', value: Math.round(hero.hp * 0.15), max: 150, color: '#4A9EFF', cls: 'def' },
    { label: '射程', value: hero.range, max: 300, color: '#FFD700', cls: 'range' },
    { label: '速度', value: hero.spd, max: 5, color: '#B44AFF', cls: 'spd' }
  ];

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (var i = 0; i < stats.length; i++) {
    var stat = stats[i];
    var sy = y + i * 52;

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(stat.label, x, sy + 8);

    var barX = x + 40;
    var barW = 100;
    var barH = 10;

    ctx.fillStyle = '#0f1e33';
    this._drawRoundRect(ctx, barX, sy + 2, barW, barH, 5);
    ctx.fill();

    var pct = Math.min(100, Math.max(2, (stat.value / stat.max) * 100));
    var fillW = barW * pct / 100;

    var gradient = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    gradient.addColorStop(0, stat.color);
    gradient.addColorStop(1, this._adjustColor(stat.color, -30));
    ctx.fillStyle = gradient;
    this._drawRoundRect(ctx, barX, sy + 2, fillW, barH, 5);
    ctx.fill();

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(stat.value, x + 150, sy + 8);
    ctx.textAlign = 'left';
  }
};

HeroScene.prototype._renderHeroCenter = function(ctx, hero, x, y) {
  var centerX = x + 180;

  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.name, centerX, y);

  var attrColor = CATEGORY_COLORS[hero.category];
  var attrName = CATEGORY_NAMES[hero.category];
  var attrIcon = CATEGORY_ICONS[hero.category];

  var badgeW = 80;
  var badgeX = centerX - badgeW / 2;
  ctx.fillStyle = this._hexToRgba(attrColor, 0.15);
  this._drawRoundRect(ctx, badgeX, y + 32, badgeW, 24, 12);
  ctx.fill();
  ctx.strokeStyle = this._hexToRgba(attrColor, 0.5);
  ctx.lineWidth = 1;
  this._drawRoundRect(ctx, badgeX, y + 32, badgeW, 24, 12);
  ctx.stroke();

  ctx.font = '14px sans-serif';
  ctx.fillStyle = attrColor;
  ctx.fillText(attrIcon + ' ' + attrName, centerX, y + 36);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(79, 195, 247, 0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('◀', x - 10, y + 100);

  ctx.font = '72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.emoji, centerX, y + 70);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(79, 195, 247, 0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('▶', x + 370, y + 100);

  this._renderStageStars(ctx, hero.stage, centerX - 80, y + 165);

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('Lv.' + hero.level + ' · 战力 ' + this._calcPower(hero), centerX, y + 195);
};

HeroScene.prototype._renderStageStars = function(ctx, stage, x, y) {
  var starSize = 20;
  var gap = 4;
  var colors = ['#FFD700', '#4A9EFF', '#4AE68A', '#E0B0FF'];

  if (stage === 0) {
    for (var i = 0; i < 5; i++) {
      ctx.font = starSize + 'px sans-serif';
      ctx.fillStyle = '#444466';
      ctx.fillText('☆', x + i * (starSize + gap), y);
    }
    return;
  }

  var tier = Math.floor((stage - 1) / 5);
  var newCount = ((stage - 1) % 5) + 1;
  var prevColor = tier > 0 ? colors[tier - 1] : '#444466';
  var curColor = colors[Math.min(tier, 3)];

  for (var j = 0; j < 5; j++) {
    ctx.font = starSize + 'px sans-serif';
    ctx.fillStyle = j < newCount ? curColor : prevColor;
    ctx.fillText('★', x + j * (starSize + gap), y);
  }

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#8899aa';
  ctx.fillText(stage + '阶', x + 5 * (starSize + gap) + 8, y - 4);
};

HeroScene.prototype._renderSkillSlots = function(ctx, hero, x, y) {
  var skills = hero.skills || [];

  for (var i = 0; i < 3; i++) {
    var skill = skills[i];
    var sy = y + i * 65;
    var slotSize = 50;

    ctx.fillStyle = 'rgba(13, 26, 46, 0.8)';
    this._drawRoundRect(ctx, x, sy, slotSize, slotSize, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(26, 42, 68, 1)';
    ctx.lineWidth = 2;
    this._drawRoundRect(ctx, x, sy, slotSize, slotSize, 12);
    ctx.stroke();

    if (skill) {
      var lv = this._getSkillLevel(skill, hero.level);
      var isLocked = lv === 0;

      if (isLocked) {
        ctx.globalAlpha = 0.3;
      }

      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(skill.icon, x + slotSize / 2, sy + slotSize / 2);

      if (lv > 0) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#B44AFF';
        ctx.textAlign = 'right';
        ctx.fillText('Lv' + lv, x + slotSize - 4, sy + slotSize - 6);
      }

      ctx.globalAlpha = 1;
    }
  }
};

HeroScene.prototype._renderActionButtons = function(ctx, hero, y) {
  var lvCost = HERO_CONFIG.levelCostBase + hero.level * HERO_CONFIG.levelCostPerLv;
  var stCost = hero.stage >= HERO_CONFIG.stageMaxLevel ? null :
               (HERO_CONFIG.stageCostBase + hero.stage * HERO_CONFIG.stageCostPerStage);
  var stageRes = HERO_CONFIG.stageCurrencyMap[hero.category] ||
                 { resource: 'essence', icon: '🧪', name: '源质' };

  ctx.fillStyle = 'rgba(74, 230, 138, 0.2)';
  this._drawRoundRect(ctx, 120, y, 200, 44, 10);
  ctx.fill();
  ctx.strokeStyle = '#4AE68A';
  ctx.lineWidth = 1;
  this._drawRoundRect(ctx, 120, y, 200, 44, 10);
  ctx.stroke();

  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4AE68A';
  ctx.fillText('升级 🪙' + lvCost, 220, y + 22);

  if (stCost !== null) {
    ctx.fillStyle = 'rgba(255, 152, 0, 0.2)';
    this._drawRoundRect(ctx, 340, y, 200, 44, 10);
    ctx.fill();
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 1;
    this._drawRoundRect(ctx, 340, y, 200, 44, 10);
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ff9800';
    ctx.fillText('进阶 ' + stageRes.icon + stCost, 440, y + 22);
  } else {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    this._drawRoundRect(ctx, 340, y, 200, 44, 10);
    ctx.fill();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('已满阶', 440, y + 22);
  }
};

HeroScene.prototype._renderHeroGrid = function(ctx) {
  var sortedHeroes = this._getSortedHeroes();
  var gridY = 520;
  var cardW = 130;
  var cardH = 150;
  var gap = 10;
  var cols = 5;
  var startX = 20;
  var startY = gridY;

  for (var i = 0; i < sortedHeroes.length; i++) {
    var hero = sortedHeroes[i];
    var col = i % cols;
    var row = Math.floor(i / cols);
    var x = startX + col * (cardW + gap);
    var y = startY + row * (cardH + gap);

    var isSelected = hero.id === this.heroes[this.selectedHeroIdx].id;
    this._renderHeroCard(ctx, hero, x, y, cardW, cardH, isSelected);
  }
};

HeroScene.prototype._renderHeroCard = function(ctx, hero, x, y, w, h, isSelected) {
  var catColor = CATEGORY_COLORS[hero.category];

  ctx.fillStyle = 'rgba(13, 26, 46, 0.8)';
  this._drawRoundRect(ctx, x, y, w, h, 12);
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
    ctx.shadowBlur = 8;
  } else {
    ctx.strokeStyle = this._hexToRgba(catColor, 0.35);
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
  }
  this._drawRoundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.emoji, x + w / 2, y + 50);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.name, x + w / 2, y + 95);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('Lv.' + hero.level, x + w / 2, y + 115);

  var dotSize = 6;
  var dotY = y + 135;
  ctx.fillStyle = catColor;
  ctx.beginPath();
  ctx.arc(x + w / 2, dotY, dotSize / 2, 0, Math.PI * 2);
  ctx.fill();
};

HeroScene.prototype._renderToast = function(ctx) {
  var W = DESIGN_W;
  var H = DESIGN_H;

  ctx.font = '18px sans-serif';
  var tw = ctx.measureText(this.toastMsg).width + 60;
  var th = 50;
  var tx = (W - tw) / 2;
  var ty = H - 200;

  ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
  this._drawRoundRect(ctx, tx, ty, tw, th, 14);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd740';
  ctx.fillText(this.toastMsg, W / 2, ty + th / 2);
};

HeroScene.prototype._renderSkillPopup = function(ctx) {
  var W = DESIGN_W;
  var H = DESIGN_H;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, W, H);

  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero || !hero.skills) return;
  var skill = hero.skills[this.skillPopupIdx];
  if (!skill) return;

  var curLv = this._getSkillLevel(skill, hero.level);

  var popupW = 600;
  var popupH = 400;
  var popupX = (W - popupW) / 2;
  var popupY = (H - popupH) / 2;

  ctx.fillStyle = 'rgba(13, 26, 46, 0.95)';
  this._drawRoundRect(ctx, popupX, popupY, popupW, popupH, 14);
  ctx.fill();

  ctx.strokeStyle = 'rgba(26, 42, 68, 1)';
  ctx.lineWidth = 2;
  this._drawRoundRect(ctx, popupX, popupY, popupW, popupH, 14);
  ctx.stroke();

  ctx.font = '36px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(skill.icon, popupX + 20, popupY + 40);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffffff';
  var skillTitle = skill.name;
  if (curLv > 0) {
    skillTitle += ' Lv.' + curLv;
  } else {
    skillTitle += ' (未解锁)';
  }
  ctx.fillText(skillTitle, popupX + 70, popupY + 35);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#8899aa';
  var descText = curLv > 0 ? skill.desc.replace('{x}', skill.levels[curLv - 1]) : '达到等级后自动解锁';
  ctx.fillText(descText, popupX + 70, popupY + 58);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('技能随角色等级自动提升，不单独升级', popupX + 20, popupY + 90);

  for (var i = 0; i < skill.levels.length; i++) {
    var lv = i + 1;
    var rowY = popupY + 120 + i * 60;
    var unlocked = hero.level >= skill.unlockLv[i];
    var isCurrent = lv === curLv;

    if (isCurrent) {
      ctx.fillStyle = 'rgba(180, 74, 255, 0.15)';
      this._drawRoundRect(ctx, popupX + 20, rowY, popupW - 40, 50, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 74, 255, 0.3)';
      ctx.lineWidth = 1;
      this._drawRoundRect(ctx, popupX + 20, rowY, popupW - 40, 50, 8);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(15, 30, 50, 0.6)';
      this._drawRoundRect(ctx, popupX + 20, rowY, popupW - 40, 50, 8);
      ctx.fill();
    }

    ctx.globalAlpha = unlocked ? 1 : 0.35;

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#B44AFF';
    ctx.fillText('+' + lv, popupX + 35, rowY + 25);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    var levelDesc = skill.desc.replace('{x}', skill.levels[i]);
    ctx.fillText(levelDesc, popupX + 70, rowY + 25);

    ctx.textAlign = 'right';
    ctx.fillStyle = unlocked ? '#4AE68A' : '#666666';
    ctx.fillText(unlocked ? '✅' : 'Lv.' + skill.unlockLv[i], popupX + popupW - 35, rowY + 25);

    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
  this._drawRoundRect(ctx, popupX + (popupW - 150) / 2, popupY + popupH - 55, 150, 40, 8);
  ctx.fill();

  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('关闭', popupX + popupW / 2, popupY + popupH - 35);
};

HeroScene.prototype._getSortedHeroes = function() {
  var list = this.heroes.slice();

  if (this.typeFilter !== 'all') {
    list = list.filter(function(h) { return h.category === this.typeFilter; }.bind(this));
  }

  var s1 = this.sortMode1;
  if (s1 === 'level') {
    list.sort(function(a, b) { return b.level - a.level; });
  } else if (s1 === 'stage') {
    list.sort(function(a, b) { return b.stage - a.stage || b.level - a.level; });
  } else if (s1 === 'power') {
    list.sort(function(a, b) { return this._calcPower(b) - this._calcPower(a); }.bind(this));
  }

  var s2 = this.sortMode2;
  if (s2 === 'atk') {
    list.sort(function(a, b) { return b.atk - a.atk; });
  } else if (s2 === 'def') {
    list.sort(function(a, b) { return Math.round(b.hp * 0.15) - Math.round(a.hp * 0.15); });
  } else if (s2 === 'range') {
    list.sort(function(a, b) { return (parseInt(b.range) || 0) - (parseInt(a.range) || 0); });
  } else if (s2 === 'spd') {
    list.sort(function(a, b) { return (parseFloat(a.spd) || 99) - (parseFloat(b.spd) || 99); });
  }

  return list;
};

HeroScene.prototype._calcPower = function(hero) {
  return Math.round((hero.atk * 2 + hero.hp * 0.5) * (1 + hero.stage * 0.2));
};

HeroScene.prototype._getSkillLevel = function(skill, heroLevel) {
  var lv = 0;
  for (var i = 0; i < skill.unlockLv.length; i++) {
    if (heroLevel >= skill.unlockLv[i]) {
      lv = i + 1;
    }
  }
  return lv;
};

HeroScene.prototype._switchHero = function(dir) {
  var owned = this.heroes.filter(function(h) { return h.owned; });
  if (owned.length === 0) return;

  var currentHero = this.heroes[this.selectedHeroIdx];
  var curIdx = owned.findIndex(function(h) { return h.id === currentHero.id; });
  var newIdx = (curIdx + dir + owned.length) % owned.length;

  this.selectedHeroIdx = this.heroes.findIndex(function(h) { return h.id === owned[newIdx].id; });
};

HeroScene.prototype._levelUpHero = function() {
  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero) return;

  if (hero.level >= HERO_CONFIG.levelMaxLevel) {
    this._showToast('已达最高等级！');
    return;
  }

  var cost = HERO_CONFIG.levelCostBase + hero.level * HERO_CONFIG.levelCostPerLv;
  var resources = this.game.gameState.resources;

  if ((resources.starCoin || 0) < cost) {
    this._showToast('金币不足！需要 🪙' + cost);
    return;
  }

  resources.starCoin = (resources.starCoin || 0) - cost;
  hero.level++;

  var gMin = HERO_CONFIG.levelAtkGrowth[0];
  var gRange = HERO_CONFIG.levelAtkGrowth[1];
  var growthRate = gMin + Math.random() * (gRange - gMin);
  hero.atk = Math.round(hero.atk * (1 + growthRate));
  hero.hp = Math.round(hero.hp * (1 + HERO_CONFIG.levelHpGrowth));

  this._showToast(hero.name + ' 升级到 Lv.' + hero.level + '！');
};

HeroScene.prototype._stageUpHero = function() {
  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero) return;

  if (hero.stage >= HERO_CONFIG.stageMaxLevel) {
    this._showToast('已达最高阶！');
    return;
  }

  var cost = HERO_CONFIG.stageCostBase + hero.stage * HERO_CONFIG.stageCostPerStage;
  var stageRes = HERO_CONFIG.stageCurrencyMap[hero.category] ||
                 { resource: 'essence', icon: '🧪', name: '源质' };
  var resKey = stageRes.resource;
  var resources = this.game.gameState.resources;

  if ((resources[resKey] || 0) < cost) {
    this._showToast(stageRes.name + '不足！需要 ' + stageRes.icon + cost);
    return;
  }

  resources[resKey] = (resources[resKey] || 0) - cost;
  hero.stage++;

  var stageBonus = HERO_CONFIG.stageBonus[hero.stage - 1] || 0.35;
  hero.atk = Math.round(hero.atk * (1 + stageBonus));
  hero.hp = Math.round(hero.hp * (1 + stageBonus));

  this._showToast(hero.name + ' 进阶到 ' + hero.stage + '阶！');
};

HeroScene.prototype._openSkillPopup = function(idx) {
  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero || !hero.skills || !hero.skills[idx]) return;

  this.skillPopupHero = hero;
  this.skillPopupIdx = idx;
  this.showSkillPopup = true;
};

HeroScene.prototype._showToast = function(msg) {
  this.toastMsg = msg;
  this.toastTimer = 2;
};

HeroScene.prototype._drawRoundRect = function(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

HeroScene.prototype._hexToRgba = function(hex, alpha) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  var color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  var num = parseInt(color, 16);
  var r = (num >> 16) & 255;
  var g = (num >> 8) & 255;
  var b = num & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
};

HeroScene.prototype._adjustColor = function(hex, amount) {
  var color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  var num = parseInt(color, 16);
  var r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount));
  var g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount));
  var b = Math.min(255, Math.max(0, (num & 255) + amount));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

module.exports = HeroScene;
