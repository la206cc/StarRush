/**
 * 萌闯星际 (Star Rush) - 游戏数据配置
 * 包含英雄、关卡、装备等静态游戏数据
 */

// ==================== 英雄品质定义 ====================

const QUALITY_TYPES = {
  COMMON: {
    id: 'common',
    name: '普通',
    color: '#9e9e9e',
    bgColor: 'rgba(158, 158, 158, 0.2)',
    probability: 50     // 抽取概率%
  },
  RARE: {
    id: 'rare',
    name: '稀有',
    color: '#4fc3f7',
    bgColor: 'rgba(79, 195, 247, 0.2)',
    probability: 30
  },
  EPIC: {
    id: 'epic',
    name: '史诗',
    color: '#7c4dff',
    bgColor: 'rgba(124, 77, 255, 0.2)',
    probability: 15
  },
  LEGENDARY: {
    id: 'legendary',
    name: '传说',
    color: '#ff9800',
    bgColor: 'rgba(255, 152, 0, 0.2)',
    probability: 4.5
  },
  MYTHIC: {
    id: 'mythic',
    name: '神话',
    color: '#ff4081',
    bgColor: 'rgba(255, 64, 129, 0.2)',
    probability: 0.5
  }
};

// ==================== 英雄职业定义 ====================

const HERO_CLASSES = {
  WARRIOR: {
    id: 'warrior',
    name: '战士',
    description: '近战物理输出，高生命值和防御力',
    icon: 'sword',
    baseStats: {
      hp: 1200,
      attack: 150,
      defense: 80,
      speed: 60
    },
    growthRates: {
      hp: 1.15,
      attack: 1.10,
      defense: 1.12,
      speed: 1.05
    }
  },
  MAGE: {
    id: 'mage',
    name: '法师',
    description: '远程魔法输出，高攻击但低防御',
    icon: 'staff',
    baseStats: {
      hp: 800,
      attack: 200,
      defense: 40,
      speed: 70
    },
    growthRates: {
      hp: 1.08,
      attack: 1.18,
      defense: 1.05,
      speed: 1.08
    }
  },
  ARCHER: {
    id: 'archer',
    name: '射手',
    description: '远程物理输出，高速度和暴击率',
    icon: 'bow',
    baseStats: {
      hp: 900,
      attack: 170,
      defense: 50,
      speed: 90
    },
    growthRates: {
      hp: 1.10,
      attack: 1.12,
      defense: 1.06,
      speed: 1.12
    }
  },
  ASSASSIN: {
    id: 'assassin',
    name: '刺客',
    description: '爆发型输出，极高暴击伤害',
    icon: 'dagger',
    baseStats: {
      hp: 750,
      attack: 180,
      defense: 35,
      speed: 100
    },
    growthRates: {
      hp: 1.06,
      attack: 1.15,
      defense: 1.04,
      speed: 1.15
    }
  },
  SUPPORT: {
    id: 'support',
    name: '辅助',
    description: '治疗和控制，团队核心',
    icon: 'heal',
    baseStats: {
      hp: 950,
      attack: 120,
      defense: 60,
      speed: 75
    },
    growthRates: {
      hp: 1.12,
      attack: 1.08,
      defense: 1.09,
      speed: 1.07
    }
  },
  TANK: {
    id: 'tank',
    name: '坦克',
    description: '高血量高防御，保护队友',
    icon: 'shield',
    baseStats: {
      hp: 1600,
      attack: 100,
      defense: 120,
      speed: 45
    },
    growthRates: {
      hp: 1.20,
      attack: 1.06,
      defense: 1.16,
      speed: 1.03
    }
  }
};

// ==================== 英雄升级配置 ====================

const HERO_UPGRADE_CONFIG = {
  levelCostBase: 500,       // 升级基础费用（金币）
  levelCostPerLv: 200,      // 每级额外费用（金币）
  levelAtkGrowth: [0.10, 0.15],
  levelHpGrowth: 0.12,
  stageCostBase: 150,       // 进阶基础费用
  stageCostPerStage: 100,
  stageMaxLevel: 20,
  stageBonus: [0, 0.05, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.10, 0.10, 0.10, 0.10, 0.10, 0.12, 0.12, 0.12, 0.12, 0.12],
  stageNames: ['', '★', '★★', '★★★', '★★★★', '★★★★★', '蓝星', '蓝星★★', '蓝星★★★', '蓝星★★★★', '蓝星★★★★★', '绿星', '绿星★★', '绿星★★★', '绿星★★★★', '绿星★★★★★', '钻石', '钻石★★', '钻石★★★', '钻石★★★★', '钻石★★★★★'],
  levelMaxLevel: 160,
  // 不同类型英雄进阶消耗不同资源
  stageCurrencyMap: {
    crystal: { resource: 'crystal', icon: '💎', name: '晶矿' },
    energy:  { resource: 'starEnergy', icon: '⚡', name: '星能' },
    source:  { resource: 'essence', icon: '🧪', name: '源质' }
  }
};

