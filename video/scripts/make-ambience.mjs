import { writeFileSync } from 'node:fs';

// Matches LAUNCH_FRAMES = 105 + 105 + 120 + 120 + 105 + 105 + 150 in
// src/Launch.tsx and fps={30} in src/Root.tsx. Update when scene timing changes.
const frames = 810;
const fps = 30;
const sampleRate = 44100;
const channels = 2;
const duration = frames / fps;
const sampleCount = Math.round(duration * sampleRate);
const peakDb = -20;

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

const noiseRandom = random(0x51414441);
const swellRandom = random(0x42524545);
const smoothstep = (t) => t * t * (3 - 2 * t);
const coefficient = (hz) => 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);

// A leaky integrator creates brown noise. Remove sub-bass/DC below 35 Hz,
// then use two low-pass poles at 650 Hz to soften high-frequency hiss.
function brownNoise() {
  let brown = 0;
  let bass = 0;
  let low1 = 0;
  let low2 = 0;
  const leak = coefficient(20);
  const highpass = coefficient(35);
  const lowpass = coefficient(650);
  return () => {
    brown += leak * (noiseRandom() * 2 - 1 - brown);
    bass += highpass * (brown - bass);
    low1 += lowpass * (brown - bass - low1);
    low2 += lowpass * (low1 - low2);
    return low2;
  };
}

const commonNoise = brownNoise();
const leftNoise = brownNoise();
const rightNoise = brownNoise();
// Settle the filters before the audible fade-in.
for (let i = 0; i < sampleRate; i++) {
  commonNoise();
  leftNoise();
  rightNoise();
}

let swellStart = 0;
let swellEnd = 4 + swellRandom() * 4;
let swellFrom = 0.55 + swellRandom() * 0.4;
let swellTo = 0.55 + swellRandom() * 0.4;
const samples = new Float64Array(sampleCount * channels);
let peak = 0;

for (let i = 0; i < sampleCount; i++) {
  const time = i / sampleRate;
  if (time >= swellEnd) {
    swellStart = swellEnd;
    swellEnd += 4 + swellRandom() * 4;
    swellFrom = swellTo;
    swellTo = 0.55 + swellRandom() * 0.4;
  }
  // Non-periodic 4–8 second gusts with smooth transitions, never a beat.
  const swell = swellFrom + (swellTo - swellFrom) * smoothstep((time - swellStart) / (swellEnd - swellStart));
  const fadeIn = smoothstep(Math.min(1, time / 2));
  const fadeOut = smoothstep(Math.min(1, (sampleCount - 1 - i) / sampleRate / 3));
  const gain = swell * fadeIn * fadeOut;
  const common = commonNoise() * 0.85;
  const left = (common + leftNoise() * 0.35) * gain;
  const right = (common + rightNoise() * 0.35) * gain;
  samples[i * channels] = left;
  samples[i * channels + 1] = right;
  peak = Math.max(peak, Math.abs(left), Math.abs(right));
}

// Normalize both channels together, preserving the stereo balance and fades.
const scale = 10 ** (peakDb / 20) / peak;
const bytesPerSample = 2;
const dataBytes = samples.length * bytesPerSample;
const wav = Buffer.alloc(44 + dataBytes);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataBytes, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // Uncompressed PCM.
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
wav.writeUInt16LE(channels * bytesPerSample, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < samples.length; i++) {
  wav.writeInt16LE(Math.round(samples[i] * scale * 32767), 44 + i * bytesPerSample);
}

writeFileSync(new URL('../public/ambience.wav', import.meta.url), wav);
console.log(`ambience.wav: ${duration} s, ${sampleRate} Hz, 16-bit stereo, ${wav.length} bytes, ${peakDb} dBFS peak`);
