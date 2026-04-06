/**
 * PVP竞技场场景 - PVPScene（骨架）
 */
function PVPScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
}

PVPScene.prototype.onEnter = function (params) {
  console.log('[PVPScene] onEnter');
  var self = this;
  self.touchManager.registerArea('back-pvp', 10, 10, 60, 50, function () {
    self.game.sceneManager.switchScene('home');
  });
};

PVPScene.prototype.onExit = function () {
  this.touchManager.clearAreas();
};

PVPScene.prototype.update = function (dt) {};

PVPScene.prototype.render = function (ctx) {
  var W = 750, H = 1334;
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ff5252';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('⚔️ 竞技场', W / 2, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('< 返回主页', 40, 35);

  ctx.fillStyle = '#8892b0';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PVP竞技场场景 - 待实现', W / 2, H / 2);
};

module.exports = PVPScene;