// ==================== 英雄数据表（参考 hero-config.js）====================

const HERO_TABLE = [
  // ── 💎 晶矿系（物理攻防） ──
  {
    id: 'hero_001',
    battleId: 'mech_dog',
    name: '机械犬',
    emoji: '🐕',
    category: 'crystal',
    attributeType: 'single',
    type: '近战',
    initLevel: 5, initStage: 2, initAtk: 62, initHp: 345, owned: true,
    cost: 20, atkSpd: 1.2, range: 80, moveSpd: 3.0, role: 'melee',
    skills: [
      { icon: '🔥', name: '重击', desc: '对单体造成{x}%伤害', levels: [150, 170, 200], unlockLv: [1, 5, 10] },
      { icon: '🛡️', name: '铁壁', desc: '减伤{x}%持续3秒', levels: [20, 30, 40], unlockLv: [3, 8, 15] },
      { icon: '💥', name: '狂暴', desc: '攻速提升{x}%持续5秒', levels: [30, 50, 70], unlockLv: [7, 12, 20] }
    ]
  },
  {
    id: 'hero_002',
    battleId: 'crystal_turret',
    name: '晶矿炮塔',
    emoji: '🏗️',
    category: 'crystal',
    attributeType: 'single',
    type: '远程',
    initLevel: 3, initStage: 1, initAtk: 48, initHp: 230, owned: true,
    cost: 25, atkSpd: 1.5, range: 200, moveSpd: 0, role: 'ranged',
    skills: [
      { icon: '🎯', name: '精准射击', desc: '远程{x}%暴击', levels: [20, 35, 50], unlockLv: [1, 5, 10] },
      { icon: '💣', name: '爆裂弹', desc: 'AOE{x}%伤害', levels: [80, 120, 160], unlockLv: [4, 9, 15] },
      { icon: '🔒', name: '锁定', desc: '标记目标受伤+{x}%', levels: [15, 25, 40], unlockLv: [8, 14, 20] }
    ]
  },
  {
    id: 'hero_003',
    battleId: 'heavy_mech',
    name: '重装机甲',
    emoji: '🤖',
    category: 'crystal',
    attributeType: 'single',
    type: '坦克',
    initLevel: 4, initStage: 1, initAtk: 35, initHp: 520, owned: true,
    cost: 30, atkSpd: 2.0, range: 100, moveSpd: 1.5, role: 'tank',
    skills: [
      { icon: '🛡️', name: '坚守', desc: '减伤{x}%', levels: [30, 45, 60], unlockLv: [1, 5, 10] },
      { icon: '⚡', name: '反击', desc: '受击反弹{x}%伤害', levels: [20, 35, 50], unlockLv: [3, 8, 15] },
      { icon: '🏔️', name: '不动如山', desc: '免疫控制{x}秒', levels: [2, 3, 5], unlockLv: [7, 12, 20] }
    ]
  },

  // ── ⚡ 星能系（能量攻防） ──
  {
    id: 'hero_101',
    battleId: 'photon_cat',
    name: '光子猫',
    emoji: '🐱',
    category: 'energy',
    attributeType: 'single',
    type: '单体',
    initLevel: 4, initStage: 2, initAtk: 72, initHp: 210, owned: true,
    cost: 25, atkSpd: 1.8, range: 250, moveSpd: 2.5, role: 'ranged',
    skills: [
      { icon: '✨', name: '光子弹', desc: '单体{x}%伤害', levels: [180, 220, 280], unlockLv: [1, 5, 10] },
      { icon: '🌀', name: '折射', desc: '弹射{x}个目标', levels: [2, 3, 4], unlockLv: [4, 9, 15] },
      { icon: '💫', name: '超载', desc: '暴击率+{x}%', levels: [15, 25, 40], unlockLv: [8, 14, 20] }
    ]
  },
  {
    id: 'hero_102',
    battleId: 'energy_beast',
    name: '能量兽',
    emoji: '🐉',
    category: 'energy',
    attributeType: 'single',
    type: 'AOE',
    initLevel: 3, initStage: 1, initAtk: 42, initHp: 250, owned: true,
    cost: 30, atkSpd: 2.0, range: 150, moveSpd: 2.0, role: 'aoe',
    skills: [
      { icon: '🔥', name: '吐息', desc: '扇形{x}%AOE', levels: [100, 140, 180], unlockLv: [1, 5, 10] },
      { icon: '🌊', name: '震荡波', desc: '击退+{x}%减速', levels: [20, 35, 50], unlockLv: [4, 9, 15] },
      { icon: '💀', name: '毁灭', desc: '全屏{x}%伤害', levels: [60, 90, 130], unlockLv: [8, 14, 20] }
    ]
  },
  {
    id: 'hero_103',
    battleId: null,
    name: '电弧守卫',
    emoji: '⚡',
    category: 'energy',
    attributeType: 'single',
    type: '连锁',
    initLevel: 1, initStage: 1, initAtk: 45, initHp: 200, owned: false,
    cost: 28, atkSpd: 2.2, range: 180, moveSpd: 2.0, role: 'ranged',
    skills: [
      { icon: '⚡', name: '电弧', desc: '连锁{x}个目标', levels: [3, 4, 6], unlockLv: [1, 5, 10] },
      { icon: '🔋', name: '充能', desc: '攻击+{x}%', levels: [20, 35, 50], unlockLv: [4, 9, 15] },
      { icon: '⛈️', name: '雷暴', desc: '范围麻痹{x}秒', levels: [1, 2, 3], unlockLv: [8, 14, 20] }
    ]
  },

  // ── 🧪 源质系（辅助医疗） ──
  {
    id: 'hero_201',
    battleId: 'nano_rabbit',
    name: '纳米兔',
    emoji: '🐰',
    category: 'source',
    attributeType: 'single',
    type: '治疗',
    initLevel: 4, initStage: 1, initAtk: 25, initHp: 180, owned: true,
    cost: 15, atkSpd: 2.5, range: 150, moveSpd: 2.8, role: 'heal',
    healRatio: 0.8,
    skills: [
      { icon: '💚', name: '治愈', desc: '基于攻击力{x}%转化治疗量', levels: [80, 100, 130], unlockLv: [1, 5, 10] },
      { icon: '🌿', name: '再生', desc: '攻击力{x}%持续回血/秒', levels: [20, 35, 50], unlockLv: [3, 8, 15] },
      { icon: '🌟', name: '复苏', desc: '攻击力{x}%复活血量', levels: [150, 250, 400], unlockLv: [7, 12, 20] }
    ]
  },
  {
    id: 'hero_202',
    battleId: 'speed_pet',
    name: '加速萌宠',
    emoji: '🏃',
    category: 'source',
    attributeType: 'single',
    type: '加速',
    initLevel: 2, initStage: 1, initAtk: 18, initHp: 150, owned: true,
    cost: 12, atkSpd: 2.8, range: 120, moveSpd: 3.5, role: 'buff',
    buffRatio: 0.6,
    skills: [
      { icon: '💨', name: '加速', desc: '基于攻击力{x}%转化移速加成', levels: [60, 80, 100], unlockLv: [1, 5, 10] },
      { icon: '🏃', name: '冲刺', desc: '攻击力{x}%转化攻速加成', levels: [40, 60, 80], unlockLv: [3, 8, 15] },
      { icon: '⚡', name: '闪现', desc: '瞬移+无敌{x}秒', levels: [1, 2, 3], unlockLv: [7, 12, 20] }
    ]
  },
  {
    id: 'hero_203',
    battleId: null,
    name: '护盾萌宠',
    emoji: '🛡️',
    category: 'source',
    attributeType: 'single',
    type: '护盾',
    initLevel: 1, initStage: 1, initAtk: 20, initHp: 200, owned: false,
    cost: 18, atkSpd: 3.0, range: 100, moveSpd: 2.0, role: 'buff',
    buffRatio: 0.7,
    skills: [
      { icon: '🛡️', name: '护盾', desc: '基于攻击力{x}%生成护盾', levels: [120, 180, 250], unlockLv: [1, 5, 10] },
      { icon: '🔰', name: '反射盾', desc: '攻击力{x}%反弹伤害', levels: [40, 60, 90], unlockLv: [4, 9, 15] },
      { icon: '💎', name: '结晶', desc: '攻击力{x}%全队护盾', levels: [80, 120, 180], unlockLv: [8, 14, 20] }
    ]
  }
];

