/**
 * Renders SBML Level 3 Layout (Reactome export) into an SVG with pan/zoom.
 * Depends on pathway coordinates in layout:extension only (no ode simulation).
 */
(function () {
  var LAYOUT_NS = "http://www.sbml.org/sbml/level3/version1/layout/version1";

  function getAttrNS(el, local, ns) {
    if (!el) return null;
    return el.getAttributeNS(ns || LAYOUT_NS, local) || el.getAttribute("layout:" + local);
  }

  function numAttr(el, local) {
    var v = getAttrNS(el, local);
    return v != null && v !== "" ? parseFloat(v, 10) : NaN;
  }

  function shortLabel(name, maxLen) {
    maxLen = maxLen || 48;
    if (!name) return "";
    name = String(name).replace(/\s+/g, " ").trim();
    return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
  }

  function buildSpeciesNameMap(doc) {
    var map = Object.create(null);
    var list = doc.getElementsByTagNameNS("http://www.sbml.org/sbml/level3/version1/core", "species");
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var id = s.getAttribute("id");
      var name = s.getAttribute("name") || id;
      if (id) map[id] = name;
    }
    return map;
  }

  function getFirstCompartmentBounds(doc) {
    var maxArea = 0;
    var best = { x: 0, y: 0, w: 1200, h: 800 };
    var glyphs = doc.getElementsByTagNameNS(LAYOUT_NS, "compartmentGlyph");
    for (var i = 0; i < glyphs.length; i++) {
      var g = glyphs[i];
      var bb = g.getElementsByTagNameNS(LAYOUT_NS, "boundingBox")[0];
      if (!bb) continue;
      var pos = bb.getElementsByTagNameNS(LAYOUT_NS, "position")[0];
      var dim = bb.getElementsByTagNameNS(LAYOUT_NS, "dimensions")[0];
      if (!pos || !dim) continue;
      var w = numAttr(dim, "width");
      var h = numAttr(dim, "height");
      if (w * h > maxArea && w > 50 && h > 50) {
        maxArea = w * h;
        best = {
          x: numAttr(pos, "x"),
          y: numAttr(pos, "y"),
          w: w,
          h: h,
        };
      }
    }
    return best;
  }

  function appendLineSegments(gLines, doc) {
    var segs = doc.getElementsByTagNameNS(LAYOUT_NS, "curveSegment");
    for (var i = 0; i < segs.length; i++) {
      var cs = segs[i];
      var st = cs.getElementsByTagNameNS(LAYOUT_NS, "start")[0];
      var en = cs.getElementsByTagNameNS(LAYOUT_NS, "end")[0];
      if (!st || !en) continue;
      var sx = numAttr(st, "x"),
        sy = numAttr(st, "y"),
        ex = numAttr(en, "x"),
        ey = numAttr(en, "y");
      if (!isFinite(sx + sy + ex + ey)) continue;
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", sx);
      line.setAttribute("y1", sy);
      line.setAttribute("x2", ex);
      line.setAttribute("y2", ey);
      line.setAttribute("stroke", "#78716c");
      line.setAttribute("stroke-opacity", "0.7");
      line.setAttribute("stroke-width", "0.9");
      gLines.appendChild(line);
    }
  }

  function appendSpeciesGlyphs(gSpecies, speciesNames, doc) {
    var glyphs = doc.getElementsByTagNameNS(LAYOUT_NS, "speciesGlyph");
    for (var i = 0; i < glyphs.length; i++) {
      var sg = glyphs[i];
      var sid = getAttrNS(sg, "species");
      var bb = sg.getElementsByTagNameNS(LAYOUT_NS, "boundingBox")[0];
      if (!bb) continue;
      var pos = bb.getElementsByTagNameNS(LAYOUT_NS, "position")[0];
      var dim = bb.getElementsByTagNameNS(LAYOUT_NS, "dimensions")[0];
      if (!pos || !dim) continue;
      var x = numAttr(pos, "x");
      var y = numAttr(pos, "y");
      var w = numAttr(dim, "width");
      var h = numAttr(dim, "height");
      if (!isFinite(x + y + w + h)) continue;
      var name = sid && speciesNames[sid] ? speciesNames[sid] : sid || "(species)";
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", Math.max(w, 2));
      rect.setAttribute("height", Math.max(h, 2));
      rect.setAttribute("rx", "3");
      rect.setAttribute("fill", "rgba(233,251,226,0.92)");
      rect.setAttribute("stroke", "#689f38");
      rect.setAttribute("stroke-width", "1");
      var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = name;
      rect.appendChild(title);
      var fs = Math.min(11, Math.max(6, Math.min(w / 8, h / 3)));
      var lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      lbl.setAttribute("x", x + 3);
      lbl.setAttribute("y", y + fs + 2);
      lbl.setAttribute("font-family", "Inter,Segoe UI,sans-serif");
      lbl.setAttribute("font-size", fs + "px");
      lbl.setAttribute("fill", "#1c1917");
      lbl.setAttribute("pointer-events", "none");
      lbl.textContent = shortLabel(name, Math.max(20, Math.floor(w / fs * 0.55)));
      g.appendChild(rect);
      g.appendChild(lbl);
      gSpecies.appendChild(g);
    }
  }

  function appendCompartment(gComp, bounds) {
    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", bounds.x);
    rect.setAttribute("y", bounds.y);
    rect.setAttribute("width", bounds.w);
    rect.setAttribute("height", bounds.h);
    rect.setAttribute("fill", "#fdfbf7");
    rect.setAttribute("stroke", "#d6d3d1");
    rect.setAttribute("stroke-width", "1.5");
    gComp.appendChild(rect);
  }

  /**
   * @param {HTMLElement} mount
   * @param {string} sbmlUrl
   * @param {string} label short title for toolbar
   * @param {string} [titleUrl] optional; when set, label is shown as a link
   */
  function renderInto(mount, sbmlUrl, label, titleUrl) {
    var toolbar = document.createElement("div");
    toolbar.className = "sbml-viewer-toolbar";
    var lab = document.createElement("span");
    lab.className = "sbml-viewer-label";
    var titleText = label || "SBML pathway layout";
    if (titleUrl) {
      var link = document.createElement("a");
      link.href = titleUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = titleText;
      lab.appendChild(link);
    } else {
      lab.textContent = titleText;
    }

    function mkBtn(act, chr, aria) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sbml-zoom btn btn-outline btn--sbml";
      b.setAttribute("data-act", act);
      b.setAttribute("aria-label", aria);
      b.textContent = chr;
      return b;
    }
    toolbar.appendChild(lab);
    toolbar.appendChild(mkBtn("minus", "\u2212", "Zoom out"));
    toolbar.appendChild(mkBtn("reset", "\u27f2", "Reset view"));
    toolbar.appendChild(mkBtn("plus", "+", "Zoom in"));

    var viewport = document.createElement("div");
    viewport.className = "sbml-viewer-viewport";

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "sbml-pathway-svg";
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var gRoot = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gRoot.setAttribute("class", "sbml-panzoom-root");
    var gComp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    var gLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
    var gSpecies = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gRoot.appendChild(gComp);
    gRoot.appendChild(gLines);
    gRoot.appendChild(gSpecies);
    svg.appendChild(gRoot);

    viewport.appendChild(svg);
    mount.appendChild(toolbar);
    mount.appendChild(viewport);

    var loading = document.createElement("p");
    loading.className = "sbml-viewer-loading";
    loading.textContent = "Loading pathway layout…";
    viewport.appendChild(loading);

    return fetch(sbmlUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (xmlStr) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xmlStr, "text/xml");
        if (doc.getElementsByTagName("parsererror").length) throw new Error("Invalid XML");

        viewport.removeChild(loading);

        var speciesNames = buildSpeciesNameMap(doc);
        var bounds = getFirstCompartmentBounds(doc);

        appendCompartment(gComp, bounds);
        appendLineSegments(gLines, doc);
        appendSpeciesGlyphs(gSpecies, speciesNames, doc);

        var vb =
          bounds.x +
          " " +
          bounds.y +
          " " +
          bounds.w +
        svg.setAttribute("viewBox", vb);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        var vbPan = {
          x: bounds.x,
          y: bounds.y,
          w: bounds.w,
          h: bounds.h,
        };

        function applyViewBox() {
          svg.setAttribute(
            "viewBox",
            [vbPan.x, vbPan.y, vbPan.w, vbPan.h].join(" ")
          );
        }

        function fitInitial() {
          vbPan.x = bounds.x;
          vbPan.y = bounds.y;
          vbPan.w = bounds.w;
          vbPan.h = bounds.h;
          applyViewBox();
        }

        toolbar.querySelector('[data-act="minus"]').onclick = function () {
          var cx = vbPan.x + vbPan.w / 2,
            cy = vbPan.y + vbPan.h / 2,
            zm = 1 / 1.22;
          vbPan.w *= zm;
          vbPan.h *= zm;
          vbPan.x = cx - vbPan.w / 2;
          vbPan.y = cy - vbPan.h / 2;
          applyViewBox();
        };
        toolbar.querySelector('[data-act="plus"]').onclick = function () {
          var cx = vbPan.x + vbPan.w / 2,
            cy = vbPan.y + vbPan.h / 2,
            zm = 1.22;
          vbPan.w *= zm;
          vbPan.h *= zm;
          vbPan.x = cx - vbPan.w / 2;
          vbPan.y = cy - vbPan.h / 2;
          applyViewBox();
        };
        toolbar.querySelector('[data-act="reset"]').onclick = fitInitial;

        var dragging = false,
          lastX,
          lastY;
        viewport.addEventListener("mousedown", function (e) {
          if (e.button !== 0) return;
          dragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
          viewport.style.cursor = "grabbing";
        });
        viewport.addEventListener("mousemove", function (e) {
          if (!dragging) return;
          var dx = e.clientX - lastX,
            dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          var vw = viewport.clientWidth || bounds.w,
            vh = viewport.clientHeight || 400;
          vbPan.x -= (dx / vw) * vbPan.w;
          vbPan.y -= (dy / vh) * vbPan.h;
          applyViewBox();
        });
        viewport.addEventListener("mouseup", function () {
          dragging = false;
          viewport.style.cursor = "grab";
        });
        viewport.addEventListener("mouseleave", function () {
          dragging = false;
          viewport.style.cursor = "grab";
        });

        viewport.addEventListener(
          "wheel",
          function (e) {
            e.preventDefault();
            var rectVp = viewport.getBoundingClientRect();
            var ox = Math.max(0, Math.min(e.clientX - rectVp.left, rectVp.width)),
              oy = Math.max(0, Math.min(e.clientY - rectVp.top, rectVp.height));
            var mx = vbPan.x + (ox / rectVp.width) * vbPan.w,
              my = vbPan.y + (oy / rectVp.height) * vbPan.h;
            var zoomOut = e.deltaY > 0;
            var zm = zoomOut ? 1.14 : 1 / 1.14;
            var nw = vbPan.w * zm,
              nh = vbPan.h * zm;
            vbPan.x = mx - (nw * (mx - vbPan.x)) / vbPan.w;
            vbPan.y = my - (nh * (my - vbPan.y)) / vbPan.h;
            vbPan.w = nw;
            vbPan.h = nh;
            /* avoid extreme extents */
            if (vbPan.w > bounds.w * 8 || vbPan.h > bounds.h * 8) fitInitial();
            else if (vbPan.w < bounds.w / 200 || vbPan.h < bounds.h / 200) fitInitial();
            else applyViewBox();
          },
          { passive: false }
        );

        viewport.style.cursor = "grab";
        requestAnimationFrame(fitInitial);

        window.addEventListener(
          "resize",
          debounce(function () {
            fitInitial();
          }, 160)
        );
      })
      .catch(function (err) {
        viewport.removeChild(loading);
        var errEl = document.createElement("p");
        errEl.className = "sbml-viewer-error";
        errEl.textContent =
          "Could not render SBML: " +
          err.message +
          ". Open the downloadable .sbml or use Reactome pathway browser.";
        viewport.appendChild(errEl);
      });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      var a = arguments;
      t = setTimeout(function () {
        fn.apply(null, a);
      }, ms);
    };
  }

  function boot() {
    var mounts = document.querySelectorAll("[data-sbml-layout-url]");
    mounts.forEach(function (mount) {
      var url = mount.getAttribute("data-sbml-layout-url");
      var lbl = mount.getAttribute("data-sbml-title") || "";
      var titleUrl = mount.getAttribute("data-sbml-title-url") || "";
      mount.classList.add("sbml-pathway-panel");
      if (!url) return;
      renderInto(mount, url, lbl, titleUrl);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
