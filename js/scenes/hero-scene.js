/**
 * hero-scene.js — 英雄场景（三Tab重构版）
 *
 * Tab1: 信息 — 英雄属性、技能预览
 * Tab2: 强化 — 基础属性强化（消耗资源）
 * Tab3: 技能 — 技能初始等级强化（消耗资源）
 *
 * 底部英雄卡片网格用于切换英雄。
 */

var UI = require('../ui/index');
var gameData = require('../../data/game-data');

var W = 750, H = 1334;

var ENHANCE_CFG = gameData.HERO_ENHANCE_CONFIG || {
  statEnhance: {
    maxLevel: 10,
    levelMultiplier: [1,1.2,1.4,1.6,1.8,2,2.2,2.4,2.6,3],
    stats: [
      { id:'atk',name:'攻击力',icon:'⚔️',base:0.05,resource:'crystal',color:'#FF6347' },
      { id:'hp',name:'生命值',icon:'❤️',base:0.06,resource:'crystal',color:'#4AE68A' },
      { id:'def',name:'防御力',icon:'🛡️',base:0.08,resource:'crystal',color:'#4A9EFF' },
      { id:'atkSpd',name:'攻速',icon:'⚡',base:0.05,resource:'starEnergy',color:'#FFD700' },
      { id:'moveSpd',name:'移速',icon:'🏃',base:0.04,resource:'starEnergy',color:'#00BCD4' },
      { id:'crit',name:'暴击',icon:'💢',base:0.03,resource:'essence',color:'#FF4081' }
    ],
    costs: [80,80,80,150,150,150,250,250,250,400]
  },
  skillEnhance: { maxLevel: 5, costs: [100,150,250,400,600] }
};

var RES_ICONS = { crystal:'💎', starEnergy:'⚡', essence:'🧪', starCoin:'🪙' };

function HeroScene(game) {
  this.game = game;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.resourceManager = game.resourceManager;

  this.heroes = [];
  this.selectedIdx = 0;
  this.activeTab = 0; // 0=信息, 1=强化, 2=技能
  this.scrollY = 0;

  this.toastMsg = null;
  this.toastTimer = 0;

  this.resourceBar = null;
  this.tabBar = null;
}


// ==================== 生命周期 ====================

HeroScene.prototype.onEnter = function(params) {
  console.log('[HeroScene] onEnter');
  this._loadHeroes();
  this._initUI();
  this._registerTouch();
};

HeroScene.prototype.onExit = function() {
  this.touchManager.clearAreas();
  this.game.saveGameData();
};

HeroScene.prototype._loadHeroes = function() {
  // 从 gameState 读取（含存档强化数据）
  var src = this.game.gameState.heroes;
  if (!src || src.length === 0) src = gameData.getDefaultHeroes();
  this.heroes = [];
  for (var i = 0; i < src.length; i++) {
    var h = src[i];
    this.heroes.push({
      id: h.id, name: h.name, emoji: h.emoji,
      category: h.category, type: h.type || h.role, role: h.role,
      level: h.level, stage: h.stage || 1,
      atk: h.atk, hp: h.hp, range: h.range,
      spd: h.moveSpd || h.spd || 50,
      atkSpd: h.atkSpd || 1.5,
      owned: h.owned !== false,
      cost: h.cost || 20,
      skills: h.skills || [],
      // 强化数据（第2层）
      enhancements: h.enhancements || {},
      // 技能强化数据（第3层）
      skillLevels: h.skillLevels || {}
    });
  }
  if (this.selectedIdx >= this.heroes.length) this.selectedIdx = 0;
};

HeroScene.prototype._syncToGameState = function() {
  // 将英雄数据同步回 gameState
  for (var i = 0; i < this.heroes.length; i++) {
    var h = this.heroes[i];
    var gs = this.game.gameState.heroes[i];
    if (!gs) continue;
    gs.atk = h.atk; gs.hp = h.hp; gs.level = h.level;
    gs.enhancements = h.enhancements;
    gs.skillLevels = h.skillLevels;
  }
};