// ==================== 默认英雄列表 ====================

const DEFAULT_HEROES = HERO_TABLE.map(function(h) {
  return {
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    category: h.category,
    attributeType: h.attributeType || 'single',
    subCategory: h.subCategory || null,
    subCategory2: h.subCategory2 || null,
    type: h.type,
    level: h.initLevel,
    stage: h.initStage,
    atk: h.initAtk,
    hp: h.initHp,
    atkSpd: h.atkSpd,
    range: h.range,
    moveSpd: h.moveSpd,
    role: h.role,
    cost: h.cost,
    owned: h.owned,
    skills: h.skills || []
  };
});

// ==================== 关卡数据 ====================

const CHAPTERS = [
  {
    id: 'chapter_1',
    name: '新星系',
    description: '初入宇宙，探索未知的新星系',
    difficulty: 1,
    stages: [
      {
        id: 'stage_1_1',
        name: '空间站外围',
        description: '清理入侵的外星生物',
        recommendedPower: 500,
        rewards: {
          crystal: [100, 200],
          essence: [20, 50],
          exp: [50, 100]
        },
        enemies: [
          { id: 'enemy_001', level: 1, count: 3 }
        ],
        stars: 0,
        isUnlocked: true,
        isCleared: false
      },
      {
        id: 'stage_1_2',
        name: '小行星带',
        description: '穿越危险的小行星区域',
        recommendedPower: 600,
        rewards: {
          crystal: [150, 250],
          essence: [30, 60],
          exp: [70, 120]
        },
        enemies: [
          { id: 'enemy_002', level: 2, count: 4 }
        ],
        stars: 0,
        isUnlocked: false,
        isCleared: false
      },
      {
        id: 'stage_1_3',
        name: '废弃飞船',
        description: '探索一艘神秘的废弃飞船',
        recommendedPower: 700,
        rewards: {
          crystal: [200, 300],
          essence: [40, 80],
          exp: [90, 150]
        },
        enemies: [
          { id: 'enemy_003', level: 3, count: 1 },
          { id: 'enemy_001', level: 2, count: 3 }
        ],
        stars: 0,
        isUnlocked: false,
        isCleared: false
      }
    ],
    totalStars: 0,
    isUnlocked: true
  },
  {
    id: 'chapter_2',
    name: '暗星域',
    description: '深入黑暗的星域，面对更强大的敌人',
    difficulty: 2,
    stages: [],
    totalStars: 0,
    isUnlocked: false
  },
  {
    id: 'chapter_3',
    name: '星云深处',
    description: '探索绚丽的星云，发现古老的文明遗迹',
    difficulty: 3,
    stages: [],
    totalStars: 0,
    isUnlocked: false
  }
];

