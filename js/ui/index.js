/**
 * UI 组件库统一导出入口 - StarRush UI Kit
 *
 * 本模块导出所有 UI 组件及常量定义，适用于微信小游戏 Canvas 2D 绘制。
 * 设计稿基准尺寸：宽 750 x 高 1334
 *
 * 使用方式：
 *   const UI = require('./ui/index');
 *   const btn = new UI.Button({ text: '开始游戏', ... });
 *   btn.render(ctx);
 */

// ---- 主题色常量 ----
var COLORS = {
  bgDark: '#0f0f23',
  bgCard: 'rgba(20, 20, 45, 0.85)',
  primary: '#4fc3f7',
  accent: '#7c4dff',
  success: '#69f0ae',
  warning: '#ffd740',
  danger: '#ff5252',
  textLight: '#ffffff',
  textMuted: '#8892b0',
  gold: '#ffd700',
  purple: '#7c4dff',
  blue: '#4fc3f7',
  red: '#ff5252',
  green: '#69f0ae',
  orange: '#ff9800',
  pink: '#ff4081',
  gray: '#9e9e9e'
};

// ---- 稀有度颜色常量 ----
var RARITY_COLORS = {
  N: '#9e9e9e',      // 普通 - 灰
  R: '#4fc3f7',      // 稀有 - 蓝
  SR: '#7c4dff',     // 史诗 - 紫
  SSR: '#ff9800',    // 传说 - 金/橙
  MYTHIC: '#ff4081'  // 神话 - 粉
};

// ---- 导出所有组件 ----
module.exports = {
  // 组件类
  Button: require('./button'),
  Panel: require('./panel'),
  Text: require('./text'),
  ProgressBar: require('./progress-bar'),
  Card: require('./card'),
  ScrollList: require('./list'),
  TabBar: require('./tab-bar'),
  ResourceBar: require('./resource-bar'),

  // 常量
  COLORS: COLORS,
  RARITY_COLORS: RARITY_COLORS
};
