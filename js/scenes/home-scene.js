/**
 * 主界面/基地场景 - HomeScene
 */
const UI = require('../ui/index');
const GameData = require('../../data/game-data');

function HomeScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.DESIGN_W = 750;
  this.DESIGN_H = 1334;

  // 章节数据
  this.chapters = GameData.getChapters();
  this.currentChapterIndex = 0;
  
  var self = this;

  this.resourceBar = new UI.ResourceBar({
    x: 0,
    y: 0,
    width: this.DESIGN_W,
    height: 80,
    resources: {
      crystal: 1000,
      essence: 500,
      starEnergy: 300,
      starCoin: 888
    },
    resourceManager: game.resourceManager
  });

  this.tabBar = new UI.TabBar({
    x: 0,
    y: this.DESIGN_H - 70,
    width: this.DESIGN_W,
    tabHeight: 70,
    tabs: [
      { id: 'shop', name: '商城', scene: 'shop' },
      { id: 'hero', name: '英雄', scene: 'hero' },
      { id: 'starmap', name: '星空', scene: 'starmap' }
    ],
    selectedIndex: 0,
    indicatorHeight: 0,
    selectedColor: '#8892b0',
    selectedFontSize: 26,
    onChange: function(index, tab) {
      if (tab.scene) self.game.sceneManager.switchScene(tab.scene);
    }
  });
}

HomeScene.prototype._getCurrentChapter = function () {
  return this.chapters[this.currentChapterIndex];
};

HomeScene.prototype._switchChapter = function (direction) {
  var newIndex = this.currentChapterIndex + direction;
  if (newIndex < 0 || newIndex >= this.chapters.length) return;
  this.currentChapterIndex = newIndex;
  var ch = this._getCurrentChapter();
  this._showToast = ch.name + (ch.isUnlocked ? '' : ' (未解锁)');
};

HomeScene.prototype.onEnter = function (params) {
  console.log('[HomeScene] onEnter');
  var self = this;

  this.tabBar.selectedIndex = 0;
  this.tabBar._updateTabRegions();

  // 章节图标点击区域（显示章节信息）
  this.touchManager.registerArea('chapter', 275, 460, 200, 200, function () {
    var ch = self._getCurrentChapter();
    self._showToast = ch.name + ' - ' + ch.description;
  });

  // 左箭头 - 上一章节
  this.touchManager.registerArea('chapter-prev', 195, 520, 60, 80, function () {
    self._switchChapter(-1);
  });

  // 右箭头 - 下一章节
  this.touchManager.registerArea('chapter-next', 495, 520, 60, 80, function () {
    self._switchChapter(1);
  });

  // 战斗按钮
  this.touchManager.registerArea('battle-btn', 250, 700, 250, 60, function () {
    var ch = self._getCurrentChapter();
    if (!ch.isUnlocked) {
      self._showToast = '该章节尚未解锁';
      return;
    }
    self.game.sceneManager.switchScene('battle', { chapter: ch });
  });

  this.touchManager.registerArea('tabbar', 0, this.DESIGN_H - 70, this.DESIGN_W, 70, function (id, x, y) {
    self.tabBar.handleClick(x, y);
  });
};

HomeScene.prototype.onExit = function () {
  console.log('[HomeScene] onExit');
  this.touchManager.clearAreas();
};

HomeScene.prototype.update = function (dt) {
  this.resourceBar.update(dt);
  this.tabBar.update(dt);
};

HomeScene.prototype.render = function (ctx) {
  var W = this.DESIGN_W, H = this.DESIGN_H;

  var gradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  gradient.addColorStop(0, '#1a237e');
  gradient.addColorStop(0.5, '#0d1b3e');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  this.resourceBar.render(ctx);

  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('星际探险', W / 2, 80);

  // ── 章节图标区域 ──
  var ch = this._getCurrentChapter();
  var isUnlocked = ch.isUnlocked;

  ctx.fillStyle = isUnlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
  _drawRoundRect(ctx, 275, 460, 200, 200, 16);
  ctx.fill();

  // 章节名称（图标内）
  ctx.fillStyle = isUnlocked ? '#ffffff' : '#666666';
  ctx.font = 'bold 26px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch.name, W / 2, 540);

  // 章节难度星标
  ctx.fillStyle = isUnlocked ? '#ffd740' : '#555555';
  ctx.font = '18px sans-serif';
  var stars = '';
  for (var s = 0; s < ch.difficulty; s++) stars += '★';
  ctx.fillText(stars, W / 2, 580);

  // 章节序号
  ctx.fillStyle = '#8892b0';
  ctx.font = '16px sans-serif';
  ctx.fillText('第 ' + (this.currentChapterIndex + 1) + ' / ' + this.chapters.length + ' 章', W / 2, 620);

  // ── 左箭头 ──
  if (this.currentChapterIndex > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    _drawRoundRect(ctx, 200, 525, 50, 70, 10);
    ctx.fill();
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀', 225, 560);
  }

  // ── 右箭头 ──
  if (this.currentChapterIndex < this.chapters.length - 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    _drawRoundRect(ctx, 500, 525, 50, 70, 10);
    ctx.fill();
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶', 525, 560);
  }

  // ── 战斗按钮（章节图标下方）──
  if (isUnlocked) {
    ctx.fillStyle = 'rgba(105,240,174,0.25)';
    _drawRoundRect(ctx, 250, 700, 250, 60, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(105,240,174,0.5)';
    ctx.lineWidth = 2;
    _drawRoundRect(ctx, 250, 700, 250, 60, 14);
    ctx.stroke();
    ctx.fillStyle = '#69f0ae';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️ 进入战斗', W / 2, 730);
  } else {
    ctx.fillStyle = 'rgba(100,100,100,0.2)';
    _drawRoundRect(ctx, 250, 700, 250, 60, 14);
    ctx.fill();
    ctx.fillStyle = '#555555';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒 未解锁', W / 2, 730);
  }

  this.tabBar.render(ctx);

  if (this._showToast) {
    ctx.fillStyle = 'rgba(40,40,60,0.9)';
    var tw = UI.Text.measureText(ctx, this._showToast, 22) + 60;
    _drawRoundRect(ctx, (W - tw) / 2, H - 280, tw, 56, 14);
    ctx.fill();
    ctx.fillStyle = '#ffd740';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._showToast, W / 2, H - 252);
    this._showToast = null;
  }
};

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

module.exports = HomeScene;
