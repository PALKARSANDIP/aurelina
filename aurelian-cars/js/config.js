/* AURELIAN site settings.
   Everything you are likely to change when you swap in real media lives here. */
window.AURELIAN = {
  /* Scroll journey frames: put numbered images in /frames/ (001.webp, 002.webp ...).
     Set `count` to the number of files. See README for how to make them from a video. */
  frames: { dir: 'frames/', count: 388, ext: 'webp', pad: 3 },

  /* The photographic car used in the hero and the configurator, made from a side-profile photo
     by tools/make_car_assets.py. Copy the numbers it prints (images/car/car.json) into `wheels`.
     Set `car: null` to fall back to the drawn placeholder car in js/car.js. */
  car: {
    name: 'Aurelian Halcyon',
    body: 'images/car/halcyon-body.webp',
    paintMask: 'images/car/halcyon-paint.png',
    ratio: 1358 / 399,
    /* left / top / width as % of the body image. Rear wheel first. */
    wheels: [
      { src: 'images/car/halcyon-wheel-rear.webp',  left: 15.022, top: 51.128, width: 13.108 },
      { src: 'images/car/halcyon-wheel-front.webp', left: 77.761, top: 50.877, width: 13.108 }
    ]
  },

  /* HUD shown during the journey. endMinutes is the clock time at the last frame: set it to match the
     footage (the full drive runs dawn to night: 06:00 to 23:59).
     Scene titles and the rail's Dawn / Day / Dusk / Night marks follow this automatically. */
  journey: { startMinutes: 6 * 60, endMinutes: 23 * 60 + 59, maxSpeed: 140,
    /* Time of day at each keyframe, KF1 to KF6 (the clock and scene titles follow these). */
    keyTimes: ['06:00', '08:30', '12:40', '18:55', '20:45', '23:40'] }
};
