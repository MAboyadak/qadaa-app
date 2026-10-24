# Qadaa launch video

A 27-second, 1080×1350 (4:5) video with Arabic and English captions and soft non-musical breeze ambience, for LinkedIn and other social posts.

```bash
cd video && npm install
npm run ambience # regenerate public/ambience.wav using Node built-ins only
npm run studio   # live preview and editing in the browser
npm run render   # -> out/qadaa-launch.mp4
```

The ambience is deterministic filtered brown noise with slow, irregular swells: no music, melody, beats or instruments.
The committed WAV is 44.1 kHz, 16-bit stereo, with a −20 dBFS peak, a 2-second fade-in and a 3-second fade-out;
the composition plays it at a constant volume of 0.65. If the video timing changes, update the generator's frame count/fps and run `npm run ambience` again.

Screens are in `public/`, captured from the emulator. Replace them with new captures when the UI changes.
If Remotion can't download its own Chrome, add `--browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
