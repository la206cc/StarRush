/**
 * 登录场景 - LoginScene（骨架）
 */
const UI = require('../ui/index');

function LoginScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
}

LoginScene.prototype.onEnter = function (params) {
  console.log('[LoginScene] onEnter');
  this.touchManager.registerArea('login-btn', 280, 800, 190, 70, function () {
    game.gameState.isLoggedIn = true;
    game.gameState.userInfo = { nickName: '指挥官' };
    game.sceneManager.switchScene('home');
  });
};

LoginScene.prototype.onExit = function () {
  console.log('[LoginScene] onExit');
  this.touchManager.clearAreas();
};

LoginScene.prototype.update = function (dt) {};

LoginScene.prototype.render = function (ctx) {
  var W = 750, H = 1334;

  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STAR RUSH', W / 2, H / 2 - 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.fillText('萌闯星际', W / 2, H / 2 + 20);

  ctx.fillStyle = '#8892b0';
  ctx.font = '18px sans-serif';
  ctx.fillText('登录场景 - 待实现', W / 2, H / 2 + 70);

  ctx.fillStyle = 'rgba(79,195,247,0.3)';
  var btnW = 190, btnH = 70, btnX = (W - btnW) / 2, btnY = H / 2 + 120;
  _drawRoundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px sans-serif';
  ctx.fillText('进入游戏', W / 2, btnY + btnH / 2);
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

module.exports = LoginScene;