HeroScene.prototype._initUI = function() {
  this.resourceBar = new UI.ResourceBar({
    x: 80, y: 0, width: W - 80, height: 60,
    resources: this.game.gameState.resources,
    resourceManager: this.resourceManager
  });

  this.tabBar = new UI.TabBar({
    x: 15, y: 260, width: W - 30,
    tabs: [
      { id: 'info', name: '📊 信息' },
      { id: 'enhance', name: '💪 强化' },
      { id: 'skill', name: '⚡ 技能' }
    ],
    selectedIndex: this.activeTab,
    tabHeight: 52, fontSize: 20, selectedFontSize: 22,
    bgColor: 'rgba(15,15,35,0.85)',
    onChange: null // handled via touch
  });
};


// ==================== 触摸注册 ====================

HeroScene.prototype._registerTouch = function() {
  var self = this;
  this.touchManager.clearAreas();

  // 返回按钮（左上角，资源栏左侧）
  this.touchManager.registerArea('back', 5, 5, 70, 50, function() {
    self.game.sceneManager.switchScene('home');
  });

  // Tab 切换区域（y=260）
  var tabW = (W - 30) / 3;
  for (var t = 0; t < 3; t++) {
    (function(idx) {
      self.touchManager.registerArea('tab-' + idx, 15 + idx * tabW, 260, tabW, 52, function() {
        self.activeTab = idx;
        if (self.tabBar) self.tabBar.selectTab(idx);
        self.scrollY = 0;
        self._registerTouch(); // 重新注册
      });
    })(t);
  }

  // 英雄切换箭头（头部区域 y=70~250）
  this.touchManager.registerArea('prev', W / 2 - 120, 120, 50, 50, function() {
    self._switchHero(-1);
  });
  this.touchManager.registerArea('next', W / 2 + 70, 120, 50, 50, function() {
    self._switchHero(1);
  });

  // 英雄卡片网格（底部）
  var gridY = 920, cardW = 150, cardH = 130, gap = 10, cols = 4;
  var startX = (W - (cardW * cols + gap * (cols - 1))) / 2;
  for (var i = 0; i < this.heroes.length; i++) {
    var col = i % cols, row = Math.floor(i / cols);
    var cx = startX + col * (cardW + gap);
    var cy = gridY + row * (cardH + gap);
    (function(idx) {
      self.touchManager.registerArea('card-' + idx, cx, cy, cardW, cardH, function() {
        self.selectedIdx = idx;
      });
    })(i);
  }

  // Tab-specific touch areas
  if (this.activeTab === 1) this._registerEnhanceTouch();
  if (this.activeTab === 2) this._registerSkillTouch();
};

HeroScene.prototype._registerEnhanceTouch = function() {
  var self = this;
  var stats = ENHANCE_CFG.statEnhance.stats;
  var startY = 340;
  for (var i = 0; i < stats.length; i++) {
    var btnX = 580, btnY = startY + i * 80, btnW = 120, btnH = 40;
    (function(idx) {
      self.touchManager.registerArea('enh-' + idx, btnX, btnY, btnW, btnH, function() {
        self._doEnhance(idx);
      });
    })(i);
  }
};

HeroScene.prototype._registerSkillTouch = function() {
  var self = this;
  var hero = this.heroes[this.selectedIdx];
  if (!hero || !hero.skills) return;
  var startY = 340;
  for (var i = 0; i < hero.skills.length; i++) {
    var btnX = 580, btnY = startY + i * 100, btnW = 120, btnH = 40;
    (function(idx) {
      self.touchManager.registerArea('skl-' + idx, btnX, btnY, btnW, btnH, function() {
        self._doSkillEnhance(idx);
      });
    })(i);
  }
};


// ==================== 强化逻辑 ====================

