const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'demo_recordings');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordWalkthrough() {
  console.log('🎬 Recording Full Project Walkthrough Video...');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1280, height: 860 },
    },
  });

  const page = await context.newPage();

  // Part 1: Beginner Walkthrough Guide Slides (rendered directly in high-res)
  const walkthroughHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0;
        background: #090d16;
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        overflow: hidden;
      }
      .slide {
        display: none;
        max-width: 960px;
        width: 90%;
        animation: fadeIn 0.6s ease-in-out;
      }
      .active { display: block; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
      .badge-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
      .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
      h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; color: #fff; }
      p { font-size: 16px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
      .grid-box {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 16px;
      }
      .card {
        background: #131b2e;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 18px;
      }
      .card-title { font-size: 16px; font-weight: 600; color: #38bdf8; margin-bottom: 6px; }
      .card-desc { font-size: 13px; color: #cbd5e1; line-height: 1.4; }
      .code-block {
        background: #020617;
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 14px 16px;
        font-family: ui-monospace, Menlo, Monaco, monospace;
        font-size: 13px;
        color: #e2e8f0;
        line-height: 1.6;
        margin-top: 12px;
      }
      .pin { color: #f59e0b; font-weight: bold; }
    </style>
  </head>
  <body>
    <div id="slide1" class="slide active">
      <span class="badge badge-blue">System Walkthrough</span>
      <h1>Tank Health Index: Architecture Overview</h1>
      <p>Autonomous drinking-water tank monitoring pipeline connecting physical sensors to a real-time reactive dashboard.</p>
      <div class="grid-box">
        <div class="card">
          <div class="card-title">1. ESP32 Sensing Edge</div>
          <div class="card-desc">Reads TDS (Pin 35), Turbidity/Clarity (Pin 34), DS18B20 Temp (Pin 4), and HC-SR04 Level (Pins 5/18). POSTs JSON every 5s over Wi-Fi.</div>
        </div>
        <div class="card">
          <div class="card-title">2. Express Scoring Backend (:3001)</div>
          <div class="card-desc">Applies WHO / US EPA / BIS IS 10500 regulatory thresholds. Enforces hard safety flags (Clarity &lt; 20% or TDS ≥ 1000 ppm) and computes weighted composite index.</div>
        </div>
        <div class="card">
          <div class="card-title">3. React Dashboard (:5173)</div>
          <div class="card-desc">Polls latest scores every 2s with custom hooks. Dynamic sensor matrix, animated calculation terminal block, and SVG radial gauge.</div>
        </div>
        <div class="card">
          <div class="card-title">4. ESP32 Hardware Simulator</div>
          <div class="card-desc">Built-in simulator script simulates realistic ADC noise, water depletion, contamination events, and purification recovery cycles.</div>
        </div>
      </div>
    </div>

    <div id="slide2" class="slide">
      <span class="badge badge-amber">Hardware Wiring & Pinout</span>
      <h1>Connecting Your ESP32 to Sensors & Laptop</h1>
      <p>Connect your ESP32 via Micro-USB/USB-C to your laptop and wire the 4 standard sensor modules.</p>
      <div class="grid-box">
        <div class="card">
          <div class="card-title">TDS Meter Probe</div>
          <div class="card-desc">VCC → 3.3V / 5V | GND → GND<br>Signal → <span class="pin">GPIO 35</span> (ADC1)</div>
        </div>
        <div class="card">
          <div class="card-title">Turbidity Optical Sensor</div>
          <div class="card-desc">VCC → 5V | GND → GND<br>Analog Out → <span class="pin">GPIO 34</span> (ADC1)</div>
        </div>
        <div class="card">
          <div class="card-title">DS18B20 Temperature Probe</div>
          <div class="card-desc">VCC → 3.3V | GND → GND<br>Data → <span class="pin">GPIO 4</span> (4.7kΩ pull-up to 3.3V)</div>
        </div>
        <div class="card">
          <div class="card-title">HC-SR04 Ultrasonic Sensor</div>
          <div class="card-desc">VCC → 5V | GND → GND<br>Trig → <span class="pin">GPIO 5</span> | Echo → <span class="pin">GPIO 18</span></div>
        </div>
      </div>
      <div class="code-block">
        // Flash in Arduino IDE:<br>
        const char* ssid = "YOUR_WIFI";<br>
        const char* serverUrl = "http://&lt;LAPTOP_LAN_IP&gt;:3001/api/readings";
      </div>
    </div>

    <div id="slide3" class="slide">
      <span class="badge badge-green">Running the Project</span>
      <h1>3-Step Beginner Execution Pipeline</h1>
      <p>Get the backend, frontend, and hardware simulator running in under two minutes.</p>
      <div class="code-block">
        # 1. Start Backend API<br>
        cd backend && npm install && npm run start   # → http://localhost:3001<br><br>
        # 2. Start React Dashboard<br>
        cd frontend && npm install && npm run dev    # → http://localhost:5173<br><br>
        # 3. Stream Telemetry (Real ESP32 or Simulator)<br>
        node simulate_esp32.js                        # Simulates full water cycle
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(walkthroughHtml);

  // Slide 1
  console.log('Showing Slide 1: System Architecture...');
  await delay(5000);

  // Slide 2
  console.log('Showing Slide 2: Hardware Wiring & Pinout...');
  await page.evaluate(() => {
    document.getElementById('slide1').classList.remove('active');
    document.getElementById('slide2').classList.add('active');
  });
  await delay(5500);

  // Slide 3
  console.log('Showing Slide 3: Beginner Execution Pipeline...');
  await page.evaluate(() => {
    document.getElementById('slide2').classList.remove('active');
    document.getElementById('slide3').classList.add('active');
  });
  await delay(5000);

  // Part 2: Transition directly to the Live Interactive Dashboard
  console.log('Transitioning to Live Frontend Dashboard...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await delay(5000);

  // Hover over components
  const cards = await page.$$('.grid > div');
  if (cards.length > 0) {
    const box = await cards[0].boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
  }
  await delay(2000);

  const btn = await page.$('button');
  if (btn) {
    const btnBox = await btn.boundingBox();
    if (btnBox) {
      await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 15 });
      await delay(500);
      await btn.click();
    }
  }
  await delay(4000);

  // Finalize video
  console.log('Finalizing walkthrough video...');
  const videoPath = await page.video().path();
  await page.close();
  await context.close();
  await browser.close();

  const mp4Path = path.resolve(__dirname, 'walkthrough_guide.mp4');
  console.log(`Transcoding to MP4 (${mp4Path})...`);
  execSync(`/opt/homebrew/bin/ffmpeg -y -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart "${mp4Path}"`, {
    stdio: 'inherit',
  });

  console.log('Creating optimized preview animated GIF...');
  const gifPath = path.resolve(__dirname, 'demo_preview.gif');
  execSync(`/opt/homebrew/bin/ffmpeg -y -i "${path.resolve(__dirname, 'demo_pipeline.mp4')}" -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${gifPath}"`, {
    stdio: 'inherit',
  });

  console.log(`✅ Walkthrough video generated: ${mp4Path}`);
  console.log(`✅ Animated preview GIF generated: ${gifPath}`);
}

recordWalkthrough().catch((err) => {
  console.error('Walkthrough recording error:', err);
  process.exit(1);
});
