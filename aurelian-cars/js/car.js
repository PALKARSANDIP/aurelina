/* AURELIAN: placeholder car art, drawn in code.
   Replace with real photography/renders any time (see README).
   window.Car.svg({ paint, wheel }) returns an inline SVG string. */
(function () {
  'use strict';

  /* hex: swatch and drawn-car colour.
     tint: colour laid over the photo's green paintwork (CSS mix-blend-mode: color), null = the photo as shot.
     shade: optional multiply layer to make a paint darker than the photographed green. */
  var PAINTS = [
    { id: 'verde',    name: 'Verde Notte',       hex: '#1f4a3f', tint: null,      shade: null },
    { id: 'sapphire', name: 'Midnight Sapphire', hex: '#1f2f57', tint: '#1f3463', shade: '#a6abba' },
    { id: 'oxblood',  name: 'Oxblood',           hex: '#4f1a22', tint: '#6a2630', shade: '#b4a4a6' },
    { id: 'bronze',   name: 'Burnished Bronze',  hex: '#6a4a2c', tint: '#74522f', shade: '#bdb0a0' },
    { id: 'storm',    name: 'Storm Grey',        hex: '#4a5156', tint: '#6b7378', shade: '#ececec' },
    { id: 'onyx',     name: 'Onyx',              hex: '#141516', tint: '#2a2c2e', shade: '#6a6a6a' }
  ];

  /* Wheel finishes. filter: applied to the photographic wheels; draw: wheel style for the drawn car. */
  var WHEELS = [
    { id: 'bronze', name: 'Forged bronze',   filter: 'none', draw: 'turbine' },
    { id: 'black',  name: 'Satin black',     filter: 'grayscale(1) brightness(.42) contrast(1.25)', draw: 'aero' },
    { id: 'silver', name: 'Polished silver', filter: 'grayscale(1) brightness(1.3) contrast(1.05)', draw: 'spoke' }
  ];
  var DRAW_STYLE = {};
  WHEELS.forEach(function (w) { DRAW_STYLE[w.id] = w.draw; });

  var uidCounter = 0;

  function wheelFace(type) {
    var i, a, out = '';
    if (type === 'spoke') {
      out += '<circle r="29" fill="#2a2f32"/>';
      for (i = 0; i < 12; i++) {
        a = i * 30;
        out += '<line x1="0" y1="-7" x2="0" y2="-28" stroke="#c3cbca" stroke-width="2.4" stroke-linecap="round" transform="rotate(' + a + ')"/>';
      }
      out += '<circle r="29" fill="none" stroke="#c3cbca" stroke-width="2.2"/>';
    } else if (type === 'aero') {
      out += '<circle r="29" fill="#c3cbca"/>';
      for (i = 0; i < 6; i++) {
        a = i * 60;
        out += '<path d="M9,-6 A11,11 0 0 1 22,-6 L22,-1 L9,-1 Z" fill="#2a2f32" transform="rotate(' + a + ')"/>';
      }
      out += '<circle r="29" fill="none" stroke="#aab3b2" stroke-width="1.6"/>';
    } else { // turbine
      out += '<circle r="29" fill="#2a2f32"/>';
      for (i = 0; i < 10; i++) {
        a = i * 36;
        out += '<path d="M0,-6 C9,-9 17,-17 14,-28 C7,-21 1,-15 -2,-7 Z" fill="#c3cbca" transform="rotate(' + a + ')"/>';
      }
      out += '<circle r="29" fill="none" stroke="#c3cbca" stroke-width="2"/>';
    }
    out += '<circle r="6" fill="#e6e9e8"/><circle r="2.2" fill="#2a2f32"/>';
    return out;
  }

  function wheel(cx, cy, type) {
    return '' +
      '<g transform="translate(' + cx + ' ' + cy + ')">' +
        '<circle r="41" fill="#0b0d0e"/>' +
        '<circle r="38" fill="none" stroke="#1d2123" stroke-width="2"/>' +
        '<path d="M6,-26 A27 27 0 0 1 26,-8 L18,-6 A19 19 0 0 0 5,-17 Z" fill="#b8432f" opacity=".9"/>' +
        '<g class="rim"><g class="roll">' + wheelFace(type) + '</g></g>' +
      '</g>';
  }

  function svg(opts) {
    opts = opts || {};
    var paint = opts.paint || PAINTS[0].hex;
    var type = DRAW_STYLE[opts.wheel] || opts.wheel || 'turbine';
    var u = 'c' + (++uidCounter);

    var body = 'M52,180 C44,164 48,146 74,138 L196,124 C246,94 326,75 392,72 C446,70 496,80 540,102 ' +
               'C600,114 700,128 744,156 C756,164 756,176 746,184 L735,190 L661,192 A52,52 0 0 0 559,192 ' +
               'L241,192 A52,52 0 0 0 139,192 L70,192 Z';

    return '' +
    '<svg class="car-svg" viewBox="0 0 800 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of an Aurelian coupe">' +
      '<defs>' +
        '<linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#fff" stop-opacity=".42"/>' +
          '<stop offset=".34" stop-color="#fff" stop-opacity=".06"/>' +
          '<stop offset=".62" stop-color="#000" stop-opacity="0"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity=".5"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + u + 'g" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#9fb4b8"/><stop offset=".5" stop-color="#27343a"/><stop offset="1" stop-color="#0d1417"/>' +
        '</linearGradient>' +
        '<radialGradient id="' + u + 'f" cx=".5" cy=".5" r=".5">' +
          '<stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<radialGradient id="' + u + 'h" cx=".5" cy=".5" r=".5">' +
          '<stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<ellipse cx="400" cy="221" rx="372" ry="11" fill="url(#' + u + 'f)"/>' +
      wheel(190, 180, type) +
      wheel(610, 180, type) +
      '<g class="car-body">' +
        '<path d="' + body + '" fill="' + paint + '" class="paint"/>' +
        '<path d="' + body + '" fill="url(#' + u + 's)"/>' +
        '<path d="M300,150 C330,140 384,140 414,150 L402,174 C372,167 332,167 300,174 Z" fill="#000" opacity=".42"/>' +
        '<path d="M232,122 C280,96 336,78 392,74 C440,72 488,82 524,102 L512,106 C466,104 396,104 338,108 Z" fill="url(#' + u + 'g)"/>' +
        '<path d="M232,122 C280,96 336,78 392,74" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>' +
        '<path d="M92,152 C300,141 520,136 706,156" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.6"/>' +
        '<path d="M466,104 C476,134 480,162 476,190" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>' +
        '<path d="M286,114 C280,142 280,168 284,190" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>' +
        '<path d="M692,190 L748,184 L744,190 Z" fill="#0b0d0e"/>' +
        '<path d="M54,146 L132,130 L134,135 L58,152 Z" fill="#0b0d0e" opacity=".85"/>' +
        '<path d="M704,147 L742,159 L702,156 Z" fill="#f4f7f6"/>' +
        '<ellipse cx="726" cy="155" rx="34" ry="14" fill="url(#' + u + 'h)" opacity=".55" class="headlamp"/>' +
        '<path d="M51,152 L76,148 L76,154 L53,161 Z" fill="#ff4332"/>' +
      '</g>' +
    '</svg>';
  }

  /* Photographic car (see `car` in js/config.js): body photo, a paint layer masked to the green
     bodywork, and two separate wheel layers so the wheels can really turn.
     Returns an HTML string; use Car.setPaint / Car.setWheels to change it in place. */
  function photo(car, opts) {
    opts = opts || {};
    var wheels = car.wheels.map(function (w) {
      return '<span class="car-wheel" style="left:' + w.left + '%;top:' + w.top + '%;width:' + w.width + '%">' +
        '<span class="rim"><img class="roll" src="' + w.src + '" alt="" decoding="async"></span></span>';
    }).join('');
    var mask = '-webkit-mask-image:url(' + car.paintMask + ');mask-image:url(' + car.paintMask + ')';
    return '<div class="car-photo" role="img" aria-label="' + (opts.label || car.name) + '" style="aspect-ratio:' + car.ratio + '">' +
      '<img class="car-body" src="' + car.body + '" alt="" decoding="async"' + (opts.eager ? '' : ' loading="lazy"') + '>' +
      '<span class="car-tint" style="' + mask + '"></span><span class="car-shade" style="' + mask + '"></span>' + wheels + '</div>';
  }

  function findPaint(hex) { return PAINTS.filter(function (p) { return p.hex === hex; })[0]; }
  function findWheel(id) { return WHEELS.filter(function (w) { return w.id === id; })[0]; }

  function setPaint(root, hex) {
    var p = findPaint(hex) || PAINTS[0];
    var el = root.querySelector('.car-photo');
    if (!el) return;
    el.style.setProperty('--tint', p.tint || 'transparent');
    el.style.setProperty('--tint-on', p.tint ? 1 : 0);
    el.style.setProperty('--shade', p.shade || '#fff');
  }

  function setWheels(root, id) {
    var w = findWheel(id) || WHEELS[0];
    Array.prototype.forEach.call(root.querySelectorAll('.car-wheel img'), function (img) { img.style.filter = w.filter; });
  }

  window.Car = { svg: svg, photo: photo, setPaint: setPaint, setWheels: setWheels, PAINTS: PAINTS, WHEELS: WHEELS };
})();
