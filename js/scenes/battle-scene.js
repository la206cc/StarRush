/**
 * 战斗场景 - BattleScene（骨架）
 */
function BattleScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.phase = 'prepare';
  this.DESIGN_W = 750;
  this.DESIGN_H = 1334;
}

BattleScene.prototype.onEnter = function (params) {
  console.log('[BattleScene] onEnter');
  this.phase = 'prepare';
  var self = this;
  self.touchManager.registerArea('back-battle', 10, 10, 60, 50, function () {
    self.game.sceneManager.switchScene('home');
  });
  self.touchManager.registerArea('start-fight', 225, 900, 300, 70, function () {
    self.phase = 'fighting';
    setTimeout(function () { self.phase = 'result'; }, 5000);
  });
};

BattleScene.prototype.onExit = function () {
  this.touchManager.clearAreas();
};

BattleScene.prototype.update = function (dt) {};

BattleScene.prototype.render = function (ctx) {
  var W = this.DESIGN_W, H = this.DESIGN_H;
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ff5252';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('战斗系统', W / 2, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('< 返回主页', 40, 35);

  var phaseText = '';
  if (this.phase === 'prepare') phaseText = '准备阶段 - 点击开始战斗';
  else if (this.phase === 'fighting') phaseText = '战斗中...';
  else phaseText = '结算阶段';

  ctx.fillStyle = '#8892b0';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(phaseText, W / 2, H / 2 - 50);

  if (this.phase === 'prepare') {
    ctx.fillStyle = 'rgba(105,240,174,0.3)';
    _drawRoundRect(ctx, 225, 880, 300, 60, 12);
    ctx.fill();
    ctx.fillStyle = '#69f0ae';
    ctx.font = '22px sans-serif';
    ctx.fillText('⚔️ 开始战斗', W / 2, 910);
  } else if (this.phase === 'result') {
    ctx.fillStyle = 'rgba(255,215,64,0.3)';
    _drawRoundRect(ctx, 200, H / 2 + 20, 350, 60, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.fillText('✓ VICTORY - 返回主页', W / 2, H / 2 + 50);
  }

  ctx.strokeStyle = 'rgba(255,82,82,0.3)';
  ctx.lineWidth = 2;
  _drawRoundRect(ctx, 275, 350, 200, 160, 12);
  ctx.stroke();
  ctx.fillStyle = '#ff5252';
  ctx.font = '16px sans-serif';
  ctx.fillText('👹 BOSS区域', 375, 430);

  ctx.strokeStyle = 'rgba(79,195,247,0.3)';
  _drawRoundRect(ctx, 75, 850, 600, 150, 12);
  ctx.stroke();
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('我方阵容 (4位)', 375, 925);
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

module.exports = BattleScene;
