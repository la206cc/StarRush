/**
 * 商城场景 - ShopScene（骨架）
 */
function ShopScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
}

ShopScene.prototype.onEnter = function (params) {
  console.log('[ShopScene] onEnter');
  var self = this;
  self.touchManager.registerArea('back-shop', 10, 10, 60, 50, function () {
    self.game.sceneManager.switchScene('home');
  });
};

ShopScene.prototype.onExit = function () {
  this.touchManager.clearAreas();
};

ShopScene.prototype.update = function (dt) {};

ShopScene.prototype.render = function (ctx) {
  var W = 750, H = 1334;
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#69f0ae';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('星际商城', W / 2, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('< 返回主页', 40, 35);

  ctx.fillStyle = '#8892b0';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('商城场景 - 待实现', W / 2, H / 2);
};

module.exports = ShopScene;
