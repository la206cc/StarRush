/**
 * 萌闯星际 (Star Rush) - 本地存储管理器
 * 负责游戏数据的持久化存储和读取
 */

const STORAGE_KEYS = {
  GAME_DATA: 'starrush_game_data',           // 游戏主数据
  USER_SETTINGS: 'starrush_user_settings',   // 用户设置
  CACHE_DATA: 'starrush_cache_data',         // 缓存数据
  TEMP_DATA: 'starrush_temp_data'            // 临时数据
};

/**
 * 存储管理器类
 */
class StorageManager {
  constructor() {
    this.maxStorageSize = 5 * 1024 * 1024; // 5MB 最大存储限制（微信小程序限制）
    this.currentUsage = 0;
  }

  /**
   * 保存游戏数据
   * @param {Object} data - 游戏数据对象
   * @returns {boolean} 是否保存成功
   */
  saveGameData(data) {
    try {
      if (!data || typeof data !== 'object') {
        console.error('保存失败：无效的数据格式');
        return false;
      }

      // 添加时间戳和版本信息
      const saveData = {
        ...data,
        savedAt: Date.now(),
        version: '1.0.0'
      };

      // 序列化数据
      const jsonData = JSON.stringify(saveData);

      // 检查数据大小（小游戏环境不支持Blob，直接用字符串长度）
      const dataSize = jsonData.length;
      if (dataSize > this.maxStorageSize) {
        console.error(`保存失败：数据过大 (${(dataSize / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }

      // 同步存储
      wx.setStorageSync(STORAGE_KEYS.GAME_DATA, jsonData);

      // 更新当前使用量
      this.currentUsage = dataSize;

      console.log(`✓ 游戏数据保存成功 (${(dataSize / 1024).toFixed(2)}KB)`);
      return true;

    } catch (e) {
      console.error('✗ 保存游戏数据失败:', e);
      this.handleError(e);
      return false;
    }
  }

  /**
   * 加载游戏数据
   * @returns {Object|null} 游戏数据对象或null
   */
  loadGameData() {
    try {
      const jsonData = wx.getStorageSync(STORAGE_KEYS.GAME_DATA);

      if (!jsonData || jsonData === '') {
        console.log('未找到本地存档');
        return null;
      }

      // 解析JSON数据
      const data = JSON.parse(jsonData);

      // 验证数据完整性
      if (this.validateGameData(data)) {
        console.log('✓ 游戏数据加载成功');
        return data;
      } else {
        console.warn('⚠ 存档数据损坏，将使用默认数据');
        return null;
      }

    } catch (e) {
      console.error('✗ 加载游戏数据失败:', e);
      this.handleError(e);
      return null;
    }
  }

  /**
   * 验证游戏数据完整性
   * @param {Object} data - 游戏数据
   * @returns {boolean} 是否有效
   */
  validateGameData(data) {
    try {
      // 基本结构验证
      if (!data || typeof data !== 'object') {
        return false;
      }

      // 检查必要字段（允许部分字段缺失）
      const requiredFields = ['savedAt'];
      for (let field of requiredFields) {
        if (!(field in data)) {
          console.warn(`缺少字段: ${field}`);
          // 不返回false，允许向后兼容
        }
      }

      // 验证资源数据格式
      if (data.resources && typeof data.resources !== 'object') {
        return false;
      }

      // 验证英雄数组
      if (data.heroes && !Array.isArray(data.heroes)) {
        return false;
      }

      return true;

    } catch (e) {
      console.error('验证数据失败:', e);
      return false;
    }
  }

  /**
   * 删除游戏数据
   * @returns {boolean} 是否删除成功
   */
  clearGameData() {
    try {
      wx.removeStorageSync(STORAGE_KEYS.GAME_DATA);
      console.log('✓ 游戏数据已清除');
      return true;
    } catch (e) {
      console.error('✗ 清除游戏数据失败:', e);
      return false;
    }
  }

  /**
   * 保存用户设置
   * @param {Object} settings - 设置对象
   * @returns {boolean} 是否保存成功
   */
  saveUserSettings(settings) {
    try {
      wx.setStorageSync(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
      console.log('✓ 用户设置已保存');
      return true;
    } catch (e) {
      console.error('✗ 保存用户设置失败:', e);
      return false;
    }
  }

  /**
   * 加载用户设置
   * @returns {Object|null} 设置对象或默认设置
   */
  loadUserSettings() {
    try {
      const defaultSettings = {
        musicEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        musicVolume: 80,
        soundVolume: 100,
        language: 'zh_CN',
        quality: 'high'
      };

      const settingsJson = wx.getStorageSync(STORAGE_KEYS.USER_SETTINGS);

      if (!settingsJson) {
        return defaultSettings;
      }

      const settings = JSON.parse(settingsJson);
      return { ...defaultSettings, ...settings };

    } catch (e) {
      console.error('加载用户设置失败:', e);
      return {
        musicEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        musicVolume: 80,
        soundVolume: 100,
        language: 'zh_CN',
        quality: 'high'
      };
    }
  }

  /**
   * 保存缓存数据（临时数据）
   * @param {string} key - 缓存键名
   * @param {*} value - 缓存值
   * @param {number} expireTime - 过期时间（毫秒），可选
   */
  setCache(key, value, expireTime = null) {
    try {
      const cacheData = {
        key: key,
        value: value,
        timestamp: Date.now(),
        expireAt: expireTime ? Date.now() + expireTime : null
      };

      // 获取现有缓存
      let cache = this.loadCache();
      cache[key] = cacheData;

      // 保存缓存
      wx.setStorageSync(STORAGE_KEYS.CACHE_DATA, JSON.stringify(cache));

    } catch (e) {
      console.error('保存缓存失败:', e);
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键名
   * @returns {*} 缓存值或null
   */
  getCache(key) {
    try {
      const cache = this.loadCache();
      const item = cache[key];

      if (!item) {
        return null;
      }

      // 检查是否过期
      if (item.expireAt && Date.now() > item.expireAt) {
        delete cache[key];
        wx.setStorageSync(STORAGE_KEYS.CACHE_DATA, JSON.stringify(cache));
        return null;
      }

      return item.value;

    } catch (e) {
      console.error('读取缓存失败:', e);
      return null;
    }
  }

  /**
   * 加载所有缓存
   * @returns {Object} 缓存对象
   */
  loadCache() {
    try {
      const cacheJson = wx.getStorageSync(STORAGE_KEYS.CACHE_DATA);
      return cacheJson ? JSON.parse(cacheJson) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * 清除指定缓存
   * @param {string} key - 缓存键名
   */
  removeCache(key) {
    try {
      const cache = this.loadCache();
      delete cache[key];
      wx.setStorageSync(STORAGE_KEYS.CACHE_DATA, JSON.stringify(cache));
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    try {
      wx.removeStorageSync(STORAGE_KEYS.CACHE_DATA);
      console.log('✓ 所有缓存已清除');
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  }

  /**
   * 保存临时数据（页面间传递）
   * @param {string} key - 键名
   * @param {*} value - 值
   */
  setTempData(key, value) {
    try {
      let tempData = this.loadTempData();
      tempData[key] = {
        value: value,
        timestamp: Date.now()
      };
      wx.setStorageSync(STORAGE_KEYS.TEMP_DATA, JSON.stringify(tempData));
    } catch (e) {
      console.error('保存临时数据失败:', e);
    }
  }

  /**
   * 获取临时数据
   * @param {string} key - 键名
   * @returns {*} 值或null
   */
  getTempData(key) {
    try {
      const tempData = this.loadTempData();
      const item = tempData[key];
      return item ? item.value : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 加载所有临时数据
   * @returns {Object} 临时数据对象
   */
  loadTempData() {
    try {
      const tempJson = wx.getStorageSync(STORAGE_KEYS.TEMP_DATA);
      return tempJson ? JSON.parse(tempJson) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * 清除临时数据
   */
  clearTempData() {
    try {
      wx.removeStorageSync(STORAGE_KEYS.TEMP_DATA);
    } catch (e) {
      console.error('清除临时数据失败:', e);
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Object} 存储使用信息
   */
  getStorageInfo() {
    try {
      const info = wx.getStorageInfoSync();
      return {
        keys: info.keys,
        currentSize: info.currentSize,       // 当前占用空间（KB）
        limitSize: info.limitSize,           // 限制空间（KB）
        usagePercent: ((info.currentSize / info.limitSize) * 100).toFixed(2)
      };
    } catch (e) {
      console.error('获取存储信息失败:', e);
      return {
        keys: [],
        currentSize: 0,
        limitSize: this.maxStorageSize / 1024,
        usagePercent: '0'
      };
    }
  }

  /**
   * 数据备份（导出为字符串）
   * @returns {string} 备份数据字符串
   */
  exportBackup() {
    try {
      const gameData = this.loadGameData();
      if (!gameData) {
        throw new Error('没有可导出的数据');
      }

      const backupData = {
        type: 'STARRUSH_BACKUP',
        version: '1.0.0',
        timestamp: Date.now(),
        data: gameData
      };

      // 使用自定义Base64编码（小游戏环境不支持btoa/atob）
      const backupString = this._base64Encode(JSON.stringify(backupData));
      console.log('✓ 数据导出成功');
      return backupString;

    } catch (e) {
      console.error('数据导出失败:', e);
      return null;
    }
  }

  /**
   * 数据恢复（从字符串导入）
   * @param {string} backupString - 备份字符串
   * @returns {boolean} 是否恢复成功
   */
  importBackup(backupString) {
    try {
      // 使用自定义Base64解码（小游戏环境不支持btoa/atob）
      const backupData = JSON.parse(this._base64Decode(backupString));

      // 验证备份格式
      if (backupData.type !== 'STARRUSH_BACKUP') {
        throw new Error('无效的备份文件');
      }

      // 验证备份数据
      if (!this.validateGameData(backupData.data)) {
        throw new Error('备份数据损坏');
      }

      // 恢复数据
      const success = this.saveGameData(backupData.data);

      if (success) {
        console.log('✓ 数据恢复成功');
        console.log(`备份时间: ${new Date(backupData.timestamp).toLocaleString()}`);
      }

      return success;

    } catch (e) {
      console.error('数据恢复失败:', e);
      return false;
    }
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   */
  handleError(error) {
    // 记录错误日志
    console.error('[StorageManager] Error:', error.message, error.stack);

    // 根据错误类型给出提示
    if (error.message.includes('storage')) {
      wx.showToast({
        title: '存储空间不足',
        icon: 'none',
        duration: 2000
      });
    } else if (error.message.includes('quota')) {
      wx.showToast({
        title: '超出存储配额',
        icon: 'none',
        duration: 2000
      });
    }
  }

  /**
   * Base64编码（小游戏环境不支持btoa，使用自定义实现）
   * @param {string} str - 要编码的字符串
   * @returns {string} Base64编码后的字符串
   */
  _base64Encode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }

    return result;
  }

  /**
   * Base64解码（小游戏环境不支持atob，使用自定义实现）
   * @param {string} str - Base64编码的字符串
   * @returns {string} 解码后的原始字符串
   */
  _base64Decode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    str = str.replace(/=+$/, '');

    while (i < str.length) {
      const a = chars.indexOf(str.charAt(i++));
      const b = chars.indexOf(str.charAt(i++));
      const c = chars.indexOf(str.charAt(i++));
      const d = chars.indexOf(str.charAt(i++));

      const bitmap = (a << 18) | (b << 12) | (c << 6) | d;

      result += String.fromCharCode((bitmap >> 16) & 255);
      if (c !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (d !== 64) result += String.fromCharCode(bitmap & 255);
    }

    return result;
  }
}

// 导出单例实例
module.exports = new StorageManager();
