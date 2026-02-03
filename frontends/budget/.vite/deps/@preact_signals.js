import {
  k,
  l,
  t,
  x
} from "./chunk-MLV7OOAR.js";

// node_modules/.deno/preact@10.28.2/node_modules/preact/hooks/dist/hooks.module.js
var t2;
var r;
var u;
var i;
var o = 0;
var f = [];
var c = l;
var e = c.__b;
var a = c.__r;
var v = c.diffed;
var l2 = c.__c;
var m = c.unmount;
var s = c.__;
function p(n2, t4) {
  c.__h && c.__h(r, n2, o || t4), o = 0;
  var u3 = r.__H || (r.__H = { __: [], __h: [] });
  return n2 >= u3.__.length && u3.__.push({}), u3.__[n2];
}
function d(n2) {
  return o = 1, h(D, n2);
}
function h(n2, u3, i3) {
  var o3 = p(t2++, 2);
  if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u3) : D(void 0, u3), function(n3) {
    var t4 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t4, n3);
    t4 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
  }], o3.__c = r, !r.__f)) {
    var f3 = function(n3, t4, r3) {
      if (!o3.__c.__H) return true;
      var u4 = o3.__c.__H.__.filter(function(n4) {
        return !!n4.__c;
      });
      if (u4.every(function(n4) {
        return !n4.__N;
      })) return !c3 || c3.call(this, n3, t4, r3);
      var i4 = o3.__c.props !== n3;
      return u4.forEach(function(n4) {
        if (n4.__N) {
          var t5 = n4.__[0];
          n4.__ = n4.__N, n4.__N = void 0, t5 !== n4.__[0] && (i4 = true);
        }
      }), c3 && c3.call(this, n3, t4, r3) || i4;
    };
    r.__f = true;
    var c3 = r.shouldComponentUpdate, e3 = r.componentWillUpdate;
    r.componentWillUpdate = function(n3, t4, r3) {
      if (this.__e) {
        var u4 = c3;
        c3 = void 0, f3(n3, t4, r3), c3 = u4;
      }
      e3 && e3.call(this, n3, t4, r3);
    }, r.shouldComponentUpdate = f3;
  }
  return o3.__N || o3.__;
}
function y(n2, u3) {
  var i3 = p(t2++, 3);
  !c.__s && C(i3.__H, u3) && (i3.__ = n2, i3.u = u3, r.__H.__h.push(i3));
}
function A(n2) {
  return o = 5, T(function() {
    return { current: n2 };
  }, []);
}
function T(n2, r3) {
  var u3 = p(t2++, 7);
  return C(u3.__H, r3) && (u3.__ = n2(), u3.__H = r3, u3.__h = n2), u3.__;
}
function j() {
  for (var n2; n2 = f.shift(); ) if (n2.__P && n2.__H) try {
    n2.__H.__h.forEach(z), n2.__H.__h.forEach(B), n2.__H.__h = [];
  } catch (t4) {
    n2.__H.__h = [], c.__e(t4, n2.__v);
  }
}
c.__b = function(n2) {
  r = null, e && e(n2);
}, c.__ = function(n2, t4) {
  n2 && t4.__k && t4.__k.__m && (n2.__m = t4.__k.__m), s && s(n2, t4);
}, c.__r = function(n2) {
  a && a(n2), t2 = 0;
  var i3 = (r = n2.__c).__H;
  i3 && (u === r ? (i3.__h = [], r.__h = [], i3.__.forEach(function(n3) {
    n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
  })) : (i3.__h.forEach(z), i3.__h.forEach(B), i3.__h = [], t2 = 0)), u = r;
}, c.diffed = function(n2) {
  v && v(n2);
  var t4 = n2.__c;
  t4 && t4.__H && (t4.__H.__h.length && (1 !== f.push(t4) && i === c.requestAnimationFrame || ((i = c.requestAnimationFrame) || w)(j)), t4.__H.__.forEach(function(n3) {
    n3.u && (n3.__H = n3.u), n3.u = void 0;
  })), u = r = null;
}, c.__c = function(n2, t4) {
  t4.some(function(n3) {
    try {
      n3.__h.forEach(z), n3.__h = n3.__h.filter(function(n4) {
        return !n4.__ || B(n4);
      });
    } catch (r3) {
      t4.some(function(n4) {
        n4.__h && (n4.__h = []);
      }), t4 = [], c.__e(r3, n3.__v);
    }
  }), l2 && l2(n2, t4);
}, c.unmount = function(n2) {
  m && m(n2);
  var t4, r3 = n2.__c;
  r3 && r3.__H && (r3.__H.__.forEach(function(n3) {
    try {
      z(n3);
    } catch (n4) {
      t4 = n4;
    }
  }), r3.__H = void 0, t4 && c.__e(t4, r3.__v));
};
var k2 = "function" == typeof requestAnimationFrame;
function w(n2) {
  var t4, r3 = function() {
    clearTimeout(u3), k2 && cancelAnimationFrame(t4), setTimeout(n2);
  }, u3 = setTimeout(r3, 35);
  k2 && (t4 = requestAnimationFrame(r3));
}
function z(n2) {
  var t4 = r, u3 = n2.__c;
  "function" == typeof u3 && (n2.__c = void 0, u3()), r = t4;
}
function B(n2) {
  var t4 = r;
  n2.__c = n2.__(), r = t4;
}
function C(n2, t4) {
  return !n2 || n2.length !== t4.length || t4.some(function(t5, r3) {
    return t5 !== n2[r3];
  });
}
function D(n2, t4) {
  return "function" == typeof t4 ? t4(n2) : t4;
}