// ==================== 商城商品数据 ====================

const SHOP_ITEMS = [
  {
    id: 'shop_001',
    name: '晶矿礼包',
    type: 'resource',
    subtype: 'crystal',
    quality: 'common',
    price: { type: 'starCoin', amount: 100 },
    reward: { crystal: 1000 },
    description: '获得1000晶矿',
    icon: '/images/shop/crystal_pack.png',
    limitType: 'daily',
    limitCount: 5,
    purchasedCount: 0,
    discount: 0
  },
  {
    id: 'shop_002',
    name: '源质宝箱',
    type: 'resource',
    subtype: 'essence',
    quality: 'rare',
    price: { type: 'starCoin', amount: 300 },
    reward: { essence: 500 },
    description: '获得500源质',
    icon: '/images/shop/essence_box.png',
    limitType: 'weekly',
    limitCount: 10,
    purchasedCount: 0,
    discount: 0
  },
  {
    id: 'shop_003',
    name: '英雄召唤券',
    type: 'summon',
    subtype: 'hero_ticket',
    quality: 'epic',
    price: { type: 'starCoin', amount: 280 },
    reward: { heroTicket: 1 },
    description: '用于在英雄召唤中使用',
    icon: '/images/shop/summon_ticket.png',
    limitType: 'daily',
    limitCount: 3,
    purchasedCount: 0,
    discount: 10
  },
  {
    id: 'shop_004',
    name: '经验药水',
    type: 'consumable',
    subtype: 'exp_potion',
    quality: 'common',
    price: { type: 'crystal', amount: 500 },
    reward: { exp: 1000 },
    description: '为选中英雄提供1000经验值',
    icon: '/images/shop/exp_potion.png',
    limitType: 'none',
    limitCount: -1,
    purchasedCount: 0,
    discount: 0
  }
];

