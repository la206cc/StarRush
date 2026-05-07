/**
 * 萌闯星际 Star Rush - 微信小游戏主入口
 * 太空主题轻量化SLG游戏
 * 微信小游戏直接执行入口（无 Game() 构造器）
 */

// ==================== ES6+ Polyfill ====================
// 为低版本微信基础库提供兼容性支持

// Array.prototype.findIndex polyfill
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    for (var i = 0; i < length; i++) {
      if (i in list) {
        if (predicate.call(thisArg, list[i], i, list)) {
          return i;
        }
      }
    }
    return -1;
  };
}

// String.prototype.startsWith polyfill
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

// String.prototype.padStart polyfill
if (!String.prototype.padStart) {
  String.prototype.padStart = function(targetLength, padString) {
    targetLength = targetLength >> 0;
    padString = String(padString || ' ');
    if (this.length >= targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(Math.ceil(targetLength / padString.length));
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}

// String.prototype.includes polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (search instanceof RegExp) {
      throw new TypeError('First argument to includes must not be a regular expression');
    }
    if (start === undefined) { start = 0; }
    return this.indexOf(search, start) !== -1;
  };
}

console.log('[Polyfill] ES6+ 兼容性检查完成');

// 引入数据层
const storageManager = require('./utils/storage-manager.js');
const gameData = require('./data/game-data.js');

// 引入引擎模块
const ScreenAdapter = require('./js/core/screen-adapter');
const Renderer = require('./js/core/renderer');
const TouchManager = require('./js/core/touch-manager');
const SceneManager = require('./js/core/scene-manager');
const ResourceManager = require('./js/core/resource-manager');
const AudioManager = require('./js/core/audio-manager');

