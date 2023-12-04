const puppeteer = require('puppeteer');
const axios = require('axios');

// Configuration
const maxDepth = 3;
const targetUrl = 'https://journeys-unlimited.com'; // Replace with your target URL
const visitedUrls = new Set();
// Extract domain from URL
function getDomainFromUrl(url) {
    const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    return matches ? matches[1].replace('www.', '') : '';
}

// Define targetDomain using getDomainFromUrl
const targetDomain = getDomainFromUrl(targetUrl);



// Initialize Data Structures for Flat Dataset
const nodes = new Map(); // Using a Map to avoid duplicate nodes
const links = new Set(); // Using a Set to avoid duplicate links




// User-Agent String for Puppeteer
const userAgentString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';

// Initialize Puppeteer with User-Agent
async function initBrowser() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent(userAgentString);
    return { browser, page };
}

// URL Normalization function
function normalizeUrl(link) {
    const urlObj = new URL(link);
    return urlObj.origin + urlObj.pathname;
}

// Function to check if URL is an HTML page
function isHtmlPage(url) {
    return !/\.(pdf|jpg|jpeg|png|gif|svg|js|css)$/i.test(url);
}

// Main scraping function with domain check
async function scrapeWebMap(currentUrl, depth, retryCount = 0) {
    if (depth > maxDepth || visitedUrls.has(currentUrl)) {
        return;
    }

    console.log(`Scraping URL: ${currentUrl}`);
    visitedUrls.add(currentUrl);
    const { browser, page } = await initBrowser();

    try {
        await page.goto(currentUrl, { waitUntil: 'networkidle2' });
        const pageData = await page.evaluate(() => {
            // Extracting links from the page
            const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
            return { links };
        });

        if (getDomainFromUrl(currentUrl) === targetDomain) {
            if (!nodes.has(currentUrl)) {
                nodes.set(currentUrl, { id: normalizeUrl(currentUrl), group: depth });
                console.log(`Node added: ${currentUrl}`);
            }
        }

        for (const link of pageData.links) {
            const normalizedLink = normalizeUrl(link);
            if (isHtmlPage(normalizedLink) && getDomainFromUrl(normalizedLink) === targetDomain && !visitedUrls.has(normalizedLink)) {
                const linkKey = currentUrl + '|' + normalizedLink;
                if (!links.has(linkKey)) {
                    links.add(linkKey);
                    console.log(`Link added: ${currentUrl} to ${normalizedLink}`);
                    await scrapeWebMap(normalizedLink, depth + 1);
                }
            }
        }
    } catch (error) {
        console.error(`Error scraping ${currentUrl}:`, error);
        if (retryCount < 3) {
            console.log(`Retrying ${currentUrl} (Attempt ${retryCount + 1})`);
            await scrapeWebMap(currentUrl, depth, retryCount + 1);
        } else {
            console.error(`Failed to scrape ${currentUrl} after multiple attempts.`);
        }
    } finally {
        await browser.close();
    }
}

// Store data function
async function storeWebMapData() {
    const data = {
        nodes: Array.from(nodes.values()),
        links: Array.from(links).map(link => {
            const [source, target] = link.split('|');
            return { source, target, value: 1 };
        })
    };
    console.log('Sending scraped data to database...');
    try {
        await axios.post('http://localhost:8000/api/store-webmap', data);
        console.log('Data successfully stored');
    } catch (error) {
        console.error('Error storing data:', error);
    }
}

// Main execution
(async function main() {
    console.log('Starting web scraping process...');
    await scrapeWebMap(targetUrl, 0);
    await storeWebMapData();
    console.log('Web scraping process completed successfully.');
})();
