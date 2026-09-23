/**
 * Web preview only. Skia's web build reads the global CanvasKit when it is
 * first imported, so CanvasKit has to finish loading before the app does.
 *
 * The public demo opens in a frame: a phone-sized window on large screens and
 * a thin "web preview" strip on phones. The app itself runs inside the iframe,
 * so its window is always phone-sized.
 */
// Imported from its own file: the package's web index also pulls in Skia
// itself, which would bind to a CanvasKit that has not loaded yet.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web/LoadSkiaWeb';

const APK_URL = 'https://github.com/twinstack-studio/sketchify/releases/latest/download/sketchify.apk';
const REPO_URL = 'https://github.com/twinstack-studio/sketchify';
const STUDIO_URL = 'https://twinstackstudio.com';

if (window.self !== window.top || new URLSearchParams(location.search).has('app')) {
  // A plain require runs lazily in Metro, and stays in the one bundle.
  LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => require('expo-router/entry'));
} else {
  renderFrame();
}

function renderFrame() {
  document.title = 'Sketchify · Photo to sketch app by TwinStack Studio';
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: 100%; margin: 0; background: #0C0B0A; }
    #root { display: none; }
    .sk-frame { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      gap: 64px; padding: 24px; box-sizing: border-box; color: #F6F1E7;
      font: 15px/1.6 Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: radial-gradient(1100px 600px at 70% 15%, #221b10 0%, #0C0B0A 62%); }
    .sk-info { max-width: 360px; }
    .sk-info h1 { font: 600 48px/1.05 Georgia, 'Times New Roman', serif; margin: 0 0 16px; }
    .sk-info h1 em { color: #E8B04B; }
    .sk-info p { margin: 0 0 14px; color: #A69E91; }
    .sk-btns { display: flex; flex-wrap: wrap; gap: 10px; margin: 24px 0 20px; }
    .sk-btn { padding: 11px 18px; border-radius: 999px; text-decoration: none; font-weight: 600;
      font-size: 14px; color: #F6F1E7; border: 1px solid #2F2B27; }
    .sk-btn.primary { background: #E8B04B; color: #1A1305; border-color: #E8B04B; }
    .sk-small { font-size: 13px; color: #6A645B !important; }
    .sk-small a { color: #E8B04B; text-decoration: none; }
    .sk-phone { flex: none; height: min(844px, calc(100vh - 48px)); aspect-ratio: 390 / 844;
      border-radius: 46px; padding: 10px; box-sizing: border-box; background: #1B1917;
      box-shadow: 0 30px 90px rgba(0,0,0,.65), inset 0 0 0 2px #2F2B27; }
    .sk-phone iframe { width: 100%; height: 100%; border: 0; border-radius: 36px; background: #0C0B0A; display: block; }
    .sk-strip { display: none; }
    @media (max-width: 820px) {
      .sk-frame { flex-direction: column; gap: 0; padding: 0; background: #0C0B0A; }
      .sk-info { display: none; }
      .sk-strip { display: flex; flex: none; width: 100%; box-sizing: border-box; align-items: center;
        justify-content: space-between; gap: 8px; padding: 7px 14px; font-size: 12px; line-height: 1.3;
        background: #161412; color: #A69E91; border-bottom: 1px solid #2F2B27; }
      .sk-strip a { color: #E8B04B; text-decoration: none; font-weight: 600; white-space: nowrap; }
      .sk-phone { flex: 1; width: 100%; height: auto; aspect-ratio: auto; border-radius: 0; padding: 0;
        background: none; box-shadow: none; }
      .sk-phone iframe { border-radius: 0; }
    }`;
  document.head.appendChild(style);

  const frame = document.createElement('div');
  frame.className = 'sk-frame';
  frame.innerHTML = `
    <div class="sk-strip"><span>Web preview · save &amp; camera in the app</span><a href="${APK_URL}">Get the Android app</a></div>
    <div class="sk-info">
      <h1>Sketch<em>ify</em></h1>
      <p>Turn any photo into a drawing. Thirteen sketch styles, from graphite and ink to watercolour and neon, run live on the phone's GPU, and nothing is uploaded.</p>
      <p>This is a web preview of the mobile app: try the sample photo, switch styles and move the sliders.</p>
      <div class="sk-btns">
        <a class="sk-btn primary" href="${APK_URL}">Download for Android</a>
        <a class="sk-btn" href="${REPO_URL}" target="_blank" rel="noopener">View the code</a>
      </div>
      <p class="sk-small">Saving to Photos, sharing and the camera work only in the Android app.</p>
      <p class="sk-small">Built by <a href="${STUDIO_URL}" target="_blank" rel="noopener">TwinStack Studio</a></p>
    </div>
    <div class="sk-phone"><iframe src="${location.pathname}?app" title="Sketchify app"></iframe></div>`;
  document.body.appendChild(frame);
}
