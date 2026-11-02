// ---------------------------------------------------------------------------
// All tunable values live here. Units in the scene are metres, angles in degrees.
// ---------------------------------------------------------------------------
export const CONFIG = {
  assets: {
    character: '/models/drex__human_3d_character.glb',
    desk: '/models/reception_desk.glb',
  },

  // ---- Logo --------------------------------------------------------------
  // Official artwork (transparent PNG). Width is derived from the image's own aspect ratio.
  logo: {
    url: '/logo/top-logo.png',
    position: [0.0, 1.90, -1.452],  // centre of the logo on the wall (x, y, z)
    height: 0.54,                    // metres (width follows the artwork's aspect ratio)
    aspect: 1667 / 944,              // fallback until the texture has loaded
  },

  // ---- Scene layout ------------------------------------------------------
  scene: {
    deskScale: 0.45,                 // desk GLB is in arbitrary units (counter top = 2.0)
    characterScale: 0.95,            // 1.86 m model -> ~1.77 m person
    seatHeight: 0.47,                // seat surface height (m)
    hipJointAboveSeat: 0.09,         // hip joint centre above the seat surface
    characterZ: -0.33,               // hips Z (m); desk kneehole wall is at ~ -0.18
    wallZ: -1.46,
    showAlcove: false,               // the desk GLB also contains a wood back panel + canopy + floor slab; false = use the clean wall instead
  },

  camera: {
    fov: 26,
    position: [0, 1.36, 3.4],
    target: [0, 1.27, 0],
    // keep at least this much of the scene visible (at the target distance) for any window shape
    minVisibleWidth: 2.1,
    minVisibleHeight: 1.36,
    portraitMinVisibleWidth: 1.05,   // phones held upright: tighter framing so the face stays readable
  },

  // ---- Head tracking -----------------------------------------------------
  // Angles are the maximum rotation (degrees) contributed by each bone when
  // the cursor is at the very edge of the viewport.
  tracking: {
    deadZone: 0.03,                  // normalised radius around centre treated as "centred"
    yawHead: 21, yawNeck: 8,         // total max yaw   = 29 deg
    pitchUpHead: 9, pitchUpNeck: 4,  // total max up    = 13 deg
    pitchDownHead: 7, pitchDownNeck: 3, // total max down = 10 deg
    rollHead: 3,                     // slight head tilt that accompanies yaw
    eyeYaw: 14, eyePitchUp: 8, eyePitchDown: 8,
    // smoothing rates (1/s). Higher = snappier. Head/neck use two cascaded stages
    // (smooth start AND smooth stop); the neck is slower so the head leads.
    rateHead: 8.0, rateNeck: 5.0, rateEyes: 18.0,
    maxDt: 0.1,                      // clamp frame delta (tab switches, hiccups)
  },

  // ---- Input -------------------------------------------------------------
  input: {
    touchHoldMs: 900,                // finger lifted: stay attentive this long, then ease back to rest
    tapHoldMs: 1400,                 // quick tap: attentive response lasts this long
    tapMaxMs: 280, tapMaxMovePx: 12,
    gamepadDeadZone: 0.18,           // radial dead zone for sticks (0..1)
    gamepadMaxScale: 0.9,            // stick fully deflected = this fraction of full head range
  },

  // ---- Body motion -------------------------------------------------------
  body: {
    breathHz: 0.24, breathDeg: 0.55,         // slow, understated chest motion
    shiftEvery: [14, 32],                    // seconds between small posture adjustments
    headIdleEvery: [16, 42],                 // seconds between small idle nods / tilts
    poseDwell: [9, 22],                      // seconds a hands-on-desk pose is held
    handClearance: 0.036,                    // wrist-joint height above the counter surface (m)
    handLift: 0.05,                          // how far the hand rises while repositioning (m)
  },

  render: { maxPixelRatio: 2, maxPixelRatioTouch: 1.5 },

};