HeroScene.prototype._doEnhance = function(statIdx) {
  var hero = this.heroes[this.selectedIdx];
  if (!hero || !hero.owned) return;
  var stats = ENHANCE_CFG.statEnhance.stats;
  var stat = stats[statIdx];
  if (!stat) return;

  var curLv = (hero.enhancements[stat.id] || 0);
  if (curLv >= ENHANCE_CFG.statEnhance.maxLevel) {
    this._toast('已达满级！'); return;
  }

  var cost = ENHANCE_CFG.statEnhance.costs[curLv];
  var res = this.game.gameState.resources;
  if ((res[stat.resource] || 0) < cost) {
    this._toast(RES_ICONS[stat.resource] + ' 不足！需要 ' + cost);
    return;
  }

  res[stat.resource] -= cost;
  hero.enhancements[stat.id] = curLv + 1;

  // 应用属性加成
  var mult = ENHANCE_CFG.statEnhance.levelMultiplier[curLv]; // 当前级的系数
  var bonus = stat.base * mult;
  if (stat.id === 'atk') hero.atk = Math.round(hero.atk * (1 + bonus * 0.3));
  else if (stat.id === 'hp') hero.hp = Math.round(hero.hp * (1 + bonus * 0.3));

  this._syncToGameState();
  this._toast(stat.icon + ' ' + stat.name + ' 升至 Lv.' + (curLv + 1));
};

HeroScene.prototype._doSkillEnhance = function(skillIdx) {
  var hero = this.heroes[this.selectedIdx];
  if (!hero || !hero.owned) return;
  var skill = hero.skills[skillIdx];
  if (!skill) return;

  var skillKey = hero.id + '_skill_' + skillIdx;
  var curLv = hero.skillLevels[skillKey] || 0;
  var maxLv = ENHANCE_CFG.skillEnhance.maxLevel;
  if (curLv >= maxLv) {
    this._toast('技能已满级！'); return;
  }

  var cost = ENHANCE_CFG.skillEnhance.costs[curLv];
  var resKey = hero.category === 'crystal' ? 'crystal' : hero.category === 'energy' ? 'starEnergy' : 'essence';
  var res = this.game.gameState.resources;
  if ((res[resKey] || 0) < cost) {
    this._toast(RES_ICONS[resKey] + ' 不足！需要 ' + cost);
    return;
  }

  res[resKey] -= cost;
  hero.skillLevels[skillKey] = curLv + 1;
  this._syncToGameState();
  this._toast(skill.icon + ' ' + skill.name + ' 初始等级 → Lv.' + (curLv + 1));
};

HeroScene.prototype._switchHero = function(dir) {
  if (this.heroes.length === 0) return;
  this.selectedIdx = (this.selectedIdx + dir + this.heroes.length) % this.heroes.length;
  this.scrollY = 0;
  this._registerTouch();
};

HeroScene.prototype._calcPower = function(hero) {
  return Math.round((hero.atk * 2 + hero.hp * 0.5) * (1 + (hero.stage || 1) * 0.2));
};

HeroScene.prototype._toast = function(msg) {
  this.toastMsg = msg; this.toastTimer = 2;
};


// ==================== update ====================

HeroScene.prototype.update = function(dt) {
  if (this.toastTimer > 0) {
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) this.toastMsg = null;
  }
  if (this.resourceBar) {
    this.resourceBar.setResources(this.game.gameState.resources);
    this.resourceBar.update(dt);
  }
};

// ==================== render ====================

HeroScene.prototype.render = function(ctx) {
  // 背景
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0b1628'); grad.addColorStop(1, '#091422');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  if (this.resourceBar) this.resourceBar.render(ctx);
  if (this.tabBar) this.tabBar.render(ctx);

  // 英雄头部区域
  this._renderHeroHeader(ctx);

  // Tab 内容
  if (this.activeTab === 0) this._renderInfoTab(ctx);
  else if (this.activeTab === 1) this._renderEnhanceTab(ctx);
  else if (this.activeTab === 2) this._renderSkillTab(ctx);

  // 底部英雄卡片
  this._renderHeroGrid(ctx);

  // Toast
  if (this.toastMsg) this._renderToast(ctx);
};


// ==================== 渲染：英雄头部 ====================