// ==================== 敌人数据模板 ====================

const ENEMY_TEMPLATES = [
  {
    id: 'enemy_001',
    name: '太空史莱姆',
    description: '最低级的宇宙生物',
    quality: 'common',
    hp: 300,
    attack: 40,
    defense: 10,
    speed: 50,
    skills: [
      {
        name: '撞击',
        damage: 1.0,
        type: 'physical'
      }
    ],
    rewards: {
      crystal: [20, 40],
      exp: [10, 20]
    },
    icon: '/images/enemies/slime.png'
  },
  {
    id: 'enemy_002',
    name: '机械蜘蛛',
    description: '被遗弃的机械生物',
    quality: 'common',
    hp: 500,
    attack: 60,
    defense: 25,
    speed: 65,
    skills: [
      {
        name: '机械撕咬',
        damage: 1.2,
        type: 'physical'
      },
      {
        name: '网状陷阱',
        damage: 0.5,
        type: 'control',
        effect: 'speed_down'
      }
    ],
    rewards: {
      crystal: [40, 70],
      essence: [10, 20],
      exp: [25, 40]
    },
    icon: '/images/enemies/spider.png'
  },
  {
    id: 'enemy_003',
    name: '暗影领主',
    description: '暗星域的统治者',
    quality: 'rare',
    hp: 2000,
    attack: 150,
    defense: 80,
    speed: 55,
    skills: [
      {
        name: '暗影斩',
        damage: 1.8,
        type: 'dark'
      },
      {
        name: '黑暗领域',
        damage: 0.8,
        type: 'aoe',
        effect: 'dot'
      },
      {
        name: '虚空召唤',
        damage: 0,
        type: 'summon',
        summonCount: 2
      }
    ],
    rewards: {
      crystal: [200, 400],
      essence: [100, 200],
      starEnergy: [20, 50],
      exp: [150, 250]
    },
    icon: '/images/enemies/shadow_lord.png',
    isBoss: true
  }
];

// ==================== 成就系统 ====================

const ACHIEVEMENTS = [
  {
    id: 'achieve_001',
    name: '初次冒险',
    description: '完成第一场战斗',
    type: 'battle',
    condition: { battleCount: 1 },
    reward: { crystal: 200 },
    icon: '/images/achievements/first_battle.png',
    isCompleted: false,
    completedAt: null
  },
  {
    id: 'achieve_002',
    name: '英雄收集者',
    description: '拥有5个不同的英雄',
    type: 'collection',
    condition: { heroCount: 5 },
    reward: { starCoin: 100, heroTicket: 1 },
    icon: '/images/achievements/collector.png',
    isCompleted: false,
    completedAt: null
  },
  {
    id: 'achieve_003',
    name: '连胜达人',
    description: '连续赢得10场战斗',
    type: 'battle',
    condition: { consecutiveWins: 10 },
    reward: { essence: 300, starEnergy: 50 },
    icon: '/images/achievements/win_streak.png',
    isCompleted: false,
    completedAt: null
  }
];

// ==================== 每日任务 ====================

const DAILY_TASKS = [
  {
    id: 'daily_001',
    name: '日常训练',
    description: '完成3场战斗',
    type: 'battle',
    target: 3,
    progress: 0,
    reward: { crystal: 100, exp: 200 },
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'daily_002',
    name: '英雄升级',
    description: '升级任意英雄1次',
    type: 'hero_upgrade',
    target: 1,
    progress: 0,
    reward: { essence: 50, exp: 100 },
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'daily_003',
    name: '签到奖励',
    description: '每日登录即可领取',
    type: 'login',
    target: 1,
    progress: 1,
    reward: { crystal: 50, starCoin: 10 },
    isCompleted: true,
    isClaimed: false
  }
];

// ==================== PVP相关数据 ====================