// node_modules/.deno/@preact+signals-core@1.12.1/node_modules/@preact/signals-core/dist/signals-core.module.js
var i2 = /* @__PURE__ */ Symbol.for("preact-signals");
function t3() {
  if (!(s2 > 1)) {
    var i3, t4 = false;
    while (void 0 !== h2) {
      var r3 = h2;
      h2 = void 0;
      f2++;
      while (void 0 !== r3) {
        var o3 = r3.o;
        r3.o = void 0;
        r3.f &= -3;
        if (!(8 & r3.f) && c2(r3)) try {
          r3.c();
        } catch (r4) {
          if (!t4) {
            i3 = r4;
            t4 = true;
          }
        }
        r3 = o3;
      }
    }
    f2 = 0;
    s2--;
    if (t4) throw i3;
  } else s2--;
}
function r2(i3) {
  if (s2 > 0) return i3();
  s2++;
  try {
    return i3();
  } finally {
    t3();
  }
}
var o2 = void 0;
function n(i3) {
  var t4 = o2;
  o2 = void 0;
  try {
    return i3();
  } finally {
    o2 = t4;
  }
}
var h2 = void 0;
var s2 = 0;
var f2 = 0;
var v2 = 0;
function e2(i3) {
  if (void 0 !== o2) {
    var t4 = i3.n;
    if (void 0 === t4 || t4.t !== o2) {
      t4 = { i: 0, S: i3, p: o2.s, n: void 0, t: o2, e: void 0, x: void 0, r: t4 };
      if (void 0 !== o2.s) o2.s.n = t4;
      o2.s = t4;
      i3.n = t4;
      if (32 & o2.f) i3.S(t4);
      return t4;
    } else if (-1 === t4.i) {
      t4.i = 0;
      if (void 0 !== t4.n) {
        t4.n.p = t4.p;
        if (void 0 !== t4.p) t4.p.n = t4.n;
        t4.p = o2.s;
        t4.n = void 0;
        o2.s.n = t4;
        o2.s = t4;
      }
      return t4;
    }
  }
}
function u2(i3, t4) {
  this.v = i3;
  this.i = 0;
  this.n = void 0;
  this.t = void 0;
  this.W = null == t4 ? void 0 : t4.watched;
  this.Z = null == t4 ? void 0 : t4.unwatched;
  this.name = null == t4 ? void 0 : t4.name;
}
u2.prototype.brand = i2;
u2.prototype.h = function() {
  return true;
};
u2.prototype.S = function(i3) {
  var t4 = this, r3 = this.t;
  if (r3 !== i3 && void 0 === i3.e) {
    i3.x = r3;
    this.t = i3;
    if (void 0 !== r3) r3.e = i3;
    else n(function() {
      var i4;
      null == (i4 = t4.W) || i4.call(t4);
    });
  }
};
u2.prototype.U = function(i3) {
  var t4 = this;
  if (void 0 !== this.t) {
    var r3 = i3.e, o3 = i3.x;
    if (void 0 !== r3) {
      r3.x = o3;
      i3.e = void 0;
    }
    if (void 0 !== o3) {
      o3.e = r3;
      i3.x = void 0;
    }
    if (i3 === this.t) {
      this.t = o3;
      if (void 0 === o3) n(function() {
        var i4;
        null == (i4 = t4.Z) || i4.call(t4);
      });
    }
  }
};
u2.prototype.subscribe = function(i3) {
  var t4 = this;
  return E(function() {
    var r3 = t4.value, n2 = o2;
    o2 = void 0;
    try {
      i3(r3);
    } finally {
      o2 = n2;
    }
  }, { name: "sub" });
};
u2.prototype.valueOf = function() {
  return this.value;
};
u2.prototype.toString = function() {
  return this.value + "";
};
u2.prototype.toJSON = function() {
  return this.value;
};
u2.prototype.peek = function() {
  var i3 = o2;
  o2 = void 0;
  try {
    return this.value;
  } finally {
    o2 = i3;
  }
};
Object.defineProperty(u2.prototype, "value", { get: function() {
  var i3 = e2(this);
  if (void 0 !== i3) i3.i = this.i;
  return this.v;
}, set: function(i3) {
  if (i3 !== this.v) {
    if (f2 > 100) throw new Error("Cycle detected");
    this.v = i3;
    this.i++;
    v2++;
    s2++;
    try {
      for (var r3 = this.t; void 0 !== r3; r3 = r3.x) r3.t.N();
    } finally {
      t3();
    }
  }
} });
function d2(i3, t4) {
  return new u2(i3, t4);
}
function c2(i3) {
  for (var t4 = i3.s; void 0 !== t4; t4 = t4.n) if (t4.S.i !== t4.i || !t4.S.h() || t4.S.i !== t4.i) return true;
  return false;
}
function a2(i3) {
  for (var t4 = i3.s; void 0 !== t4; t4 = t4.n) {
    var r3 = t4.S.n;
    if (void 0 !== r3) t4.r = r3;
    t4.S.n = t4;
    t4.i = -1;
    if (void 0 === t4.n) {
      i3.s = t4;
      break;
    }
  }
}
function l3(i3) {
  var t4 = i3.s, r3 = void 0;
  while (void 0 !== t4) {
    var o3 = t4.p;
    if (-1 === t4.i) {
      t4.S.U(t4);
      if (void 0 !== o3) o3.n = t4.n;
      if (void 0 !== t4.n) t4.n.p = o3;
    } else r3 = t4;
    t4.S.n = t4.r;
    if (void 0 !== t4.r) t4.r = void 0;
    t4 = o3;
  }
  i3.s = r3;
}
function y2(i3, t4) {
  u2.call(this, void 0);
  this.x = i3;
  this.s = void 0;
  this.g = v2 - 1;
  this.f = 4;
  this.W = null == t4 ? void 0 : t4.watched;
  this.Z = null == t4 ? void 0 : t4.unwatched;
  this.name = null == t4 ? void 0 : t4.name;
}
y2.prototype = new u2();
y2.prototype.h = function() {
  this.f &= -3;
  if (1 & this.f) return false;
  if (32 == (36 & this.f)) return true;
  this.f &= -5;
  if (this.g === v2) return true;
  this.g = v2;
  this.f |= 1;
  if (this.i > 0 && !c2(this)) {
    this.f &= -2;
    return true;
  }
  var i3 = o2;
  try {
    a2(this);
    o2 = this;
    var t4 = this.x();
    if (16 & this.f || this.v !== t4 || 0 === this.i) {
      this.v = t4;
      this.f &= -17;
      this.i++;
    }
  } catch (i4) {
    this.v = i4;
    this.f |= 16;
    this.i++;
  }
  o2 = i3;
  l3(this);
  this.f &= -2;
  return true;
};
y2.prototype.S = function(i3) {
  if (void 0 === this.t) {
    this.f |= 36;
    for (var t4 = this.s; void 0 !== t4; t4 = t4.n) t4.S.S(t4);
  }
  u2.prototype.S.call(this, i3);
};
y2.prototype.U = function(i3) {
  if (void 0 !== this.t) {
    u2.prototype.U.call(this, i3);
    if (void 0 === this.t) {
      this.f &= -33;
      for (var t4 = this.s; void 0 !== t4; t4 = t4.n) t4.S.U(t4);
    }
  }
};
y2.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 6;
    for (var i3 = this.t; void 0 !== i3; i3 = i3.x) i3.t.N();
  }
};
Object.defineProperty(y2.prototype, "value", { get: function() {
  if (1 & this.f) throw new Error("Cycle detected");
  var i3 = e2(this);
  this.h();
  if (void 0 !== i3) i3.i = this.i;
  if (16 & this.f) throw this.v;
  return this.v;
} });
function w2(i3, t4) {
  return new y2(i3, t4);
}
function _(i3) {
  var r3 = i3.u;
  i3.u = void 0;
  if ("function" == typeof r3) {
    s2++;
    var n2 = o2;
    o2 = void 0;
    try {
      r3();
    } catch (t4) {
      i3.f &= -2;
      i3.f |= 8;
      b(i3);
      throw t4;
    } finally {
      o2 = n2;
      t3();
    }
  }
}
function b(i3) {
  for (var t4 = i3.s; void 0 !== t4; t4 = t4.n) t4.S.U(t4);
  i3.x = void 0;
  i3.s = void 0;
  _(i3);
}
function g(i3) {
  if (o2 !== this) throw new Error("Out-of-order effect");
  l3(this);
  o2 = i3;
  this.f &= -2;
  if (8 & this.f) b(this);
  t3();
}
function p2(i3, t4) {
  this.x = i3;
  this.u = void 0;
  this.s = void 0;
  this.o = void 0;
  this.f = 32;
  this.name = null == t4 ? void 0 : t4.name;
}
p2.prototype.c = function() {
  var i3 = this.S();
  try {
    if (8 & this.f) return;
    if (void 0 === this.x) return;
    var t4 = this.x();
    if ("function" == typeof t4) this.u = t4;
  } finally {
    i3();
  }
};
p2.prototype.S = function() {
  if (1 & this.f) throw new Error("Cycle detected");
  this.f |= 1;
  this.f &= -9;
  _(this);
  a2(this);
  s2++;
  var i3 = o2;
  o2 = this;
  return g.bind(this, i3);
};
p2.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 2;
    this.o = h2;
    h2 = this;
  }
};
p2.prototype.d = function() {
  this.f |= 8;
  if (!(1 & this.f)) b(this);
};
p2.prototype.dispose = function() {
  this.d();
};
function E(i3, t4) {
  var r3 = new p2(i3, t4);
  try {
    r3.c();
  } catch (i4) {
    r3.d();
    throw i4;
  }
  var o3 = r3.d.bind(r3);
  o3[Symbol.dispose] = o3;
  return o3;
}

