// Shared messaging for ZoomMate prototypes + Moderator.
// Same browser: BroadcastChannel. Across computers: ntfy.sh relay, keyed by a session code (?session=CODE).
(function () {
  if (window.ZMSync) return;
  var FILES = {
    "Projector View.dc.html": { group: "chat", view: "projector" },
    "Laptop View.dc.html": { group: "chat", view: "laptop" },
    "2A - Troubleshooting (Projector).dc.html": { group: "trouble", view: "projector" },
    "2B + 2C - Troubleshooting (Laptop).dc.html": { group: "trouble", view: "laptop" },
    "3A - Troubleshooting (Projector + Laptop).dc.html": { group: "conn", view: "both" }
  };
  var GROUPS = {
    chat: { projector: "Projector View.dc.html", laptop: "Laptop View.dc.html" },
    trouble: { projector: "2A - Troubleshooting (Projector).dc.html", laptop: "2B + 2C - Troubleshooting (Laptop).dc.html" },
    conn: { projector: "3A - Troubleshooting (Projector + Laptop).dc.html", laptop: "3A - Troubleshooting (Projector + Laptop).dc.html" }
  };
  var id = Math.random().toString(36).slice(2, 10);
  var listeners = [], seen = {}, bc = null, es = null, topic = "";
  function file() { try { return decodeURIComponent(location.pathname.split("/").pop() || ""); } catch (e) { return ""; } }
  function info() {
    var f = file();
    if (FILES[f]) return FILES[f];
    var n = f.toLowerCase().replace(/[-_+]/g, " ").replace(/\s+/g, " ").replace(/(\.dc)?(\.html)?$/, "");
    if (n.indexOf("laptop view") >= 0) return FILES["Laptop View.dc.html"];
    if (n.indexOf("projector view") >= 0) return FILES["Projector View.dc.html"];
    for (var k in FILES) if (k.toLowerCase().replace(/\.dc\.html$/, "") === n) return FILES[k];
    return { group: "", view: "projector" };
  }
  function clean(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12); }
  function session() {
    var q = "";
    try { q = clean(new URLSearchParams(location.search).get("session")); } catch (e) {}
    if (q) { try { localStorage.setItem("zm-session", q); } catch (e) {} return q; }
    try { return clean(localStorage.getItem("zm-session")); } catch (e) { return ""; }
  }
  function deliver(m) {
    if (!m || m._from === id) return;
    if (m._mid) { if (seen[m._mid]) return; seen[m._mid] = Date.now(); }
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](m); } catch (e) { console.error(e); } }
  }
  function connect() {
    if (!bc && "BroadcastChannel" in window) { bc = new BroadcastChannel("zoommate-moderator"); bc.onmessage = function (e) { deliver(e.data); }; }
    var s = session(), t = s ? "zoommate-pilot-" + s.toLowerCase() : "";
    if (t === topic) return;
    if (es) { es.close(); es = null; }
    topic = t;
    if (!t || !("EventSource" in window)) return;
    es = new EventSource("https://ntfy.sh/" + t + "/sse");
    es.onmessage = function (ev) {
      try { var d = JSON.parse(ev.data); if (d.event === "message" && d.message) deliver(JSON.parse(d.message)); } catch (e) {}
    };
  }
  function post(m, opts) {
    connect();
    var msg = Object.assign({}, m, { _from: id, _mid: id + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6) });
    if (bc) bc.postMessage(msg);
    if (topic && !(opts && opts.localOnly)) {
      try { fetch("https://ntfy.sh/" + topic, { method: "POST", body: JSON.stringify(msg), keepalive: !!(opts && opts.keepalive) }).catch(function () {}); } catch (e) {}
    }
  }
  setInterval(function () { var n = Date.now(); for (var k in seen) if (n - seen[k] > 60000) delete seen[k]; }, 30000);
  window.addEventListener("pagehide", function () { if (info().group) post({ role: "proto", id: id, bye: true }, { keepalive: true }); });
  window.ZMSync = {
    id: id,
    file: file,
    group: function () { return info().group; },
    view: function () { return info().view; },
    files: FILES,
    groups: GROUPS,
    session: session,
    relay: function () { return !!topic; },
    setSession: function (c) { try { localStorage.setItem("zm-session", clean(c)); } catch (e) {} connect(); },
    on: function (fn) { connect(); listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    post: post,
    goto: function (m) {
      var target = m.file;
      var g = GROUPS[m.group];
      if (g) { var v = info().view; target = g[v === "laptop" ? "laptop" : "projector"]; }
      if (!target) return;
      var s = session();
      location.href = encodeURIComponent(target) + (s ? "?session=" + encodeURIComponent(s) : "");
    }
  };
  connect();
})();

(function () {
  if (window.__zmFS) return; window.__zmFS = true;
  var ENTER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var EXIT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  function isFS() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function toggle() {
    var d = document.documentElement;
    if (isFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (d.requestFullscreen || d.webkitRequestFullscreen).call(d);
  }
  function mount() {
    if (document.getElementById("zm-fs-btn")) return;
    var b = document.createElement("button");
    b.id = "zm-fs-btn"; b.type = "button";
    b.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:2147483000;width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(20,21,24,.72);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;opacity:.35;transition:opacity .2s;backdrop-filter:blur(6px)";
    b.onmouseenter = function () { b.style.opacity = "1"; };
    b.onmouseleave = function () { b.style.opacity = ".35"; };
    b.onclick = function (e) { e.stopPropagation(); toggle(); };
    function sync() { b.innerHTML = isFS() ? EXIT : ENTER; b.title = isFS() ? "Exit full screen (Ctrl/Cmd+Shift+Enter)" : "Full screen (Ctrl/Cmd+Shift+Enter)"; }
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    sync();
    document.body.appendChild(b);
  }
  window.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.shiftKey && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggle(); }
  });
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
