/**
 * 萌闯星际 (Star Rush) - 资源管理器
 * 负责游戏资源的加载、缓存和管理
 * 使用 canvas.createImage() API 加载图片（微信小游戏环境）
 */

class ResourceManager {
  constructor() {
    // 资源缓存 { src: Image对象 }
    this.cache = {};

    // 正在加载的资源计数
    this.loadingCount = 0;

    // 加载状态回调
    this.onProgress = null;  // 进度回调 (loaded, total)
    this.onComplete = null;  // 完成回调

    console.log('资源管理器初始化完成');
  }

  /**
   * 加载单张图片
   * @param {string} src - 图片路径或URL
   * @returns {Promise<HTMLImageElement>} 返回加载完成的Image对象
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      // 检查缓存，已存在则直接返回
      if (this.cache[src]) {
        resolve(this.cache[src]);
        return;
      }

      // 使用小游戏API创建图片对象
      const img = wx.createImage();

      img.onload = () => {
        // 缓存图片
        this.cache[src] = img;
        this.loadingCount--;

        // 触发进度回调
        if (this.onProgress) {
          const totalCached = Object.keys(this.cache).length;
          this.onProgress(totalCached, totalCached + this.loadingCount);
        }

        resolve(img);
        console.log(`资源加载成功: ${src}`);
      };

      img.onerror = (err) => {
        this.loadingCount--;
        reject(new Error(`图片加载失败: ${src}`));
        console.error(`资源加载失败: ${src}`, err);
      };

      // 开始加载
      img.src = src;
      this.loadingCount++;
    });
  }

  /**
   * 批量预加载多张图片
   * @param {string[]} srcList - 图片路径数组
   * @returns {Promise<HTMLImageElement[]>} 返回所有加载完成的Image对象数组
   */
  preloadImages(srcList) {
    if (!srcList || !Array.isArray(srcList) || srcList.length === 0) {
      console.warn('预加载列表为空');
      return Promise.resolve([]);
    }

    console.log(`开始批量预加载: ${srcList.length} 个资源`);
    const startTime = Date.now();

    return Promise.all(srcList.map(src => this.loadImage(src)))
      .then(results => {
        const duration = Date.now() - startTime;
        console.log(`批量预加载完成: ${results.length}/${srcList.length}, 耗时${duration}ms`);

        // 触发完成回调
        if (this.onComplete) {
          this.onComplete(results);
        }

        return results;
      })
      .catch(err => {
        console.error('批量预加载部分失败:', err);
        throw err;
      });
  }

  /**
   * 获取已缓存的资源
   * @param {string} src - 图片路径
   * @returns {HTMLImageElement|undefined} 缓存的Image对象或undefined
   */
  get(src) {
    return this.cache[src];
  }

  /**
   * 检查资源是否已缓存
   * @param {string} src - 图片路径
   * @returns {boolean} 是否已缓存
   */
  isCached(src) {
    return src in this.cache;
  }

  /**
   * 检查是否有正在加载中的资源
   * @returns {boolean} 是否正在加载
   */
  isLoading() {
    return this.loadingCount > 0;
  }

  /**
   * 获取当前正在加载数量
   * @returns {number} 正在加载的数量
   */
  getLoadingCount() {
    return this.loadingCount;
  }

  /**
   * 获取已缓存资源数量
   * @returns {number} 缓存数量
   */
  getCachedCount() {
    return Object.keys(this.cache).length;
  }

  /**
   * 清除指定资源的缓存
   * @param {string} src - 图片路径
   */
  removeCache(src) {
    if (this.cache[src]) {
      delete this.cache[src];
      console.log(`资源缓存已清除: ${src}`);
    }
  }

  /**
   * 清除所有资源缓存
   */
  clearCache() {
    const count = Object.keys(this.cache).length;
    this.cache = {};
    console.log(`所有资源缓存已清除, 共${count}个`);
  }

  /**
   * 设置加载进度回调
   * @param {Function} callback - 进度回调函数 (loaded, total)
   */
  setOnProgress(callback) {
    this.onProgress = callback;
  }

  /**
   * 设置加载完成回调
   * @param {Function} callback - 完成回调函数 (results)
   */
  setOnComplete(callback) {
    this.onComplete = callback;
  }
}

module.exports = ResourceManager;