const PVP_CONFIG = {
  seasons: [
    {
      id: 'season_1',
      name: '星际争霸赛季',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-03-31T23:59:59Z',
      isActive: true
    }
  ],
  ranks: [
    { id: 'bronze', name: '青铜', minScore: 0, maxScore: 999, icon: '/images/pvp/bronze.png' },
    { id: 'silver', name: '白银', minScore: 1000, maxScore: 1999, icon: '/images/pvp/silver.png' },
    { id: 'gold', name: '黄金', minScore: 2000, maxScore: 2999, icon: '/images/pvp/gold.png' },
    { id: 'platinum', name: '铂金', minScore: 3000, maxScore: 3999, icon: '/images/pvp/platinum.png' },
    { id: 'diamond', name: '钻石', minScore: 4000, maxScore: 4999, icon: '/images/pvp/diamond.png' },
    { id: 'master', name: '大师', minScore: 5000, maxScore: 5999, icon: '/images/pvp/master.png' },
    { id: 'champion', name: '王者', minScore: 6000, maxScore: Infinity, icon: '/images/pvp/champion.png' }
  ],
  seasonRewards: {
    bronze: { starCoin: 100, crystal: 500 },
    silver: { starCoin: 200, crystal: 1000, essence: 100 },
    gold: { starCoin: 400, crystal: 2000, essence: 250 },
    platinum: { starCoin: 600, crystal: 3500, essence: 400, starEnergy: 50 },
    diamond: { starCoin: 1000, crystal: 5000, essence: 600, starEnergy: 100 },
    master: { starCoin: 1500, crystal: 8000, essence: 1000, starEnergy: 200, heroTicket: 1 },
    champion: { starCoin: 3000, crystal: 15000, essence: 2000, starEnergy: 500, heroTicket: 3 }
  }
};

// ==================== 工具函数 ====================

/**
 * 获取品质配置
 * @param {string} qualityId - 品质ID
 * @returns {Object} 品质配置对象
 */
function getQualityConfig(qualityId) {
  const qualityKey = qualityId.toUpperCase();
  return QUALITY_TYPES[qualityKey] || QUALITY_TYPES.COMMON;
}

/**
 * 获取职业配置
 * @param {string} classId - 职业ID
 * @returns {Object} 职业配置对象
 */
function getClassConfig(classId) {
  const classKey = classId.toUpperCase();
  return HERO_CLASSES[classKey] || HERO_CLASSES.WARRIOR;
}

/**
 * 获取默认英雄列表
 * @returns {Array} 默认英雄数组
 */
function getDefaultHeroes() {
  return JSON.parse(JSON.stringify(DEFAULT_HEROES)); // 深拷贝
}

/**
 * 获取章节列表
 * @returns {Array} 章节数组
 */
function getChapters() {
  return JSON.parse(JSON.stringify(CHAPTERS));
}

/**
 * 获取商城商品
 * @returns {Array} 商品数组
 */
function getShopItems() {
  return JSON.parse(JSON.stringify(SHOP_ITEMS));
}

/**
 * 获取敌人模板
 * @param {string} enemyId - 敌人ID
 * @returns {Object} 敌人模板对象
 */
function getEnemyTemplate(enemyId) {
  return ENEMY_TEMPLATES.find(e => e.id === enemyId) || null;
}

/**
 * 获取成就列表
 * @returns {Array} 成就数组
 */
function getAchievements() {
  return JSON.parse(JSON.stringify(ACHIEVEMENTS));
}

/**
 * 获取每日任务
 * @returns {Array} 任务数组
 */
function getDailyTasks() {
  return JSON.parse(JSON.stringify(DAILY_TASKS));
}

/**
 * 获取PVP配置
 * @returns {Object} PVP配置对象
 */
function getPvPConfig() {
  return JSON.parse(JSON.stringify(PVP_CONFIG));
}

/**
 * 随机抽取英雄品质
 * @returns {string} 品质ID
 */
function randomHeroQuality() {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (let key in QUALITY_TYPES) {
    cumulative += QUALITY_TYPES[key].probability;
    if (random <= cumulative) {
      return QUALITY_TYPES[key].id;
    }
  }

  return 'common';
}

/**
 * 计算属性成长
 * @param {number} baseValue - 基础值
 * @param {number} growthRate - 成长率
 * @param {number} level - 当前等级
 * @returns {number} 成长后的值
 */
function calculateStatGrowth(baseValue, growthRate, level) {
  return Math.floor(baseValue * Math.pow(growthRate, level - 1));
}

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateUniqueId(prefix = 'id') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
}

// ==================== 导出模块 ====================

module.exports = {
  // 常量
  QUALITY_TYPES,
  HERO_CLASSES,
  HERO_TABLE,
  HERO_UPGRADE_CONFIG,

  // 数据获取函数
  getQualityConfig,
  getClassConfig,
  getDefaultHeroes,
  getChapters,
  getShopItems,
  getEnemyTemplate,
  getAchievements,
  getDailyTasks,
  getPvPConfig,

  // 工具函数
  randomHeroQuality,
  calculateStatGrowth,
  generateUniqueId
};
