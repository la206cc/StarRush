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
      { icon: '💥', name: '狂暴', desc: '攻速提升{x}%持续5秒', levels: [30, 50, 70], unlockLv: [7, 12, 20] },
      { icon: '⚡', name: '冲锋', desc: '突进并造成{x}%伤害', levels: [100, 130, 160], unlockLv: [5, 10, 15] }
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
      { icon: '💫', name: '超载', desc: '暴击率+{x}%', levels: [15, 25, 40], unlockLv: [8, 14, 20] },
      { icon: '🌟', name: '聚能', desc: '下次攻击伤害+x%', levels: [50, 80, 120], unlockLv: [6, 12, 18] }
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
      { icon: '🌟', name: '复苏', desc: '攻击力{x}%复活血量', levels: [150, 250, 400], unlockLv: [7, 12, 20] },
      { icon: '🛡️', name: '护盾', desc: '生成吸收{x}%攻击力的护盾', levels: [60, 90, 130], unlockLv: [5, 11, 17] }
    ]
  }
];

function HeroScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.resourceManager = game.resourceManager;

  this.heroes = JSON.parse(JSON.stringify(LOCAL_HEROES));
  this.selectedHeroIdx = 0;

  this.toastMsg = null;
  this.toastTimer = 0;

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

  this._registerTouchAreas();
};

