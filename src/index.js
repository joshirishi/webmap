const puppeteer = require('puppeteer');
const axios = require('axios');

// Configuration
const maxDepth = 30;
const targetUrl = 'https://maitridesigns.com'; // Replace with your target URL
const visitedUrls = new Set();
const concurrentLimit = 0;
let currentDepth = 0;

// Function to extract the domain name from a URL
function getDomainFromUrl(url) {
    const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    return matches && matches[1].replace('www.', '');
  }
  
  // Function to generate the websiteId
  function generateWebsiteId(url, username) {
    const domain = getDomainFromUrl(url);
    return `${domain}-${username}`;
  }
  
  // Example usage
  const url = targetUrl; // This would be the user input in the future
  const username = "username"; // Replace 'username' with the actual username
  const websiteId = generateWebsiteId(url, username);
  
  console.log(websiteId); // Outputs: maitridesigns-username

// Initialize Puppeteer
async function initBrowser() {
    return puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}

// URL Normalization function
function normalizeUrl(link) {
    const urlObj = new URL(link);
    // Remove query parameters and fragment identifiers
    return urlObj.origin + urlObj.pathname;
}

// Function to check if URL is an HTML page (not PDF, image, JS, etc.)
function isHtmlPage(url) {
    return !/\.(pdf|jpg|jpeg|png|gif|svg|js|css)$/i.test(url);
}

// Extract and filter links based on their position on the page
async function extractTopLinks(page, threshold = 200) {
    return page.evaluate((threshold, baseDomain) => {
        const links = Array.from(document.querySelectorAll('a[href]'))
                        .map(a => {
                            const rect = a.getBoundingClientRect();
                            const href = new URL(a.href, document.baseURI).href;
                            return { href, top: rect.top };
                        })
                        .filter(item => item.href.startsWith(baseDomain) && item.top <= threshold && !/\.(pdf|jpg|jpeg|png|gif|svg|js|css)$/i.test(item.href));
        return links.map(item => item.href);
    }, threshold, targetUrl);
}

// Main scraping function
async function scrapeWebMap(currentUrl, depth) {
    console.log(`Starting scrape of: ${currentUrl} at depth: ${depth}`);
    if (depth > maxDepth || visitedUrls.has(currentUrl)) {
        console.log(`Skipping ${currentUrl} (already visited or max depth reached)`);
        return;
    }

    visitedUrls.add(currentUrl);

    try {
        const browser = await initBrowser();
        const page = await browser.newPage();
        await page.goto(currentUrl, { waitUntil: 'networkidle2' });

        const pageData = await page.evaluate(() => {
            const title = document.title;
            const links = Array.from(document.querySelectorAll('a[href]'))
                            .map(a => new URL(a.href, document.baseURI).href)
                            .filter(href => href.startsWith('http') && !href.includes('#') && !/\.(pdf|jpg|jpeg|png|gif|svg|js|css)$/i.test(href));
            return { title, links };
        });

        const children = [];
        for (const link of pageData.links.filter(link => link.startsWith(targetUrl) && isHtmlPage(link))) {
            const normalizedLink = normalizeUrl(link);
            if (!visitedUrls.has(normalizedLink) && normalizedLink !== currentUrl) {
                const childData = await scrapeWebMap(normalizedLink, depth + 1);
                if (childData) {
                    children.push(childData);
                }
            }
        }

        await browser.close();
        console.log(`Completed scrape of: ${currentUrl}`);
        return { websiteId, name: pageData.title || currentUrl, url: currentUrl, children };
    } catch (error) {
        console.error(`Error scraping ${currentUrl}:`, error);
        return null;
    }
}

// Store data
async function storeWebMapData(data) {
    console.log(`Sending scraped data to database for URL: ${data.url}`);
    try {
        await axios.post('http://localhost:8000/api/store-webmap', data);
        console.log(`Data successfully stored for URL: ${data.url}`);
    } catch (error) {
        console.error(`Error storing data for URL: ${data.url}:`, error);
    }
}

// Main execution
(async function main() {
    console.log('Starting web scraping process...');
    const browser = await initBrowser();
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Extract and scrape top links
    const topLinks = await extractTopLinks(page);
    for (const link of topLinks) {
        const scrapedData = await scrapeWebMap(link, currentDepth);
        if (scrapedData) {
            await storeWebMapData(scrapedData);
        }
    }

    // Additional scraping logic for the rest of the website can be added here

    await browser.close();
    console.log('Web scraping process completed successfully.');
})();


/*
const puppeteer = require('puppeteer');
const axios = require('axios');
const maxDepth = 3;
const visitedUrls = new Set();
const concurrentLimit = 5; // Limit the number of concurrent pages

const browserPromise = puppeteer.launch({
    headless: "new",
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
    ]
});

async function scrapeWebMap(url, depth = 0) {
    if (depth > maxDepth || visitedUrls.has(url)) {
        console.log('url visited:', url);
        return { name: url, value: "" };
    }

    visitedUrls.add(url);

    const browser = await browserPromise;
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Capture screenshot
        const screenshotBuffer = await page.screenshot({ fullPage: true });

        // Get <title> tag content
        const title = await page.evaluate(() => document.title);

        const links = await page.$$eval('a', anchors => {
            return anchors.map(anchor => anchor.href);
        });

        const filteredLinks = links.filter(link => {
            return !link.includes('#') && !link.startsWith('javascript:') && !link.startsWith('mailto:');
        });

        const uniqueLinks = [...new Set(filteredLinks)];
        const children = [];

        // Process a limited number of links concurrently
        const chunks = [];
        for (let i = 0; i < uniqueLinks.length; i += concurrentLimit) {
            chunks.push(uniqueLinks.slice(i, i + concurrentLimit));
        }

        for (let chunk of chunks) {
            const promises = chunk.map(link => {
                if (link.startsWith(url)) {
                    return scrapeWebMap(link, depth + 1).catch(error => {
                        console.error(`Error scraping ${link}:`, error);
                        return { name: link, value: "", error: true };
                    });
                }
            }).filter(Boolean);

            children.push(...(await Promise.all(promises)));
        }

        return {
            name: url,
            value: "",
            error: false,
            screenshot: screenshotBuffer,
            Title: title,
            children: children.length > 0 ? children : undefined
        };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return { name: url, value: "", error: true };
    } finally {
        await page.close(); // Ensure the page is closed in the finally block
    }
}

async function storeWebMapData(data) {
    try {
        const response = await axios.post('http://localhost:8000/api/store-webmap', data);
        console.log(`URL stored: ${data.name}`); // Log the URL being stored
        console.log('Data stored:', response.data); //log the data getting stored
    } catch (error) {
        console.error('Error storing web map data:', error);
    }
}

async function main() {
    console.log('Starting web scraping...');
    const targetURL = process.argv[2] || 'https://maitridesigns.com/'; // Get the URL from the command line argument or default to 'https://cityaslabindia.org'
    const webMapData = await scrapeWebMap(targetURL);
    await storeWebMapData(webMapData);
    console.log('Web scraping completed!');
    const browser = await browserPromise;
    await browser.close();
}

main();

*/