// 全局游戏实例
const game = {
  // 全局游戏状态
  gameState: {
    // 用户信息
    userInfo: null,
    isLoggedIn: false,

    // 资源系统
    resources: {
      crystal: 1000,
      essence: 500,
      starEnergy: 200,
      starCoin: 100
    },

    // 英雄数据
    heroes: [],

    // 游戏进度
    gameProgress: {
      currentChapter: 'chapter_1',
      currentStage: null,
      totalStars: 0,
      battleCount: 0,
      consecutiveWins: 0,
      lastLoginDate: null
    },

    // 当前场景
    currentScene: null,

    // 屏幕信息
    screenWidth: 0,
    screenHeight: 0,
    canvasWidth: 0,
    canvasHeight: 0
  },

  // Canvas 和引擎实例
  canvas: null,
  ctx: null,
  screenAdapter: null,
  renderer: null,
  touchManager: null,
  sceneManager: null,
  resourceManager: null,
  audioManager: null,

  /**
   * 初始化Canvas和引擎
   */
  _initCanvas() {
    const canvas = wx.createCanvas();
    const ctx = canvas.getContext('2d');

    const sysInfo = wx.getSystemInfoSync();
    const dpr = 3;

    const logicalWidth = sysInfo.windowWidth;
    const logicalHeight = sysInfo.windowHeight;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    ctx.scale(dpr, dpr);

    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = dpr;
    this.gameState.canvasWidth = canvas.width;
    this.gameState.canvasHeight = canvas.height;
    this.gameState.screenWidth = logicalWidth;
    this.gameState.screenHeight = logicalHeight;

    console.log(`Canvas初始化完成: 逻辑${logicalWidth}x${logicalHeight}, 物理${canvas.width}x${canvas.height}, DPR=${dpr}`);

    this.screenAdapter = new ScreenAdapter(logicalWidth, logicalHeight);

    this.renderer = new Renderer(ctx, logicalWidth, logicalHeight);

    this.touchManager = new TouchManager(canvas, this.screenAdapter);

    // 初始化资源管理器
    this.resourceManager = new ResourceManager();

    // 初始化音频管理器
    this.audioManager = new AudioManager();

    // 初始化场景管理器
    this.sceneManager = new SceneManager(this);

    // 加载游戏数据
    this._loadGameData();

    // 注册所有场景
    this._registerScenes();

    // 绑定触摸事件
    this._bindTouchEvents();

    // 启动渲染循环
    this.renderer.start((deltaTime) => {
      this._gameLoop(deltaTime);
    });

    // 默认进入登录场景
    this.sceneManager.switchScene('login');
  },

  /**
   * 加载游戏数据
   */
  _loadGameData() {
    try {
      const savedData = storageManager.loadGameData();
      if (savedData) {
        // 恢复存档数据
        if (savedData.userInfo) {
          this.gameState.userInfo = savedData.userInfo;
          this.gameState.isLoggedIn = true;
        }
        if (savedData.resources) {
          this.gameState.resources = savedData.resources;
        }
        if (savedData.heroes && savedData.heroes.length > 0) {
          this.gameState.heroes = savedData.heroes;
        } else {
          this.gameState.heroes = gameData.getDefaultHeroes();
        }
        if (savedData.gameProgress) {
          this.gameState.gameProgress = savedData.gameProgress;
        }
        console.log('游戏数据加载成功，英雄数:', this.gameState.heroes.length);
      } else {
        // 首次进入，使用默认数据
        this.gameState.heroes = gameData.getDefaultHeroes();
        console.log('首次进入游戏，使用默认英雄数据');
      }
    } catch (e) {
      console.error('加载游戏数据失败:', e);
      this.gameState.heroes = gameData.getDefaultHeroes();
    }
  },

  /**
   * 注册所有场景
   */
  _registerScenes() {
    try {
      const LoginScene = require('./js/scenes/login-scene');
      const HomeScene = require('./js/scenes/home-scene');
      const HeroScene = require('./js/scenes/hero-scene');
      const BattleScene = require('./js/scenes/battle-scene');
      const ShopScene = require('./js/scenes/shop-scene');
      const StarmapScene = require('./js/scenes/starmap-scene');
      const PVPScene = require('./js/scenes/pvp-scene');

      this.sceneManager.register('login', new LoginScene(this));
      this.sceneManager.register('home', new HomeScene(this));
      this.sceneManager.register('hero', new HeroScene(this));
      this.sceneManager.register('battle', new BattleScene(this));
      this.sceneManager.register('shop', new ShopScene(this));
      this.sceneManager.register('starmap', new StarmapScene(this));
      this.sceneManager.register('pvp', new PVPScene(this));

      console.log('场景注册完成: login/home/hero/battle/shop/starmap/pvp');
    } catch (e) {
      console.error('注册场景失败:', e);
      console.warn('部分场景可能尚未创建，请在后续步骤中补充');
    }
  },

  /**
   * 绑定触摸事件
   */
  _bindTouchEvents() {
    const self = this;

    wx.onTouchStart(function(e) {
      self.touchManager.handleTouchStart(e);
    });

    wx.onTouchMove(function(e) {
      self.touchManager.handleTouchMove(e);
    });

    wx.onTouchEnd(function(e) {
      self.touchManager.handleTouchEnd(e);
    });

    wx.onTouchCancel(function(e) {
      self.touchManager.handleTouchCancel(e);
    });

    console.log('触摸事件绑定完成');
  },

  /**
   * 游戏主循环（每帧调用）
   * @param {number} deltaTime - 帧间隔时间（秒）
   */
  _gameLoop(deltaTime) {
    const currentScene = this.sceneManager.getCurrentScene();
    if (currentScene) {
      currentScene.update(deltaTime);

      this.ctx.clearRect(0, 0, this.gameState.screenWidth, this.gameState.screenHeight);

      this.ctx.save();
      const adapter = this.screenAdapter;
      this.ctx.translate(adapter.getOffsetX(), adapter.getOffsetY());
      this.ctx.scale(adapter.getScale(), adapter.getScale());

      // 绘制场景（使用 try/finally 确保 restore 始终执行，防止画面缩小）
      try {
        currentScene.render(this.ctx);
      } catch(e) {
        console.error('渲染错误:', e.message || e, e.stack || '');
      } finally {
        this.ctx.restore();
      }
    }
  },

  /**
   * 保存游戏数据
   */
  saveGameData() {
    const dataToSave = {
      userInfo: this.gameState.userInfo,
      resources: this.gameState.resources,
      heroes: this.gameState.heroes,
      gameProgress: this.gameState.gameProgress,
      version: '1.1.0',
      savedAt: Date.now()
    };
    storageManager.saveGameData(dataToSave);
    console.log('游戏数据已保存');
  }
};

// ---- 启动游戏 ----
console.log('【萌闯星际】小游戏启动');

// 初始化云开发
if (!wx.cloud) {
  console.error('请使用 2.2.3 或以上的基础库以使用云能力');
} else {
  try {
    wx.cloud.init({
      env: 'cloud1-1gdymmz351d78b48',
      traceUser: true
    });
    console.log('云开发初始化成功');
  } catch (e) {
    console.warn('云开发初始化失败，游戏仍可正常运行:', e);
  }
}

// 初始化 Canvas 和引擎
game._initCanvas();

// 监听小游戏切到后台
wx.onHide(function() {
  console.log('【萌闯星际】小游戏隐藏，保存数据');
  game.saveGameData();
});

// 监听小游戏切回前台
wx.onShow(function() {
  console.log('【萌闯星际】小游戏显示');
});

// 监听错误
wx.onError(function(error) {
  console.error('【萌闯星际】发生错误:', error);
});

// 挂载到全局，方便其他模块访问
GameGlobal.game = game;
