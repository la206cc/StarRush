/**
 * 萌闯星际 (Star Rush) - 场景管理器
 * 负责场景的注册、切换和生命周期管理
 * 每个场景需要实现 update(dt) 和 render(ctx) 方法
 */

class SceneManager {
  /**
   * 构造函数
   * @param {Object} game - 游戏实例（Game() 构造器返回的对象）
   */
  constructor(game) {
    this.game = game;

    // 场景注册表 { name: sceneInstance }
    this.scenes = {};

    // 当前活动场景
    this.currentSceneName = null;
    this.currentScene = null;

    // 场景过渡效果参数
    this.transitionAlpha = 0;
    this.isTransitioning = false;
    this.transitionDuration = 0.3;  // 过渡动画时长(秒)

    console.log('场景管理器初始化完成');
  }

  /**
   * 注册场景
   * @param {string} name - 场景名称（唯一标识）
   * @param {Object} scene - 场景实例（需实现 onEnter, onExit, update, render 方法）
   */
  register(name, scene) {
    if (!name || typeof name !== 'string') {
      console.error('场景注册失败: 无效的场景名称');
      return;
    }

    if (this.scenes[name]) {
      console.warn(`场景 "${name}" 已存在，将被覆盖`);
    }

    // 绑定管理器和游戏实例到场景
    this.scenes[name] = scene;
    scene.manager = this;
    scene.game = this.game;

    console.log(`场景已注册: ${name}`);
  }

  /**
   * 切换到指定场景
   * @param {string} name - 目标场景名称
   * @param {Object} [params={}] - 传递给新场景的参数
   */
  switchScene(name, params = {}) {
    if (!this.scenes[name]) {
      console.error(`场景切换失败: 场景 "${name}" 不存在`);
      console.log('可用场景:', Object.keys(this.scenes));
      return;
    }

    const oldScene = this.currentScene;
    const newScene = this.scenes[name];

    // 执行旧场景的退出逻辑
    if (oldScene && typeof oldScene.onExit === 'function') {
      try {
        oldScene.onExit();
      } catch (e) {
        console.error(`场景退出错误 [${this.currentSceneName}]:`, e);
      }
    }

    // 清除旧的触摸区域（防止残留点击区域干扰新场景）
    if (this.game.touchManager && typeof this.game.touchManager.clearAreas === 'function') {
      this.game.touchManager.clearAreas();
    }

    // 更新当前场景引用
    this.currentSceneName = name;
    this.currentScene = newScene;
    this.game.gameState.currentScene = name;

    // 执行新场景的进入逻辑
    if (typeof newScene.onEnter === 'function') {
      try {
        newScene.onEnter(params);
      } catch (e) {
        console.error(`场景进入错误 [${name}]:`, e);
      }
    }

    console.log(`场景切换成功: -> ${name}`);
  }

  /**
   * 获取当前活动场景
   * @returns {Object|null} 当前场景实例或null
   */
  getCurrentScene() {
    return this.currentScene;
  }

  /**
   * 获取当前场景名称
   * @returns {string|null} 当前场景名称或null
   */
  getCurrentSceneName() {
    return this.currentSceneName;
  }

  /**
   * 根据名称获取场景实例（不切换，仅获取引用）
   * @param {string} name - 场景名称
   * @returns {Object|undefined} 场景实例或undefined
   */
  getScene(name) {
    return this.scenes[name];
  }

  /**
   * 检查指定场景是否已注册
   * @param {string} name - 场景名称
   * @returns {boolean} 是否已注册
   */
  hasScene(name) {
    return name in this.scenes;
  }

  /**
   * 获取所有已注册的场景名称列表
   * @returns {string[]} 场景名称数组
   */
  getSceneNames() {
    return Object.keys(this.scenes);
  }

  /**
   * 获取已注册场景数量
   * @returns {number} 场景数量
   */
  getSceneCount() {
    return Object.keys(this.scenes).length;
  }
}

module.exports = SceneManager;