// node_modules/.deno/@preact+signals@2.5.1/node_modules/@preact/signals/dist/signals.module.js
var h3;
var l4;
var p3;
var m2 = "undefined" != typeof window && !!window.__PREACT_SIGNALS_DEVTOOLS__;
var w3 = [];
var _2 = [];
E(function() {
  h3 = this.N;
})();
function g2(i3, t4) {
  l[i3] = t4.bind(null, l[i3] || function() {
  });
}
function y3(i3) {
  if (p3) p3();
  p3 = i3 && i3.S();
}
function b2(i3) {
  var n2 = this, r3 = i3.data, o3 = useSignal(r3);
  o3.value = r3;
  var e3 = T(function() {
    var i4 = n2, r4 = n2.__v;
    while (r4 = r4.__) if (r4.__c) {
      r4.__c.__$f |= 4;
      break;
    }
    var f3 = w2(function() {
      var i5 = o3.value.value;
      return 0 === i5 ? 0 : true === i5 ? "" : i5 || "";
    }), e4 = w2(function() {
      return !Array.isArray(f3.value) && !t(f3.value);
    }), u4 = E(function() {
      this.N = M;
      if (e4.value) {
        var n3 = f3.value;
        if (i4.__v && i4.__v.__e && 3 === i4.__v.__e.nodeType) i4.__v.__e.data = n3;
      }
    }), c4 = n2.__$u.d;
    n2.__$u.d = function() {
      u4();
      c4.call(this);
    };
    return [e4, f3];
  }, []), u3 = e3[0], c3 = e3[1];
  return u3.value ? c3.peek() : c3.value;
}
b2.displayName = "ReactiveTextNode";
Object.defineProperties(u2.prototype, { constructor: { configurable: true, value: void 0 }, type: { configurable: true, value: b2 }, props: { configurable: true, get: function() {
  return { data: this };
} }, __b: { configurable: true, value: 1 } });
g2("__b", function(i3, n2) {
  if (m2 && "function" == typeof n2.type) window.__PREACT_SIGNALS_DEVTOOLS__.exitComponent();
  if ("string" == typeof n2.type) {
    var t4, r3 = n2.props;
    for (var f3 in r3) if ("children" !== f3) {
      var o3 = r3[f3];
      if (o3 instanceof u2) {
        if (!t4) n2.__np = t4 = {};
        t4[f3] = o3;
        r3[f3] = o3.peek();
      }
    }
  }
  i3(n2);
});
g2("__r", function(i3, n2) {
  if (m2 && "function" == typeof n2.type) window.__PREACT_SIGNALS_DEVTOOLS__.enterComponent(n2);
  if (n2.type !== k) {
    y3();
    var t4, f3 = n2.__c;
    if (f3) {
      f3.__$f &= -2;
      if (void 0 === (t4 = f3.__$u)) f3.__$u = t4 = (function(i4) {
        var n3;
        E(function() {
          n3 = this;
        });
        n3.c = function() {
          f3.__$f |= 1;
          f3.setState({});
        };
        return n3;
      })();
    }
    l4 = f3;
    y3(t4);
  }
  i3(n2);
});
g2("__e", function(i3, n2, t4, r3) {
  if (m2) window.__PREACT_SIGNALS_DEVTOOLS__.exitComponent();
  y3();
  l4 = void 0;
  i3(n2, t4, r3);
});
g2("diffed", function(i3, n2) {
  if (m2 && "function" == typeof n2.type) window.__PREACT_SIGNALS_DEVTOOLS__.exitComponent();
  y3();
  l4 = void 0;
  var t4;
  if ("string" == typeof n2.type && (t4 = n2.__e)) {
    var r3 = n2.__np, f3 = n2.props;
    if (r3) {
      var o3 = t4.U;
      if (o3) for (var e3 in o3) {
        var u3 = o3[e3];
        if (void 0 !== u3 && !(e3 in r3)) {
          u3.d();
          o3[e3] = void 0;
        }
      }
      else {
        o3 = {};
        t4.U = o3;
      }
      for (var a3 in r3) {
        var c3 = o3[a3], v3 = r3[a3];
        if (void 0 === c3) {
          c3 = k3(t4, a3, v3, f3);
          o3[a3] = c3;
        } else c3.o(v3, f3);
      }
    }
  }
  i3(n2);
});
function k3(i3, n2, t4, r3) {
  var f3 = n2 in i3 && void 0 === i3.ownerSVGElement, o3 = d2(t4);
  return { o: function(i4, n3) {
    o3.value = i4;
    r3 = n3;
  }, d: E(function() {
    this.N = M;
    var t5 = o3.value.value;
    if (r3[n2] !== t5) {
      r3[n2] = t5;
      if (f3) i3[n2] = t5;
      else if (null != t5 && (false !== t5 || "-" === n2[4])) i3.setAttribute(n2, t5);
      else i3.removeAttribute(n2);
    }
  }) };
}
g2("unmount", function(i3, n2) {
  if ("string" == typeof n2.type) {
    var t4 = n2.__e;
    if (t4) {
      var r3 = t4.U;
      if (r3) {
        t4.U = void 0;
        for (var f3 in r3) {
          var o3 = r3[f3];
          if (o3) o3.d();
        }
      }
    }
  } else {
    var e3 = n2.__c;
    if (e3) {
      var u3 = e3.__$u;
      if (u3) {
        e3.__$u = void 0;
        u3.d();
      }
    }
  }
  i3(n2);
});
g2("__h", function(i3, n2, t4, r3) {
  if (r3 < 3 || 9 === r3) n2.__$f |= 2;
  i3(n2, t4, r3);
});
x.prototype.shouldComponentUpdate = function(i3, n2) {
  var t4 = this.__$u, r3 = t4 && void 0 !== t4.s;
  for (var f3 in n2) return true;
  if (this.__f || "boolean" == typeof this.u && true === this.u) {
    var o3 = 2 & this.__$f;
    if (!(r3 || o3 || 4 & this.__$f)) return true;
    if (1 & this.__$f) return true;
  } else {
    if (!(r3 || 4 & this.__$f)) return true;
    if (3 & this.__$f) return true;
  }
  for (var e3 in i3) if ("__source" !== e3 && i3[e3] !== this.props[e3]) return true;
  for (var u3 in this.props) if (!(u3 in i3)) return true;
  return false;
};
function useSignal(i3, n2) {
  return d(function() {
    return d2(i3, n2);
  })[0];
}
function useComputed(i3, n2) {
  var t4 = A(i3);
  t4.current = i3;
  l4.__$f |= 4;
  return T(function() {
    return w2(function() {
      return t4.current();
    }, n2);
  }, []);
}
var q = "undefined" == typeof requestAnimationFrame ? setTimeout : function(i3) {
  var n2 = function() {
    clearTimeout(t4);
    cancelAnimationFrame(r3);
    i3();
  }, t4 = setTimeout(n2, 35), r3 = requestAnimationFrame(n2);
};
var A2 = function(i3) {
  queueMicrotask(function() {
    queueMicrotask(i3);
  });
};
function T2() {
  r2(function() {
    var i3;
    while (i3 = w3.shift()) h3.call(i3);
  });
}
function x2() {
  if (1 === w3.push(this)) (l.requestAnimationFrame || q)(T2);
}
function F() {
  r2(function() {
    var i3;
    while (i3 = _2.shift()) h3.call(i3);
  });
}
function M() {
  if (1 === _2.push(this)) (l.requestAnimationFrame || A2)(F);
}
function useSignalEffect(i3, n2) {
  var t4 = A(i3);
  t4.current = i3;
  y(function() {
    return E(function() {
      this.N = x2;
      return t4.current();
    }, n2);
  }, []);
}
export {
  u2 as Signal,
  r2 as batch,
  w2 as computed,
  E as effect,
  d2 as signal,
  n as untracked,
  useComputed,
  useSignal,
  useSignalEffect
};
//# sourceMappingURL=@preact_signals.js.map
