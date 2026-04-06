/**
 * 星空地图场景 - StarmapScene
 * 复刻星空探索界面：多层级缩放、程序化宇宙生成、拖拽平移、双指缩放
 */
function StarmapScene(game) {
  this.game = game;
  this.manager = null;
  this.touchManager = game.touchManager;
  this.adapter = game.screenAdapter;
  this.DESIGN_W = 750;
  this.DESIGN_H = 1334;

  var self = this;

  // 缩放层级定义
  this.ZOOM = {
    UNIVERSE: 0.05,
    DOMAIN: 0.15,
    SYSTEM: 0.5,
    SATELLITE: 1.5,
    MIN: 1.0,
    MAX: 12.0
  };

  // 宇宙边界
  this.BOUND = {
    minX: -600,
    maxX: 600,
    minY: -600,
    maxY: 600
  };

  // 相机状态
  this.cam = { x: 0, y: 0, zoom: 2.0 };

  // 拖拽状态
  this.drag = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 };

  // 双指缩放状态
  this.pinch = { active: false, dist0: 0, zoom0: 0 };

  // 宇宙数据
  this.universe = null;

  // 背景星点（固定屏幕空间）
  this.bgStars = [];

  // 缩放指示器文本
  this.zoomLevelText = '星域级';

  // 选中节点信息
  this.selectedNode = null;

  // 原始触摸事件绑定标记
  this._touchBound = false;
}

