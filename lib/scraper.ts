import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export async function scrapeWebsite(url: string): Promise<string | null> {
  // Try axios first (faster)
  try {
    console.log(`[Scraper] Attempting axios on: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const $ = cheerio.load(response.data);
    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    if (text.length > 300) {
      console.log(`[Scraper] ✅ Success via axios: ${text.length} chars`);
      return text;
    }
  } catch (error) {
    console.log(`[Scraper] Axios failed, trying Playwright...`);
  }

  // Fallback to Playwright for JS-heavy sites
  let browser = null;
  try {
    console.log(`[Scraper] Attempting Playwright on: ${url}`);
    
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set longer timeout for Playwright
    page.setDefaultTimeout(15000);
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait for body content to load
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    
    const text = await page.evaluate(() => {
      return document.body.innerText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000);
    });

    if (text && text.length > 300) {
      console.log(`[Scraper] ✅ Success via Playwright: ${text.length} chars`);
      return text;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Scraper] Playwright error: ${errorMsg}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  console.error(`[Scraper] ❌ Failed to scrape ${url}`);
  return null;
}

export async function extractDomain(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}
