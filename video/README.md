# Qadaa launch video

A 27-second, 1080×1350 (4:5) silent video with Arabic and English captions, for LinkedIn and other social posts.

```bash
cd video && npm install
npm run studio   # live preview and editing in the browser
npm run render   # -> out/qadaa-launch.mp4
```

Screens are in `public/`, captured from the emulator. Replace them with new captures when the UI changes.
If Remotion can't download its own Chrome, add `--browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