// ============================================================
// 程序化生成宇宙数据
// ============================================================
StarmapScene.prototype._generateUniverse = function () {
  var self = this;
  var rng = function (min, max) { return min + Math.random() * (max - min); };
  var rngInt = function (min, max) { return Math.floor(rng(min, max)); };

  var universe = {
    domains: [
      { id: 'd1', name: '新星星域',   color: '#1a2a4a', accent: '#4A9EFF', x: -400, y: -400, radius: 500, density: 'low' },
      { id: 'd2', name: '翡翠星域',   color: '#1a3a2a', accent: '#4AE68A', x: 400,  y: -400, radius: 500, density: 'medium' },
      { id: 'd3', name: '紫晶星域',   color: '#2a1a3a', accent: '#B44AFF', x: -400, y: 400,  radius: 500, density: 'medium' },
      { id: 'd4', name: '烈焰星域',   color: '#3a1a1a', accent: '#FF6347', x: 400,  y: 400, radius: 550, density: 'high' },
      { id: 'd5', name: '虚空星域',   color: '#1a1a2e', accent: '#FFD700', x: 0,    y: 0,    radius: 450, density: 'high' }
    ],
    systems: [],
    asteroids: []
  };

  universe.domains.forEach(function (dom) {
    var sysCount = dom.density === 'low' ? rngInt(5, 8) : dom.density === 'medium' ? rngInt(8, 12) : rngInt(12, 16);

    for (var si = 0; si < sysCount; si++) {
      var angle = (si / sysCount) * Math.PI * 2 + rng(-0.3, 0.3);
      var dist = rng(dom.radius * 0.15, dom.radius * 0.85);
      var sx = dom.x + Math.cos(angle) * dist;
      var sy = dom.y + Math.sin(angle) * dist;
      var sysRadius = rng(60, 140);
      var isCore = si === 0;
      var starSize = rng(12, 24);

      var sys = {
        id: dom.id + '_s' + si,
        domainId: dom.id,
        name: dom.name + (isCore ? '-核心' : '') + '星系' + (si + 1),
        x: sx, y: sy, radius: sysRadius, isCore: isCore,
        star: { x: sx, y: sy, size: starSize, color: dom.accent, owner: null },
        planets: [], satellites: []
      };

      var pCount = rngInt(3, 6);
      var maxPlanetSize = Math.min(7, starSize / 1.5);
      var minOrbit = starSize + maxPlanetSize + 8;
      var maxOrbit = Math.min(sysRadius * 0.75, 100);
      var orbitStep = pCount > 1 ? (maxOrbit - minOrbit) / (pCount - 1) : 0;

      for (var pi = 0; pi < pCount; pi++) {
        var pa = (pi / pCount) * Math.PI * 2 + rng(-0.3, 0.3);
        var pd = minOrbit + orbitStep * pi + rng(-2, 2);
        var pSize = rng(3, maxPlanetSize);
        sys.planets.push({
          id: sys.id + '_p' + pi,
          orbitCx: sx, orbitCy: sy,
          orbitRadius: Math.max(minOrbit, pd),
          orbitAngle: pa,
          orbitSpeed: rng(0.000008, 0.000032),
          x: sx + Math.cos(pa) * pd,
          y: sy + Math.sin(pa) * pd,
          size: pSize,
          hasRing: Math.random() > 0.7
        });
      }

      var satIdx = 0;
      sys.planets.forEach(function (p) {
        var satCount = rngInt(1, 3);
        for (var vi = 0; vi < satCount; vi++) {
          var va = rng(0, Math.PI * 2);
          var satSize = rng(1.2, Math.max(1.5, p.size * 0.3));
          var vd = p.size + satSize + rng(3, 8);
          sys.satellites.push({
            id: sys.id + '_v' + satIdx,
            planetId: p.id,
            orbitAngle: va,
            orbitRadius: vd,
            orbitSpeed: rng(0.00008, 0.00024),
            x: p.x + Math.cos(va) * vd,
            y: p.y + Math.sin(va) * vd,
            size: satSize,
            name: '卫星' + (satIdx + 1),
            isPlayerHome: false
          });
          satIdx++;
        }
      });

      universe.systems.push(sys);

      var outerStart = maxOrbit + 10;
      var astCount = rngInt(5, 12);
      for (var ai = 0; ai < astCount; ai++) {
        var aa = rng(0, Math.PI * 2);
        var ad = rng(outerStart, sysRadius * 1.2);
        universe.asteroids.push({
          id: sys.id + '_a' + ai,
          systemId: sys.id,
          x: sx + Math.cos(aa) * ad,
          y: sy + Math.sin(aa) * ad,
          size: rng(1, 2.5),
          tier: isCore ? 'high' : 'low'
        });
      }
    }
  });

  for (var pass = 0; pass < 10; pass++) {
    for (var i = 0; i < universe.systems.length; i++) {
      for (var j = i + 1; j < universe.systems.length; j++) {
        var a = universe.systems[i];
        var b = universe.systems[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = (a.radius + b.radius) * 0.6 + 40;
        if (dist < minDist && dist > 0.1) {
          var push = (minDist - dist) / 2 + 1;
          var nx = dx / dist;
          var ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          a.star.x = a.x;
          a.star.y = a.y;
          b.x += nx * push;
          b.y += ny * push;
          b.star.x = b.x;
          b.star.y = b.y;
          a.planets.forEach(function (p) {
            p.orbitCx = a.x;
            p.orbitCy = a.y;
            p.x = a.x + Math.cos(p.orbitAngle) * p.orbitRadius;
            p.y = a.y + Math.sin(p.orbitAngle) * p.orbitRadius;
          });
          b.planets.forEach(function (p) {
            p.orbitCx = b.x;
            p.orbitCy = b.y;
            p.x = b.x + Math.cos(p.orbitAngle) * p.orbitRadius;
            p.y = b.y + Math.sin(p.orbitAngle) * p.orbitRadius;
          });
        }
      }
    }
  }

  if (universe.systems.length > 0 && universe.systems[0].satellites.length > 0) {
    universe.systems[0].satellites[0].isPlayerHome = true;
  }

  this.universe = universe;
};

// ============================================================
// 背景星点
// ============================================================
StarmapScene.prototype._ensureBgStars = function () {
  if (this.bgStars.length > 0) return;
  for (var i = 0; i < 200; i++) {
    this.bgStars.push({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * 1.5 + 0.3,
      b: Math.random() * 0.5 + 0.2
    });
  }
};

StarmapScene.prototype._drawBgStars = function (ctx, W, H) {
  this._ensureBgStars();
  for (var i = 0; i < this.bgStars.length; i++) {
    var st = this.bgStars[i];
    ctx.fillStyle = 'rgba(200,210,255,' + st.b.toFixed(2) + ')';
    ctx.fillRect(st.x * W, st.y * H, st.s, st.s);
  }
};

// ============================================================
// 坐标转换
// ============================================================
StarmapScene.prototype._worldToScreen = function (wx, wy, W, H) {
  return {
    x: (wx - this.cam.x) * this.cam.zoom + W / 2,
    y: (wy - this.cam.y) * this.cam.zoom + H / 2
  };
};

StarmapScene.prototype._screenToWorld = function (sx, sy, W, H) {
  return {
    x: (sx - W / 2) / this.cam.zoom + this.cam.x,
    y: (sy - H / 2) / this.cam.zoom + this.cam.y
  };
};

// ============================================================
// 更新轨道运动
// ============================================================
StarmapScene.prototype._updateOrbits = function (dt) {
  if (!this.universe) return;
  var self = this;
  this.universe.systems.forEach(function (sys) {
    sys.planets.forEach(function (p) {
      p.orbitAngle += p.orbitSpeed * dt;
      p.x = p.orbitCx + Math.cos(p.orbitAngle) * p.orbitRadius;
      p.y = p.orbitCy + Math.sin(p.orbitAngle) * p.orbitRadius;
    });
    sys.satellites.forEach(function (sat) {
      var parent = null;
      for (var i = 0; i < sys.planets.length; i++) {
        if (sys.planets[i].id === sat.planetId) {
          parent = sys.planets[i];
          break;
        }
      }
      if (!parent) return;
      sat.orbitAngle += sat.orbitSpeed * dt;
      sat.x = parent.x + Math.cos(sat.orbitAngle) * sat.orbitRadius;
      sat.y = parent.y + Math.sin(sat.orbitAngle) * sat.orbitRadius;
    });
  });
};

// ============================================================
// 主渲染函数
// ============================================================
StarmapScene.prototype._renderSpace = function (ctx, W, H) {
  var z = this.cam.zoom;
  var ZOOM = this.ZOOM;

  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, W, H);

  this._drawBgStars(ctx, W, H);

  if (!this.universe) return;

  var self = this;

  this.universe.domains.forEach(function (dom) {
    var s = self._worldToScreen(dom.x, dom.y, W, H);
    var r = dom.radius * z;
    if (r < 2) return;
    var grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    grad.addColorStop(0, dom.color + '40');
    grad.addColorStop(0.7, dom.color + '15');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    if (z < ZOOM.DOMAIN && r > 30) {
      ctx.fillStyle = dom.accent + '88';
      ctx.font = Math.max(10, Math.min(16, r * 0.08)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dom.name, s.x, s.y - r * 0.05);
    }
  });

  this.universe.systems.forEach(function (sys) {
    var s = self._worldToScreen(sys.x, sys.y, W, H);
    var r = sys.radius * z;
    var dom = null;
    for (var di = 0; di < self.universe.domains.length; di++) {
      if (self.universe.domains[di].id === sys.domainId) {
        dom = self.universe.domains[di];
        break;
      }
    }

    if (z >= ZOOM.UNIVERSE && r > 5) {
      ctx.strokeStyle = (dom ? dom.accent : '#446') + '20';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, r, r * 0.7, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    var starSize = Math.max(2, sys.star.size * z);
    if (starSize > 0.5) {
      var glowR = starSize * 3;
      var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      glow.addColorStop(0, sys.star.color + 'aa');
      glow.addColorStop(0.3, sys.star.color + '44');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1, starSize * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }

    if (z >= ZOOM.DOMAIN * 0.5 && z < ZOOM.SYSTEM && r > 15 && z >= 5) {
      ctx.fillStyle = '#8899bb88';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sys.name, s.x, s.y + starSize + 12);
    }

    if (z >= ZOOM.DOMAIN) {
      sys.planets.forEach(function (p) {
        var ps = self._worldToScreen(p.x, p.y, W, H);
        var pSize = Math.max(1.5, p.size * z);
        if (pSize < 1) return;

        if (z >= ZOOM.SYSTEM * 0.3) {
          ctx.strokeStyle = '#ffffff10';
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, p.orbitRadius * z, p.orbitRadius * z * 0.7, 0.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = dom ? dom.accent + 'cc' : '#aab';
        ctx.beginPath();
        ctx.arc(ps.x, ps.y, pSize, 0, Math.PI * 2);
        ctx.fill();

        if (p.hasRing && pSize > 3) {
          ctx.strokeStyle = '#ffffff44';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(ps.x, ps.y, pSize * 1.8, pSize * 0.5, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    if (z >= ZOOM.SYSTEM * 0.5) {
      sys.satellites.forEach(function (sat) {
        var vs = self._worldToScreen(sat.x, sat.y, W, H);
        var vSize = Math.max(1.2, sat.size * z);
        if (vSize < 0.5) return;

        ctx.fillStyle = sat.isPlayerHome ? '#FF4444' : '#aabbcc';
        ctx.beginPath();
        ctx.arc(vs.x, vs.y, vSize, 0, Math.PI * 2);
        ctx.fill();

        if (sat.isPlayerHome && vSize > 2) {
          ctx.fillStyle = '#FF4444';
          ctx.font = 'bold ' + Math.max(8, vSize * 3) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('▼', vs.x, vs.y - vSize - 4);
          if (z >= ZOOM.SYSTEM) {
            ctx.font = '8px sans-serif';
            ctx.fillText('你在这里', vs.x, vs.y + vSize + 10);
          }
        }

        if (z >= 5 && z >= ZOOM.SATELLITE * 0.5 && !sat.isPlayerHome) {
          ctx.fillStyle = '#778899';
          ctx.font = '7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(sat.name, vs.x, vs.y + vSize + 8);
        }
      });
    }
  });

  if (z >= ZOOM.SYSTEM * 0.8) {
    this.universe.asteroids.forEach(function (ast) {
      var as = self._worldToScreen(ast.x, ast.y, W, H);
      var aSize = Math.max(0.5, ast.size * z);
      if (aSize < 0.3) return;
      if (as.x < -20 || as.x > W + 20 || as.y < -20 || as.y > H + 20) return;
      ctx.fillStyle = ast.tier === 'high' ? '#FFD70066' : '#44556644';
      ctx.beginPath();
      ctx.arc(as.x, as.y, aSize, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  var level = '宇宙';
  if (z >= ZOOM.SATELLITE * 0.5) level = '卫星级';
  else if (z >= ZOOM.SYSTEM * 0.5) level = '星系级';
  else if (z >= ZOOM.DOMAIN * 0.5) level = '星域级';
  this.zoomLevelText = level + ' ×' + z.toFixed(2);
};

// ============================================================
// 绑定/解绑微信原生触摸事件
// ============================================================
StarmapScene.prototype._bindTouchEvents = function () {
  if (this._touchBound) return;
  this._touchBound = true;
  var self = this;

  wx.onTouchStart(function (e) {
    if (!e.touches || e.touches.length === 0) return;
    var touch = e.touches[0];

    if (e.touches.length === 2) {
      self.pinch.active = true;
      self.pinch.dist0 = Math.hypot(
        touch.clientX - e.touches[1].clientX,
        touch.clientY - e.touches[1].clientY
      );
      self.pinch.zoom0 = self.cam.zoom;
      self.drag.active = false;
      self.selectedNode = null;
      return;
    }

    var tx = self.adapter.toDesignX(touch.clientX);
    var ty = self.adapter.toDesignY(touch.clientY);

    self.drag.active = true;
    self.drag.sx = tx;
    self.drag.sy = ty;
    self.drag.cx = self.cam.x;
    self.drag.cy = self.cam.y;
    self.drag.startX = touch.clientX;
    self.drag.startY = touch.clientY;
    self.drag.moved = false;
  });

  wx.onTouchMove(function (e) {
    if (!e.touches || e.touches.length === 0) return;

    if (e.touches.length === 2 && self.pinch.active) {
      var t0 = e.touches[0], t1 = e.touches[1];
      var dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      var scale = dist / self.pinch.dist0;
      var newZoom = self.pinch.zoom0 * scale;
      newZoom = Math.max(self.ZOOM.MIN, Math.min(self.ZOOM.MAX, newZoom));
      self.cam.zoom = newZoom;
      self._clampCamera();
      return;
    }

    if (!self.drag.active || e.touches.length !== 1) return;
    var touch = e.touches[0];
    var tx = self.adapter.toDesignX(touch.clientX);
    var ty = self.adapter.toDesignY(touch.clientY);
    
    var moveDist = Math.hypot(touch.clientX - self.drag.startX, touch.clientY - self.drag.startY);
    if (moveDist > 15 && self.selectedNode) {
      self.selectedNode = null;
      self.drag.moved = true;
    }
    
    var dx = (tx - self.drag.sx) / self.cam.zoom;
    var dy = (ty - self.drag.sy) / self.cam.zoom;
    self.cam.x = self.drag.cx - dx;
    self.cam.y = self.drag.cy - dy;
  });

  wx.onTouchEnd(function (e) {
    if (self.pinch.active && (!e.changedTouches || e.changedTouches.length < 2)) {
      self.pinch.active = false;
      self._clampCamera();
    }
    if (!self.drag.active) return;

    var touch = e.changedTouches[0];
    var dist = Math.hypot(touch.clientX - self.drag.startX, touch.clientY - self.drag.startY);
    self.drag.active = false;

    if (dist < 8 && !self.drag.moved) {
      var tx = self.adapter.toDesignX(touch.clientX);
      var ty = self.adapter.toDesignY(touch.clientY);
      self._handleClick(tx, ty);
    } else {
      self._clampCamera();
    }
  });

  wx.onTouchCancel(function (e) {
    self.drag.active = false;
    self.pinch.active = false;
    self.selectedNode = null;
  });
};

StarmapScene.prototype._unbindTouchEvents = function () {
  if (!this._touchBound) return;
  this._touchBound = false;
};

// ============================================================
// 缩放和定位
// ============================================================
StarmapScene.prototype._zoomAt = function (screenX, screenY, factor) {
  var wBefore = this._screenToWorld(screenX, screenY, this.DESIGN_W, this.DESIGN_H);
  var newZoom = this.cam.zoom * factor;
  newZoom = Math.max(this.ZOOM.MIN, Math.min(this.ZOOM.MAX, newZoom));
  this.cam.zoom = newZoom;
  var wAfter = this._screenToWorld(screenX, screenY, this.DESIGN_W, this.DESIGN_H);
  this.cam.x += wBefore.x - wAfter.x;
  this.cam.y += wBefore.y - wAfter.y;
  this._clampCamera();
};

StarmapScene.prototype._goToPlayer = function () {
  if (!this.universe) return;
  for (var si = 0; si < this.universe.systems.length; si++) {
    var sys = this.universe.systems[si];
    for (var sati = 0; sati < sys.satellites.length; sati++) {
      if (sys.satellites[sati].isPlayerHome) {
        this.cam.x = sys.satellites[sati].x;
        this.cam.y = sys.satellites[sati].y;
        this._clampCamera();
        return;
      }
    }
  }
};

StarmapScene.prototype._clampCamera = function () {
  this.cam.x = Math.max(this.BOUND.minX, Math.min(this.BOUND.maxX, this.cam.x));
  this.cam.y = Math.max(this.BOUND.minY, Math.min(this.BOUND.maxY, this.cam.y));
};

// ============================================================
// 点击检测
// ============================================================
StarmapScene.prototype._handleClick = function (tx, ty) {
  if (!this.universe) return;

  if (this.selectedNode) {
    this.selectedNode = null;
    return;
  }

  var w = this._screenToWorld(tx, ty, this.DESIGN_W, this.DESIGN_H);
  var z = this.cam.zoom;
  var ZOOM = this.ZOOM;
  var self = this;

  if (z >= ZOOM.SYSTEM * 0.3) {
    for (var si = 0; si < self.universe.systems.length; si++) {
      var sys = self.universe.systems[si];
      for (var sati = 0; sati < sys.satellites.length; sati++) {
        var sat = sys.satellites[sati];
        if (Math.sqrt(Math.pow(w.x - sat.x, 2) + Math.pow(w.y - sat.y, 2)) < Math.max(8, sat.size * 3) / z) {
          self.selectedNode = { type: 'satellite', node: sat, system: sys };
          return;
        }
      }
    }
  }

  if (z >= ZOOM.DOMAIN) {
    for (si = 0; si < self.universe.systems.length; si++) {
      sys = self.universe.systems[si];
      for (var pi = 0; pi < sys.planets.length; pi++) {
        var p = sys.planets[pi];
        if (Math.sqrt(Math.pow(w.x - p.x, 2) + Math.pow(w.y - p.y, 2)) < Math.max(12, p.size * 3) / z) {
          self.selectedNode = { type: 'planet', node: p, system: sys };
          return;
        }
      }
    }
  }

  for (si = 0; si < self.universe.systems.length; si++) {
    sys = self.universe.systems[si];
    if (Math.sqrt(Math.pow(w.x - sys.star.x, 2) + Math.pow(w.y - sys.star.y, 2)) < Math.max(20, sys.star.size * 3) / z) {
      self.selectedNode = { type: 'star', node: sys.star, system: sys };
      return;
    }
  }

  if (z >= ZOOM.SYSTEM * 0.5) {
    for (var ai = 0; ai < self.universe.asteroids.length; ai++) {
      var ast = self.universe.asteroids[ai];
      if (Math.sqrt(Math.pow(w.x - ast.x, 2) + Math.pow(w.y - ast.y, 2)) < Math.max(6, ast.size * 4) / z) {
        var astSys = null;
        for (si = 0; si < self.universe.systems.length; si++) {
          if (self.universe.systems[si].id === ast.systemId) {
            astSys = self.universe.systems[si];
            break;
          }
        }
        if (astSys) {
          self.selectedNode = { type: 'asteroid', node: ast, system: astSys };
          return;
        }
      }
    }
  }
};

// ============================================================
// 绘制节点弹窗
// ============================================================
StarmapScene.prototype._drawNodePopup = function (ctx, W, H) {
  if (!this.selectedNode || !this.universe) return;

  var node = this.selectedNode.node;
  var sys = this.selectedNode.system;
  var type = this.selectedNode.type;

  var dom = null;
  for (var di = 0; di < this.universe.domains.length; di++) {
    if (this.universe.domains[di].id === sys.domainId) {
      dom = this.universe.domains[di];
      break;
    }
  }
  var accent = dom ? dom.accent : '#aab';

  var popupW = W;
  var popupH = 200;
  var popupX = 0;
  var popupY = H - popupH - 60;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  var grad = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupH);
  grad.addColorStop(0, '#0d1a2e');
  grad.addColorStop(1, '#091422');
  ctx.fillStyle = grad;
  _drawRoundRect(ctx, popupX, popupY, popupW, popupH, 16);
  ctx.fill();

  var title = '', desc = '', stats = '';

  if (type === 'star') {
    title = '★ ' + node.name;
    desc = sys.name + ' · 恒星';
    stats = '占领：' + (node.owner || '无主') + '\n星系加成：' + (sys.isCore ? '50%' : '20%');
  } else if (type === 'planet') {
    title = '◆ ' + node.name;
    desc = sys.name + ' · 行星';
    stats = '联盟基地：未绑定';
  } else if (type === 'satellite') {
    title = (node.isPlayerHome ? '● ' : '○ ') + node.name;
    desc = sys.name + ' · 卫星';
    stats = '星系加成：' + (sys.isCore ? '50%' : '20%');
    if (node.isPlayerHome) stats += '\n你的家园卫星';
  } else if (type === 'asteroid') {
    title = '☄ 小天体';
    desc = sys.name + ' · ' + (node.tier === 'high' ? '高阶' : '低阶') + '资源';
    stats = '产出：🪙' + (node.tier === 'high' ? '50' : '15') + ' 💎' + (node.tier === 'high' ? '30' : '8');
  }

  ctx.fillStyle = accent;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, popupX + 24, popupY + 20);

  ctx.fillStyle = '#889999';
  ctx.font = '14px sans-serif';
  ctx.fillText(desc, popupX + 24, popupY + 50);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  _drawRoundRect(ctx, popupX + 24, popupY + 80, popupW - 48, 70, 8);
  ctx.fill();

  ctx.fillStyle = '#aabbcc';
  ctx.font = '14px sans-serif';
  var lines = stats.split('\n');
  for (var li = 0; li < lines.length; li++) {
    ctx.fillText(lines[li], popupX + 36, popupY + 94 + li * 20);
  }

  ctx.fillStyle = '#556';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('点击其他位置关闭', W / 2, popupY + popupH - 16);
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

// ============================================================
// 场景生命周期
// ============================================================
StarmapScene.prototype.onEnter = function (params) {
  console.log('[StarmapScene] onEnter');

  this._generateUniverse();
  this.cam.zoom = 4.0;
  this._goToPlayer();

  this.drag = { active: false, sx: 0, sy: 0, cx: 0, cy: 0, startX: 0, startY: 0 };
  this.pinch = { active: false, dist0: 0, zoom0: 0 };
  this.selectedNode = null;

  this._bindTouchEvents();

  var self = this;
  this.touchManager.registerArea('back-starmap', 10, 10, 80, 50, function () {
    self._unbindTouchEvents();
    self.game.sceneManager.switchScene('home');
  });

  this.touchManager.registerArea('zoom-in', this.DESIGN_W - 105, this.DESIGN_H - 390, 105, 105, function () {
    self._zoomAt(self.DESIGN_W / 2, self.DESIGN_H / 2, 1.4);
  });
  this.touchManager.registerArea('zoom-out', this.DESIGN_W - 105, this.DESIGN_H - 295, 105, 105, function () {
    self._zoomAt(self.DESIGN_W / 2, self.DESIGN_H / 2, 0.7);
  });
  this.touchManager.registerArea('zoom-home', this.DESIGN_W - 105, this.DESIGN_H - 200, 105, 105, function () {
    self._goToPlayer();
  });
};

StarmapScene.prototype.onExit = function () {
  console.log('[StarmapScene] onExit');
  this._unbindTouchEvents();
  this.touchManager.clearAreas();
};

StarmapScene.prototype.update = function (dt) {
  this._updateOrbits(dt);
};

StarmapScene.prototype.render = function (ctx) {
  var W = this.DESIGN_W, H = this.DESIGN_H;

  this._renderSpace(ctx, W, H);

  // 边缘渐变遮罩
  var edgeSize = 120;
  
  // 顶部渐变
  var topGrad = ctx.createLinearGradient(0, 0, 0, edgeSize);
  topGrad.addColorStop(0, 'rgba(2,4,8,1)');
  topGrad.addColorStop(1, 'rgba(2,4,8,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, edgeSize-500);
  
  // 底部渐变
  var bottomGrad = ctx.createLinearGradient(0, H - edgeSize, 0, H);
  bottomGrad.addColorStop(0, 'rgba(2,4,8,0)');
  bottomGrad.addColorStop(1, 'rgba(2,4,8,1)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, H - edgeSize, W, edgeSize+500);
  
  // 左侧渐变
  var leftGrad = ctx.createLinearGradient(0, 0, edgeSize, 0);
  leftGrad.addColorStop(0, 'rgba(2,4,8,1)');
  leftGrad.addColorStop(1, 'rgba(2,4,8,0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, edgeSize, H);
  
  // 右侧渐变
  var rightGrad = ctx.createLinearGradient(W - edgeSize, 0, W, 0);
  rightGrad.addColorStop(0, 'rgba(2,4,8,0)');
  rightGrad.addColorStop(1, 'rgba(2,4,8,1)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(W - edgeSize, 0, edgeSize, H);

  ctx.fillStyle = 'rgba(79,195,247,0.15)';
  _drawRoundRect(ctx, 10, 10, 80, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('← 返回', 22, 28);

  ctx.fillStyle = '#8899bb';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('星际星空', W / 2, 14);

  ctx.fillStyle = 'rgba(10,10,30,0.8)';
  _drawRoundRect(ctx, W - 110, 10, 100, 32, 6);
  ctx.fill();
  ctx.strokeStyle = '#334';
  ctx.lineWidth = 1;
  _drawRoundRect(ctx, W - 110, 10, 100, 32, 6);
  ctx.stroke();
  ctx.fillStyle = '#8899bb';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.zoomLevelText, W - 60, 26);

  var btnX = W - 95;
  var btnY = H - 380;
  var btnSize = 85;
  var btnGap = 95;
  var btnColors = ['#4A9EFF', '#4AE68A', '#FFD700'];
  var btnLabels = ['+', '−', '◎'];

  for (var bi = 0; bi < 3; bi++) {
    var by = btnY + bi * btnGap;
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    _drawRoundRect(ctx, btnX, by, btnSize, btnSize, 12);
    ctx.fill();
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 1;
    _drawRoundRect(ctx, btnX, by, btnSize, btnSize, 12);
    ctx.stroke();
    ctx.fillStyle = btnColors[bi];
    ctx.font = '42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnLabels[bi], btnX + btnSize / 2, by + btnSize / 2);
  }

  if (this.selectedNode) {
    this._drawNodePopup(ctx, W, H);
  }
};

module.exports = StarmapScene;
