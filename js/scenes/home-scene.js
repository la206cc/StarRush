/**
 * 主界面/基地场景 - HomeScene
 */
const UI = require('../ui/index');

function HomeScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.DESIGN_W = 750;
  this.DESIGN_H = 1334;
  
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

HomeScene.prototype.onEnter = function (params) {
  console.log('[HomeScene] onEnter');
  var self = this;

  this.tabBar.selectedIndex = 0;
  this.tabBar._updateTabRegions();

  this.touchManager.registerArea('chapter', 275, 560, 200, 200, function () {
    self._showToast = '章节功能即将开放';
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

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  _drawRoundRect(ctx, 275, 460, 200, 200, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('章节', W / 2, 560);

  this.tabBar.render(ctx);

  if (this._showToast) {
    ctx.fillStyle = 'rgba(40,40,60,0.9)';
    var tw = UI.Text.measureText(ctx, this._showToast, 22) + 60;
    _drawRoundRect(ctx, (W - tw) / 2, H - 280, tw, 56, 14);
    ctx.fill();
    ctx.fillStyle = '#ffd740';
    ctx.font = '20px sans-serif';
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