HeroScene.prototype._renderHeroHeader = function(ctx) {
  var hero = this.heroes[this.selectedIdx];
  if (!hero) return;
  var cx = W / 2, y = 70;

  // 返回按钮（左上角）
  _rr(ctx, 8, 8, 66, 44, 10);
  ctx.fillStyle = 'rgba(79,195,247,0.12)'; ctx.fill();
  ctx.strokeStyle = 'rgba(79,195,247,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('< 返回', 41, 30);

  // 箭头
  ctx.font = '32px sans-serif'; ctx.fillStyle = 'rgba(79,195,247,0.5)';
  ctx.fillText('◀', cx - 95, y + 55);
  ctx.fillText('▶', cx + 95, y + 55);

  // Emoji
  ctx.font = '72px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(hero.emoji, cx, y + 55);

  // 名字 + 等级
  ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(hero.name, cx, y + 110);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#FFD700';
  ctx.fillText('Lv.' + hero.level + '  战力 ' + this._calcPower(hero), cx, y + 135);

  // 分类标签
  var catMap = { crystal: { icon:'💎', name:'晶矿系', color:'#4fc3f7' }, energy: { icon:'⚡', name:'星能系', color:'#ffd740' }, source: { icon:'🧪', name:'源质系', color:'#B44AFF' } };
  var cat = catMap[hero.category] || catMap.crystal;
  ctx.font = '13px sans-serif'; ctx.fillStyle = cat.color;
  ctx.fillText(cat.icon + ' ' + cat.name + '  |  ' + (hero.type || hero.role), cx, y + 158);
};

// ==================== 渲染：信息Tab ====================

HeroScene.prototype._renderInfoTab = function(ctx) {
  var hero = this.heroes[this.selectedIdx];
  if (!hero) return;
  var panelX = 20, panelY = 320, panelW = W - 40;

  // 属性面板
  _rr(ctx, panelX, panelY, panelW, 200, 12);
  ctx.fillStyle = 'rgba(13,26,46,0.85)'; ctx.fill();
  ctx.strokeStyle = 'rgba(79,195,247,0.2)'; ctx.lineWidth = 1; ctx.stroke();

  ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#8899aa';
  ctx.fillText('基础属性', panelX + 15, panelY + 22);

  var stats = [
    { label:'生命', val: hero.hp, color:'#4AE68A' },
    { label:'攻击', val: hero.atk, color:'#FF6347' },
    { label:'防御', val: Math.round(hero.hp * 0.15), color:'#4A9EFF' },
    { label:'攻距', val: hero.range, color:'#FFD700' },
    { label:'攻速', val: (hero.atkSpd || 1.5).toFixed(1), color:'#B44AFF' },
    { label:'移速', val: typeof hero.spd === 'number' ? hero.spd.toFixed(1) : hero.spd, color:'#00BCD4' }
  ];

  var colW = (panelW - 30) / 3;
  for (var i = 0; i < stats.length; i++) {
    var col = i % 3, row = Math.floor(i / 3);
    var sx = panelX + 15 + col * colW, sy = panelY + 50 + row * 75;
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#8899aa';
    ctx.fillText(stats[i].label, sx + colW / 2, sy);
    ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = stats[i].color;
    ctx.fillText(stats[i].val, sx + colW / 2, sy + 32);
  }

  // 技能预览
  var skillY = panelY + 220;
  ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#8899aa';
  ctx.fillText('技能列表', panelX + 15, skillY);

  var skills = hero.skills || [];
  for (var s = 0; s < skills.length; s++) {
    var sk = skills[s], sy2 = skillY + 20 + s * 65;
    _rr(ctx, panelX, sy2, panelW, 55, 10);
    ctx.fillStyle = 'rgba(13,26,46,0.7)'; ctx.fill();
    ctx.strokeStyle = 'rgba(79,195,247,0.15)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(sk.icon + '  ' + sk.name, panelX + 12, sy2 + 22);

    var skillKey = hero.id + '_skill_' + s;
    var initLv = hero.skillLevels[skillKey] || 0;
    if (initLv > 0) {
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#B44AFF';
      ctx.fillText('初始Lv.' + initLv, panelX + panelW - 12, sy2 + 22);
    }

    ctx.font = '13px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#aabbcc';
    ctx.fillText(sk.desc, panelX + 12, sy2 + 42);
  }
};


// ==================== 渲染：强化Tab ====================

