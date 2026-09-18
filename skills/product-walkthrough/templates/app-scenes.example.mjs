// app-scenes.example.mjs — the phone half of a guide: drive a mobile app on the
// Android emulator with adb and import every screen into the same manifest the
// browser scenes write. Copy next to scenes.mjs and adapt package, taps, texts.
//   node app-scenes.mjs [path/to/app-debug.apk]
// With an APK path the current install is replaced first (a CI build is signed
// with a different debug key than a local one, so a plain reinstall is refused).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { importShot } from './import-shots.mjs';

const PKG = process.env.APP_PACKAGE ?? 'com.example.app';
const ACTIVITY = `${PKG}/.MainActivity`;
const RAW = path.resolve(process.env.WALKTHROUGH_WORK ?? '.work', 'raw');
fs.mkdirSync(RAW, { recursive: true });

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'], ...opts });
const adb = (args) => sh(`adb ${args}`).toString().trim();
const wait = (s) => sh(`adb shell sleep ${s}`); // sleeps on the device: no host-side sleep needed
const tap = (x, y) => adb(`shell input tap ${x} ${y}`);
const swipeUp = () => adb('shell input swipe 540 1500 540 700 600');
const back = () => adb('shell input keyevent KEYCODE_BACK');

async function shot(name, opts = {}) {
  const file = path.join(RAW, `${name}.png`);
  fs.writeFileSync(file, sh('adb exec-out screencap -p', { maxBuffer: 64 * 1024 * 1024 }));
  await importShot({ name, from: file, ...opts });
}

/** Accessibility nodes with text on screen. A web view exposes its labels;
 *  portaled sheets and modals often do not — tap those by coordinate. */
function nodes() {
  const xml = adb('exec-out uiautomator dump /dev/tty');
  const re = /<node [^>]*text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    out.push({ text: m[1], x: Math.round((+m[2] + +m[4]) / 2), y: Math.round((+m[3] + +m[5]) / 2) });
  }
  return out;
}
const findText = (text, exact) => nodes().find((n) => (exact ? n.text === text : n.text.includes(text)));

/** Poll until `text` is on screen. Skeletons and spinners are not content;
 *  a swipe on a half-loaded page lands on whatever is under the finger. */
function waitForText(text, timeoutSec = 60) {
  for (let t = 0; t < timeoutSec; t += 2) {
    if (findText(text, false)) return;
    wait(2);
  }
  throw new Error(`timed out waiting for "${text}"`);
}

function tapText(text, { exact = false } = {}) {
  const n = findText(text, exact);
  if (!n) throw new Error(`text not on screen: ${text}`);
  tap(n.x, n.y);
}

/** Fresh first launch at a faked location, permissions pre-granted so no system dialog interrupts. */
function relaunchAt(lng, lat) {
  adb(`shell am force-stop ${PKG}`);
  adb(`shell pm clear ${PKG}`);
  for (const p of ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS']) {
    adb(`shell pm grant ${PKG} android.permission.${p}`);
  }
  adb(`emu geo fix ${lng} ${lat}`);
  adb(`shell am start -n ${ACTIVITY}`);
}

/** A clean, identical status bar on every shot (fixed clock, full battery, wifi). */
function statusBarDemo(on) {
  if (!on) return adb('shell am broadcast -a com.android.systemui.demo -e command exit');
  adb('shell settings put global sysui_demo_allowed 1');
  adb('shell am broadcast -a com.android.systemui.demo -e command enter');
  adb('shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0900');
  adb('shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false');
  adb('shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4');
  adb('shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false');
}

const apk = process.argv[2];
if (apk) {
  try { adb(`uninstall ${PKG}`); } catch { /* not installed yet */ }
  console.log(adb(`install "${path.resolve(apk)}"`));
}
statusBarDemo(true);

// The icon with its name: the app drawer (KEYCODE_ALL_APPS opens it where a
// swipe may not), scrolled to the right letter and cropped to the rows around
// the app so unrelated apps on the emulator stay out of the guide.
adb('shell input keyevent KEYCODE_HOME');
wait(2);
adb('shell input keyevent KEYCODE_ALL_APPS');
wait(2);
adb('shell input swipe 540 1500 540 900 500');
wait(2);
await shot('app-drawer', { crop: [0, 1000, 1080, 880] });
adb('shell input keyevent KEYCODE_HOME');

// First launch: the native splash is only there for a second.
relaunchAt(46.6753, 24.7136);
wait(1);
await shot('app-splash');
wait(18);
await shot('app-welcome');
tap(540, 1220); // the primary button
waitForText('More'); // a label that only exists once real content has loaded
wait(3);
await shot('app-home', {
  callouts: [
    { n: 1, x: 390, y: 240, w: 330, h: 130 }, // pixel boxes on the 1080×1920 frame
    { n: 2, x: 0, y: 1700, w: 1080, h: 120 },
  ],
});
swipeUp();
wait(2);
await shot('app-home-scrolled');

// Tabs by coordinate; text taps where the label is exposed.
tap(756, 1780);
wait(10); // images arrive after the tiles
await shot('app-categories');
back();
tapText('Skip');

statusBarDemo(false);
console.log('app scenes done');
