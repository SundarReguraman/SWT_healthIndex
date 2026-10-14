const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3001/api/readings';
const FRONTEND_URL = 'http://127.0.0.1:5173';
const OUTPUT_DIR = path.resolve(__dirname, 'demo_recordings');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function postReading(reading) {
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reading),
  });
  return res.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('🎬 Starting End-to-End Pipeline Demo Recording...');

  // 1. Post initial reading to ensure backend has data
  console.log('\n--- Scenario 1: Initial Baseline - Pure Municipal Drinking Water ---');
  await postReading({
    deviceId: 'tank-1',
    clarity: 96.0,
    tds: 185.0,
    temperature: 22.4,
    level: 90.0,
  });

  // 2. Launch Chrome via Playwright
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

  console.log(`Navigating to ${FRONTEND_URL}...`);
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

  // Let initial state render and terminal type out
  console.log('Rendering baseline healthy state (Score ~96, Green Circle)...');
  await delay(4500);

  // Smooth mouse movements across cards
  const cards = await page.$$('.grid > div');
  if (cards.length > 0) {
    const box0 = await cards[0].boundingBox();
    if (box0) await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2, { steps: 15 });
    await delay(800);
    const box1 = await cards[1].boundingBox();
    if (box1) await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 15 });
    await delay(800);
  }

  // Scenario 2: Normal Drawdown & mild temperature rise
  console.log('\n--- Scenario 2: Normal Usage Drawdown ---');
  await postReading({
    deviceId: 'tank-1',
    clarity: 89.0,
    tds: 235.0,
    temperature: 24.5,
    level: 68.0,
  });
  console.log('Waiting for frontend poll to reflect drawdown...');
  await delay(4000);

  // Scenario 3: CRITICAL UNSAFE TDS SURGE (>1000 ppm)
  console.log('\n--- Scenario 3: Contamination Event - TDS Spike (1160 ppm) ---');
  await postReading({
    deviceId: 'tank-1',
    clarity: 74.0,
    tds: 1160.0, // Triggers HARD FLAG
    temperature: 25.2,
    level: 64.0,
  });
  console.log('Waiting for frontend to display RED ALERT status & unsafe badge...');
  await delay(5000);

  // Hover over the flagged TDS card
  if (cards.length > 1) {
    const boxTds = await cards[1].boundingBox();
    if (boxTds) await page.mouse.move(boxTds.x + boxTds.width / 2, boxTds.y + boxTds.height / 2, { steps: 20 });
  }
  await delay(2000);

  // Scenario 4: Silt Ingress / Turbidity Event (<20% clarity)
  console.log('\n--- Scenario 4: Pipeline Silt Ingress - Turbidity Spike (Clarity 13.5%) ---');
  await postReading({
    deviceId: 'tank-1',
    clarity: 13.5, // Triggers HARD FLAG
    tds: 480.0,
    temperature: 23.0,
    level: 58.0,
  });
  console.log('Waiting for frontend to display Clarity Unsafe flag...');
  await delay(5000);

  // Hover over the flagged Clarity card
  if (cards.length > 0) {
    const boxClarity = await cards[0].boundingBox();
    if (boxClarity) await page.mouse.move(boxClarity.x + boxClarity.width / 2, boxClarity.y + boxClarity.height / 2, { steps: 20 });
  }
  await delay(2000);

  // Scenario 5: Recovery - Filtration backwash & Fresh Refill
  console.log('\n--- Scenario 5: Full Recovery - Filter Flush & Clean Refill ---');
  await postReading({
    deviceId: 'tank-1',
    clarity: 98.0,
    tds: 170.0,
    temperature: 21.5,
    level: 95.0,
  });
  console.log('Waiting for frontend to recover back to Green Safe State...');
  await delay(5000);

  // Scenario 6: User interaction - Generate PDF Report
  console.log('\n--- Scenario 6: User Clicks "Generate PDF Report" ---');
  const btn = await page.$('button');
  if (btn) {
    const btnBox = await btn.boundingBox();
    if (btnBox) {
      await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 25 });
      await delay(800);
      await btn.click();
      console.log('Clicked "Generate PDF report" button!');
    }
  }
  await delay(4500);

  // Close browser and finalize video
  console.log('\nClosing browser and saving video stream...');
  const videoPath = await page.video().path();
  await page.close();
  await context.close();
  await browser.close();

  console.log(`Raw video saved at: ${videoPath}`);

  // Convert webm to mp4 using system ffmpeg
  const mp4Path = path.resolve(__dirname, 'demo_pipeline.mp4');
  console.log(`Transcoding to MP4 (${mp4Path})...`);
  try {
    execSync(`/opt/homebrew/bin/ffmpeg -y -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart "${mp4Path}"`, {
      stdio: 'inherit',
    });
    console.log(`\n🎉 Success! High-quality MP4 demo video created: ${mp4Path}`);
  } catch (err) {
    console.error('Error during ffmpeg transcoding:', err.message);
  }
}

runDemo().catch((err) => {
  console.error('Demo run failed:', err);
  process.exit(1);
});