HeroScene.prototype._registerTouchAreas = function() {
  var self = this;

  this.touchManager.registerArea('back-btn', 10, 70, 60, 60, function() {
    self.game.sceneManager.switchScene('home');
  });

  var avatarCenterX = DESIGN_W / 6;
  var avatarY = 140;
  var avatarSize = 120;

  this.touchManager.registerArea('nav-left', avatarCenterX - 150, avatarY + 40, 50, 50, function() {
    self._switchHero(-1);
  });

  this.touchManager.registerArea('nav-right', avatarCenterX + 100, avatarY + 40, 50, 50, function() {
    self._switchHero(1);
  });

  var gridStartY = 740;
  var cardW = 210;
  var cardH = 260;
  var gap = 20;
  var startX = (DESIGN_W - (cardW * 3 + gap * 1)) / 2;

  for (var i = 0; i < this.heroes.length; i++) {
    var col = i % 3;
    var row = Math.floor(i / 3);
    var x = startX + col * (cardW + gap);
    var y = gridStartY + row * (cardH + gap);

    (function(idx) {
      self.touchManager.registerArea('hero-card-' + idx, x, y, cardW, cardH, function() {
        self.selectedHeroIdx = idx;
      });
    })(i);
  }

  this.touchManager.registerArea('enhance-btn', 80, DESIGN_H - 90, 260, 56, function() {
    self._enhanceHero();
  });

  this.touchManager.registerArea('deploy-btn', 410, DESIGN_H - 90, 260, 56, function() {
    self._deployHero();
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

  this._renderHeroDetailPanel(ctx);
  this._renderHeroCardGrid(ctx);

  if (this.toastMsg) {
    this._renderToast(ctx);
  }
};

HeroScene.prototype._renderHeroDetailPanel = function(ctx) {
  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero) return;

  var panelX = 15;
  var panelY = 70;
  var panelW = DESIGN_W - 30;
  var panelH = 650;

  ctx.fillStyle = 'rgba(11, 22, 40, 0.95)';
  this._drawRoundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(26, 42, 68, 1)';
  ctx.lineWidth = 1.5;
  this._drawRoundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.stroke();

  this._renderPanelHeader(ctx, hero, panelX, panelY, panelW);
  this._renderAvatarSection(ctx, hero, panelX, panelY, panelW);
  this._renderStatsSection(ctx, hero, panelX, panelY, panelW);
  this._renderSkillsGrid(ctx, hero, panelX, panelY, panelW);
};

HeroScene.prototype._renderPanelHeader = function(ctx, hero, panelX, panelY, panelW) {
  ctx.beginPath();
  ctx.arc(panelX + 45, panelY + 35, 28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(79, 195, 247, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('返回', panelX + 45, panelY + 35);
};

HeroScene.prototype._renderAvatarSection = function(ctx, hero, panelX, panelY, panelW) {
  var centerX = panelX + panelW / 2;
  var avatarY = panelY + 70;
  var avatarSize = 120;

  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('Lv' + hero.level, centerX - 50, avatarY - 30);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.name, centerX + 40, avatarY - 30);

  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(79, 195, 247, 0.5)';
  ctx.fillText('◀', centerX - avatarSize / 2 - 35, avatarY + avatarSize / 2);

  ctx.font = '100px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.emoji, centerX, avatarY + avatarSize / 2);

  ctx.font = '36px sans-serif';
  ctx.fillStyle = 'rgba(79, 195, 247, 0.5)';
  ctx.fillText('▶', centerX + avatarSize / 2 + 35, avatarY + avatarSize / 2);

  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('战力 ' + this._calcPower(hero), centerX, avatarY + avatarSize + 25);
};

HeroScene.prototype._renderStatsSection = function(ctx, hero, panelX, panelY, panelW) {
  var statsY = panelY + 280;
  var statsW = panelW - 40;
  var statsX = panelX + 20;

  var mainStats = [
    { label: '生命', value: hero.hp, color: '#4AE68A' },
    { label: '攻击', value: hero.atk, color: '#FF6347' },
    { label: '防御', value: Math.round(hero.hp * 0.15), color: '#4A9EFF' }
  ];

  var subStats = [
    { label: '攻击距离', value: hero.range, color: '#FFD700' },
    { label: '攻击速度', value: Math.round(hero.spd * 33), color: '#B44AFF' },
    { label: '移动速度', value: hero.spd.toFixed(1), color: '#00BCD4' }
  ];

  var statWidth = statsW / 3;

  for (var i = 0; i < mainStats.length; i++) {
    var stat = mainStats[i];
    var sx = statsX + i * statWidth;

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(stat.label, sx + statWidth / 2, statsY);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = stat.color;
    ctx.fillText(stat.value, sx + statWidth / 2, statsY + 38);
  }

  var subStatsY = statsY + 70;

  for (var j = 0; j < subStats.length; j++) {
    var subStat = subStats[j];
    var ssx = statsX + j * statWidth;

    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(subStat.label, ssx + statWidth / 2, subStatsY);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = subStat.color;
    ctx.fillText(subStat.value, ssx + statWidth / 2, subStatsY + 30);
  }
};

HeroScene.prototype._renderSkillsGrid = function(ctx, hero, panelX, panelY, panelW) {
  var gridY = panelY + 395;
  var gridX = panelX + 20;
  var gridW = panelW - 40;
  var slotW = (gridW - 20) / 2;
  var slotH = 115;
  var gap = 20;

  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('技能列表', gridX, gridY);

  var skills = hero.skills || [];

  for (var row = 0; row < 2; row++) {
    for (var col = 0; col < 2; col++) {
      var idx = row * 2 + col;
      var skill = skills[idx];
      var slotX = gridX + col * (slotW + gap);
      var slotY = gridY + 25 + row * (slotH + gap);

      ctx.fillStyle = 'rgba(13, 26, 46, 0.8)';
      this._drawRoundRect(ctx, slotX, slotY, slotW, slotH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(26, 42, 68, 1)';
      ctx.lineWidth = 1.5;
      this._drawRoundRect(ctx, slotX, slotY, slotW, slotH, 12);
      ctx.stroke();

      if (skill) {
        var lv = this._getSkillLevel(skill, hero.level);
        var isLocked = lv === 0;

        if (isLocked) {
          ctx.globalAlpha = 0.35;
        }

        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isLocked ? '#666666' : '#ffffff';
        ctx.fillText(skill.name, slotX + 15, slotY + 15);

        if (lv > 0) {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#B44AFF';
          ctx.fillText('Lv.' + lv, slotX + slotW - 45, slotY + 17);
        } else {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#666666';
          ctx.fillText('未解锁', slotX + slotW - 50, slotY + 17);
        }

        ctx.font = '13px sans-serif';
        ctx.fillStyle = isLocked ? '#555555' : '#aabbcc';
        var descText = lv > 0 ? skill.desc.replace('{x}', skill.levels[lv - 1]) : skill.desc;
        
        var words = descText.split('');
        var line = '';
        var lineY = slotY + 45;
        var maxLines = 3;
        var currentLine = 0;
        
        for (var c = 0; c < words.length && currentLine < maxLines; c++) {
          var testLine = line + words[c];
          var metrics = ctx.measureText(testLine);
          if (metrics.width > slotW - 30 && c > 0) {
            ctx.fillText(line, slotX + 15, lineY);
            line = words[c];
            lineY += 20;
            currentLine++;
          } else {
            line = testLine;
          }
        }
        if (line && currentLine < maxLines) {
          ctx.fillText(line, slotX + 15, lineY);
        }

        ctx.globalAlpha = 1;
      }
    }
  }
};

HeroScene.prototype._renderHeroCardGrid = function(ctx) {
  var gridStartY = 740;
  var cardW = 210;
  var cardH = 260;
  var gap = 20;
  var cols = 3;
  var startX = (DESIGN_W - (cardW * cols + gap * (cols - 1))) / 2;

  for (var i = 0; i < this.heroes.length; i++) {
    var hero = this.heroes[i];
    var col = i % cols;
    var row = Math.floor(i / cols);
    var x = startX + col * (cardW + gap);
    var y = gridStartY + row * (cardH + gap);

    var isSelected = i === this.selectedHeroIdx;
    this._renderHeroCard(ctx, hero, x, y, cardW, cardH, isSelected);
  }
};

HeroScene.prototype._renderHeroCard = function(ctx, hero, x, y, w, h, isSelected) {
  ctx.fillStyle = 'rgba(13, 26, 46, 0.85)';
  this._drawRoundRect(ctx, x, y, w, h, 16);
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 12;
  } else {
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
  }
  this._drawRoundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  var stars = '';
  for (var s = 0; s < 5; s++) {
    stars += '★';
  }
  ctx.fillStyle = '#FFD700';
  ctx.fillText(stars, x + 12, y + 12);

  ctx.font = '60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.emoji, x + w / 2, y + 100);

  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.name, x + w / 2, y + 165);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#8899aa';
  ctx.fillText('Lv.' + hero.level, x + w / 2, y + 195);

  ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.15)' : 'rgba(79, 195, 247, 0.1)';
  this._drawRoundRect(ctx, x + 20, y + h - 55, w - 40, 40, 10);
  ctx.fill();

  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isSelected ? '#FFD700' : '#4fc3f7';
  ctx.fillText('战力 ' + this._calcPower(hero), x + w / 2, y + h - 35);
};

HeroScene.prototype._renderToast = function(ctx) {
  var W = DESIGN_W;
  var H = DESIGN_H;

  ctx.font = '18px sans-serif';
  var tw = ctx.measureText(this.toastMsg).width + 60;
  var th = 50;
  var tx = (W - tw) / 2;
  var ty = H - 250;

  ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
  this._drawRoundRect(ctx, tx, ty, tw, th, 14);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd740';
  ctx.fillText(this.toastMsg, W / 2, ty + th / 2);
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

HeroScene.prototype._enhanceHero = function() {
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

HeroScene.prototype._deployHero = function() {
  var hero = this.heroes[this.selectedHeroIdx];
  if (!hero) return;

  this._showToast(hero.name + ' 已加入出战阵容！');
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

module.exports = HeroScene;
