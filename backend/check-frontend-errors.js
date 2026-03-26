import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.log(`[BROWSER ERROR] ${error.message}`);
    });

    try {
        console.log('Navigating to http://localhost:5173/provider/1...');
        // Give it up to 15 seconds to load
        await page.goto('http://localhost:5173/provider/1', { waitUntil: 'networkidle2', timeout: 15000 });
        console.log('Page loaded.');
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log('Navigation timed out, but we might still have caught some console errors.');
        } else {
            console.log('Navigation failed:', error);
        }
    }

    await browser.close();
})();
