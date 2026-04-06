/**
 * 萌闯星际 (Star Rush) - 音频管理器
 * 负责背景音乐(BGM)和音效(SFX)的播放、暂停和音量控制
 * 使用 wx.createInnerAudioContext() API（微信小游戏环境）
 */

class AudioManager {
  constructor() {
    // 背景音乐实例
    this.bgm = null;
    this.currentBgmSrc = null;  // 当前BGM路径

    // 音量设置
    this.sfxVolume = 0.8;   // 音效音量 (0-1)
    this.bgmVolume = 0.5;   // BGM音量 (0-1)

    // 静音状态
    this.muted = false;

    // 当前播放的音效列表（用于管理生命周期）
    this.activeSfxList = [];

    console.log('音频管理器初始化完成');
  }

  /**
   * 播放背景音乐
   * @param {string} src - 音乐文件路径或URL
   */
  playBGM(src) {
    if (!src) return;

    // 静音时不播放
    if (this.muted) {
      console.log('已静音，跳过BGM播放');
      return;
    }

    // 如果正在播放相同的BGM，不重复播放
    if (this.currentBgmSrc === src && this.bgm) {
      console.log('当前已在播放相同BGM');
      return;
    }

    // 停止之前的BGM
    this.stopBGM();

    try {
      // 创建新的音频上下文
      this.bgm = wx.createInnerAudioContext();
      this.bgm.src = src;

      // 设置循环和音量
      this.bgm.loop = true;
      this.bgm.volume = this.bgmVolume;

      // 播放
      this.bgm.play();

      // 记录当前BGM
      this.currentBgmSrc = src;

      // 错误处理
      this.bgm.onError((err) => {
        console.error('BGM播放错误:', err);
        this.bgm = null;
        this.currentBgmSrc = null;
      });

      console.log(`BGM开始播放: ${src}`);
    } catch (e) {
      console.error('创建BGM失败:', e);
      this.bgm = null;
      this.currentBgmSrc = null;
    }
  }

  /**
   * 停止背景音乐
   */
  stopBGM() {
    if (this.bgm) {
      try {
        this.bgm.stop();
        this.bgm.destroy();  // 销毁释放资源
      } catch (e) {
        console.error('停止BGM错误:', e);
      }
      this.bgm = null;
      this.currentBgmSrc = null;
      console.log('BGM已停止');
    }
  }

  /**
   * 暂停背景音乐
   */
  pauseBGM() {
    if (this.bgm) {
      try {
        this.bgm.pause();
        console.log('BGM已暂停');
      } catch (e) {
        console.error('暂停BGM错误:', e);
      }
    }
  }

  /**
   * 恢复背景音乐播放
   */
  resumeBGM() {
    if (this.bgm && !this.muted) {
      try {
        this.bgm.play();
        console.log('BGM已恢复播放');
      } catch (e) {
        console.error('恢复BGM错误:', e);
      }
    }
  }

  /**
   * 播放音效
   * @param {string} src - 音效文件路径或URL
   * @param {number} [volume] - 可选的音量覆盖（0-1）
   */
  playSFX(src, volume) {
    if (!src || this.muted) return;

    try {
      const sfx = wx.createInnerAudioContext();
      sfx.src = src;

      // 使用传入的音量或默认音效音量
      sfx.volume = (volume !== undefined) ? volume : this.sfxVolume;

      // 不循环，播放一次
      sfx.loop = false;

      // 播放
      sfx.play();

      // 加入活动列表
      this.activeSfxList.push(sfx);

      // 播放结束后自动销毁释放资源
      sfx.onEnded(() => {
        const index = this.activeSfxList.indexOf(sfx);
        if (index > -1) {
          this.activeSfxList.splice(index, 1);
        }
        sfx.destroy();
      });

      // 错误时也销毁
      sfx.onError(() => {
        const index = this.activeSfxList.indexOf(sfx);
        if (index > -1) {
          this.activeSfxList.splice(index, 1);
        }
        sfx.destroy();
      });

    } catch (e) {
      console.error(`播放音效失败 [${src}]:`, e);
    }
  }

  /**
   * 停止所有正在播放的音效
   */
  stopAllSFX() {
    for (let i = this.activeSfxList.length - 1; i >= 0; i--) {
      try {
        const sfx = this.activeSfxList[i];
        sfx.stop();
        sfx.destroy();
      } catch (e) {
        console.error('停止音效错误:', e);
      }
    }
    this.activeSfxList = [];
    console.log('所有音效已停止');
  }

  /**
   * 设置静音状态
   * @param {boolean} muted - 是否静音
   */
  setMuted(muted) {
    this.muted = muted;

    if (muted) {
      // 静音时停止BGM
      this.stopBGM();
      // 停止所有音效
      this.stopAllSFX();
    }

    console.log(`静音状态: ${muted ? '开启' : '关闭'}`);
  }

  /**
   * 切换静音状态
   * @returns {boolean} 切换后的静音状态
   */
  toggleMute() {
    this.muted = !this.muted;
    this.setMuted(this.muted);
    return this.muted;
  }

  /**
   * 设置BGM音量
   * @param {number} volume - 音量值(0-1)
   */
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume;
    }
  }

  /**
   * 设置音效音量
   * @param {number} volume - 音量值(0-1)
   */
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 获取当前静音状态
   * @returns {boolean} 是否静音
   */
  isMuted() {
    return this.muted;
  }

  /**
   * 获取BGM音量
   * @returns {number} BGM音量(0-1)
   */
  getBGMVolume() {
    return this.bgmVolume;
  }

  /**
   * 获取音效音量
   * @returns {number} 音效音量(0-1)
   */
  getSFXVolume() {
    return this.sfxVolume;
  }

  /**
   * 获取当前活动音效数量
   * @returns {number} 正在播放的音效数量
   */
  getActiveSFXCount() {
    return this.activeSfxList.length;
  }

  /**
   * 检查是否有BGM在播放
   * @returns {boolean} 是否有BGM在播放
   */
  isPlayingBGM() {
    return this.bgm !== null;
  }
}

module.exports = AudioManager;
