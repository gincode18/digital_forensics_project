const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('./logger');

puppeteer.use(StealthPlugin());

class TwitterScraper {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      logger.info('Initializing Twitter scraper');
      try {
        this.browser = await puppeteer.launch({
          headless: "new",
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080'
          ],
          defaultViewport: {
            width: 1920,
            height: 1080
          }
        });
      } catch (error) {
        logger.error('Failed to initialize browser', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
    return this.browser;
  }

  async getNewPage() {
    try {
      const browser = await this.initialize();
      const page = await browser.newPage();
      
      // Set a more realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      
      // Set extra HTTP headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate'
      });

      // Enable request interception
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (
          request.resourceType() === 'image' ||
          request.resourceType() === 'stylesheet' ||
          request.resourceType() === 'font'
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Add waitForTimeout function to page
      page.waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      return page;
    } catch (error) {
      logger.error('Failed to create new page', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async waitForSelector(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, {
        timeout: timeout,
        visible: true
      });
      return true;
    } catch (error) {
      logger.warn(`Selector timeout: ${selector}`, {
        error: error.message
      });
      return false;
    }
  }

  async closePage(page) {
    if (page) {
      try {
        await page.close();
      } catch (error) {
        logger.error('Failed to close page', {
          error: error.message,
          stack: error.stack
        });
      }
    }
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
      } catch (error) {
        logger.error('Failed to close browser', {
          error: error.message,
          stack: error.stack
        });
      }
    }
  }
}

module.exports = new TwitterScraper();