const puppeteer = require('puppeteer-core');
const path = require('path');

const sampleSkins = [
  {
    id: 'sample-1',
    hero: 'Diaochan',
    name: 'Eternal Radiance',
    price: 1788,
    rarity: 'legend',
    priority: 'must',
    status: 'available',
    owned: false,
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    imageScale: 100,
    imagePosX: 50,
    imagePosY: 20,
    notes: 'Koleksi skin Legend paling favorit untuk midlane.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'sample-2',
    hero: 'Li Bai',
    name: 'Sword of Solitude',
    price: 888,
    rarity: 'epic',
    priority: 'high',
    status: 'available',
    owned: true,
    ownedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    imageScale: 105,
    imagePosX: 50,
    imagePosY: 15,
    notes: 'Sudah dibeli saat diskon minggu lalu.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString()
  },
  {
    id: 'sample-3',
    hero: 'Lubu',
    name: 'Demon King Wrath',
    price: 2888,
    rarity: 'flawless',
    priority: 'must',
    status: 'upcoming',
    owned: false,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    imageScale: 110,
    imagePosX: 50,
    imagePosY: 10,
    notes: 'Akan rilis pada event gacha akhir bulan.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
  },
  {
    id: 'sample-4',
    hero: 'Sun Shangxiang',
    name: 'Time Traveler Gunner',
    price: 0,
    rarity: 'epic_limited',
    priority: 'medium',
    status: 'available',
    owned: false,
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    imageScale: 100,
    imagePosX: 50,
    imagePosY: 25,
    notes: 'Reward event gratis klaim misi harian.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

async function runQA() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/index.html', { waitUntil: 'networkidle0' });

  // Inject sample data into IndexedDB and state
  await page.evaluate((items) => {
    window.wishlist = items;
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.renderItems === 'function') window.renderItems();
    if (typeof window.updateStats === 'function') window.updateStats();
  }, sampleSkins);

  await new Promise(r => setTimeout(r, 600));

  // 1. Dark Mode Poster View (scrolled to show cards)
  await page.evaluate(() => window.scrollTo(0, 320));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'qa_1_dark_poster.png' });
  console.log('Saved qa_1_dark_poster.png');

  // 2. Open 3-dot context menu on first card
  await page.evaluate(() => {
    const trigger = document.querySelector('.skin-card .card-menu-trigger');
    if (trigger) {
      trigger.scrollIntoView({ block: 'center' });
      trigger.click();
    }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: 'qa_2_context_menu.png' });
  console.log('Saved qa_2_context_menu.png');

  // Close context menu
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 200));

  // 2b. Open Add Modal & Crop Studio
  await page.evaluate(() => {
    window.openAddModal();
    // Simulate setting an image to show crop framing controls
    window.handleUrlInput({ target: { value: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80' } });
    window.applyUrlImage();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'qa_2b_add_crop_modal.png' });
  console.log('Saved qa_2b_add_crop_modal.png');

  await page.evaluate(() => {
    window.closeModal();
  });
  await new Promise(r => setTimeout(r, 200));

  // 3. Open Detail Modal
  await page.evaluate(() => {
    window.openDetail('sample-1');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'qa_3_detail_modal.png' });
  console.log('Saved qa_3_detail_modal.png');

  // Close detail modal
  await page.evaluate(() => {
    window.closeDetail();
  });
  await new Promise(r => setTimeout(r, 200));

  // 4. Light Mode Poster View
  await page.evaluate(() => {
    window.applyScheme('light');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'qa_4_light_poster.png' });
  console.log('Saved qa_4_light_poster.png');

  // 5. Light Mode Detail Modal
  await page.evaluate(() => {
    window.openDetail('sample-1');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'qa_5_light_detail_modal.png' });
  console.log('Saved qa_5_light_detail_modal.png');

  await page.evaluate(() => {
    window.closeDetail();
  });
  await new Promise(r => setTimeout(r, 200));

  // 6. List Mode (Dark)
  await page.evaluate(() => {
    window.applyScheme('dark');
    window.setLayout('list');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'qa_6_list_mode.png' });
  console.log('Saved qa_6_list_mode.png');

  // 7. Mobile Viewport (Dark Poster)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluate(() => {
    window.setLayout('poster');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'qa_7_mobile_view.png' });
  console.log('Saved qa_7_mobile_view.png');

  // 8. Edit Skin with Crop Studio (Desktop Viewport)
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
  await page.evaluate(() => {
    window.editItem('sample-1');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'qa_8_crop_studio.png' });
  console.log('Saved qa_8_crop_studio.png');

  await page.evaluate(() => {
    window.closeModal();
  });
  await new Promise(r => setTimeout(r, 200));

  await browser.close();
  console.log('Visual QA complete!');
}

runQA().catch(err => {
  console.error('Error during QA:', err);
  process.exit(1);
});