HeroScene.prototype._renderEnhanceTab = function(ctx) {
  var hero = this.heroes[this.selectedIdx];
  if (!hero) return;
  var panelX = 20, panelW = W - 40, startY = 320;
  var stats = ENHANCE_CFG.statEnhance.stats;
  var maxLv = ENHANCE_CFG.statEnhance.maxLevel;
  var costs = ENHANCE_CFG.statEnhance.costs;

  ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#8899aa';
  ctx.fillText('属性强化（消耗资源提升基础属性）', panelX + 5, startY - 5);

  for (var i = 0; i < stats.length; i++) {
    var stat = stats[i];
    var curLv = hero.enhancements[stat.id] || 0;
    var y = startY + i * 80;

    // 行背景
    _rr(ctx, panelX, y, panelW, 68, 10);
    ctx.fillStyle = 'rgba(13,26,46,0.8)'; ctx.fill();
    ctx.strokeStyle = 'rgba(79,195,247,0.15)'; ctx.lineWidth = 1; ctx.stroke();

    // 图标 + 名称
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = stat.color;
    ctx.fillText(stat.icon + ' ' + stat.name, panelX + 12, y + 25);

    // 等级条
    var barX = panelX + 12, barY = y + 40, barW = 350, barH = 14;
    _rr(ctx, barX, barY, barW, barH, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    if (curLv > 0) {
      var fillW = barW * (curLv / maxLv);
      _rr(ctx, barX, barY, fillW, barH, 7);
      ctx.fillStyle = stat.color; ctx.fill();
    }
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(curLv + '/' + maxLv, barX + barW / 2, barY + 11);

    // 效果文字
    var effectPct = Math.round(stat.base * (ENHANCE_CFG.statEnhance.levelMultiplier[Math.max(0, curLv - 1)] || 1) * 100);
    if (curLv > 0) {
      ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#69f0ae';
      ctx.fillText('+' + effectPct + '%', barX + barW + 10, barY + 11);
    }

    // 升级按钮
    var btnX = 580, btnY = y + 14, btnW = 120, btnH = 40;
    if (curLv >= maxLv) {
      _rr(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fillStyle = 'rgba(100,100,100,0.3)'; ctx.fill();
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#666';
      ctx.fillText('已满级', btnX + btnW / 2, btnY + btnH / 2 + 1);
    } else {
      var cost = costs[curLv];
      _rr(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fillStyle = 'rgba(105,240,174,0.2)'; ctx.fill();
      ctx.strokeStyle = 'rgba(105,240,174,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#69f0ae';
      ctx.fillText(RES_ICONS[stat.resource] + cost, btnX + btnW / 2, btnY + btnH / 2 + 1);
    }
  }
};

// ==================== 渲染：技能Tab ====================

HeroScene.prototype._renderSkillTab = function(ctx) {
  var hero = this.heroes[this.selectedIdx];
  if (!hero) return;
  var panelX = 20, panelW = W - 40, startY = 320;
  var skills = hero.skills || [];
  var maxLv = ENHANCE_CFG.skillEnhance.maxLevel;
  var costs = ENHANCE_CFG.skillEnhance.costs;
  var resKey = hero.category === 'crystal' ? 'crystal' : hero.category === 'energy' ? 'starEnergy' : 'essence';

  ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#8899aa';
  ctx.fillText('技能强化（提升进入战斗时的技能初始等级）', panelX + 5, startY - 5);

  if (skills.length === 0) {
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#666';
    ctx.fillText('该英雄暂无可强化技能', W / 2, startY + 60);
    return;
  }

  for (var i = 0; i < skills.length; i++) {
    var sk = skills[i];
    var skillKey = hero.id + '_skill_' + i;
    var curLv = hero.skillLevels[skillKey] || 0;
    var y = startY + i * 100;

    // 行背景
    _rr(ctx, panelX, y, panelW, 85, 10);
    ctx.fillStyle = 'rgba(13,26,46,0.8)'; ctx.fill();
    ctx.strokeStyle = 'rgba(79,195,247,0.15)'; ctx.lineWidth = 1; ctx.stroke();

    // 技能图标 + 名称
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(sk.icon + '  ' + sk.name, panelX + 12, y + 28);

    // 描述
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#aabbcc';
    ctx.fillText(sk.desc, panelX + 12, y + 50);

    // 等级条
    var barX = panelX + 12, barY = y + 60, barW = 350, barH = 14;
    _rr(ctx, barX, barY, barW, barH, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    if (curLv > 0) {
      _rr(ctx, barX, barY, barW * (curLv / maxLv), barH, 7);
      ctx.fillStyle = '#B44AFF'; ctx.fill();
    }
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText('初始Lv.' + curLv + '/' + maxLv, barX + barW / 2, barY + 11);

    // 升级按钮
    var btnX = 580, btnY = y + 22, btnW = 120, btnH = 40;
    if (curLv >= maxLv) {
      _rr(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fillStyle = 'rgba(100,100,100,0.3)'; ctx.fill();
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#666';
      ctx.fillText('已满级', btnX + btnW / 2, btnY + btnH / 2 + 1);
    } else {
      var cost = costs[curLv];
      _rr(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fillStyle = 'rgba(180,74,255,0.2)'; ctx.fill();
      ctx.strokeStyle = 'rgba(180,74,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#B44AFF';
      ctx.fillText(RES_ICONS[resKey] + cost, btnX + btnW / 2, btnY + btnH / 2 + 1);
    }
  }
};


// ==================== 渲染：底部英雄卡片网格 ====================

HeroScene.prototype._renderHeroGrid = function(ctx) {
  var gridY = 920, cardW = 150, cardH = 130, gap = 10, cols = 4;
  var startX = (W - (cardW * cols + gap * (cols - 1))) / 2;

  // 分隔线
  ctx.beginPath(); ctx.moveTo(20, gridY - 15); ctx.lineTo(W - 20, gridY - 15);
  ctx.strokeStyle = 'rgba(79,195,247,0.15)'; ctx.lineWidth = 1; ctx.stroke();

  for (var i = 0; i < this.heroes.length; i++) {
    var hero = this.heroes[i];
    var col = i % cols, row = Math.floor(i / cols);
    var x = startX + col * (cardW + gap), y = gridY + row * (cardH + gap);
    var sel = i === this.selectedIdx;

    ctx.save();
    if (!hero.owned) ctx.globalAlpha = 0.4;

    _rr(ctx, x, y, cardW, cardH, 12);
    ctx.fillStyle = 'rgba(13,26,46,0.85)'; ctx.fill();

    if (sel) {
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(255,215,0,0.3)'; ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = hero.owned ? 'rgba(79,195,247,0.25)' : 'rgba(100,100,100,0.25)';
      ctx.lineWidth = 1; ctx.shadowBlur = 0;
    }
    _rr(ctx, x, y, cardW, cardH, 12); ctx.stroke(); ctx.shadowBlur = 0;

    // Emoji
    ctx.font = '36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(hero.emoji, x + cardW / 2, y + 40);

    // 名字
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(hero.name, x + cardW / 2, y + 78);

    // 等级 / 未拥有
    ctx.font = '12px sans-serif';
    if (hero.owned) {
      ctx.fillStyle = sel ? '#FFD700' : '#8899aa';
      ctx.fillText('Lv.' + hero.level, x + cardW / 2, y + 96);
      // 战力
      ctx.font = '11px sans-serif'; ctx.fillStyle = sel ? '#FFD700' : '#4fc3f7';
      ctx.fillText('⚔' + this._calcPower(hero), x + cardW / 2, y + 114);
    } else {
      ctx.fillStyle = '#ff5252';
      ctx.fillText('未拥有', x + cardW / 2, y + 96);
    }

    ctx.restore();
  }
};

// ==================== 渲染：Toast ====================

HeroScene.prototype._renderToast = function(ctx) {
  ctx.font = '18px sans-serif';
  var tw = ctx.measureText(this.toastMsg).width + 60;
  var tx = (W - tw) / 2, ty = H - 200;
  _rr(ctx, tx, ty, tw, 50, 14);
  ctx.fillStyle = 'rgba(40,40,60,0.92)'; ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd740';
  ctx.fillText(this.toastMsg, W / 2, ty + 25);
};

// ==================== 工具函数 ====================

function _rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.arcTo(x + w, y + h, x + r, y + h, r);
  ctx.arcTo(x, y + h, x, y + r, r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

module.exports = HeroScene;
