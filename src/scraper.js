const puppeteer = require('puppeteer');
const axios = require('axios');

// Configuration
const maxDepth = 2;
const targetUrl = 'https://journeys-unlimited.com'; // Replace with your target URL
const visitedUrls = new Set();
const concurrentLimit = 5; // Limit the number of concurrent page processing
let currentDepth = 0;
const websiteId = generateWebsiteId(targetUrl, 'username1'); // Replace 'username1' with your actual username

// Generate websiteId based on URL and username
function generateWebsiteId(url, username) {
    const domain = getDomainFromUrl(url);
    return `${domain}-${username}`;
}

// Extract domain from URL
function getDomainFromUrl(url) {
    const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    return matches ? matches[1].replace('www.', '') : '';
}

const targetDomain = getDomainFromUrl(targetUrl);
const nodes = new Map();
const links = new Set();
const processingQueue = [];

// Initialize Puppeteer with User-Agent
async function initBrowser() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    return browser;
}

function normalizeUrl(link) {
    const urlObj = new URL(link);
    return urlObj.origin + urlObj.pathname;
}

function isHtmlPage(url) {
    return !/\.(pdf|jpg|jpeg|png|gif|svg|js|css)$/i.test(url);
}

async function scrapeWebMap(currentUrl, depth, browser) {
    if (depth > maxDepth || visitedUrls.has(currentUrl) || processingQueue.length >= concurrentLimit) {
        return;
    }

    visitedUrls.add(currentUrl);
    processingQueue.push(currentUrl);
    console.log(`Scraping URL: ${currentUrl} at depth: ${depth}`);

    try {
        const page = await browser.newPage();
        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.error(e));
        const pageData = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
            return { links };
        });

        if (getDomainFromUrl(currentUrl) === targetDomain && !nodes.has(currentUrl)) {
            nodes.set(currentUrl, { id: normalizeUrl(currentUrl), group: depth });
        }

        for (const link of pageData.links) {
            const normalizedLink = normalizeUrl(link);
            if (isHtmlPage(normalizedLink) && getDomainFromUrl(normalizedLink) === targetDomain) {
                const linkKey = currentUrl + '|' + normalizedLink;
                if (!links.has(linkKey)) {
                    links.add(linkKey);
                    if (processingQueue.length < concurrentLimit) {
                        await scrapeWebMap(normalizedLink, depth + 1, browser);
                    }
                }
            }
        }

        await page.close();
    } catch (error) {
        console.error(`Error scraping ${currentUrl}:`, error);
    } finally {
        processingQueue.splice(processingQueue.indexOf(currentUrl), 1);
    }
}

async function storeWebMapData() {
    const data = {
        websiteId: websiteId,
        nodes: Array.from(nodes.values()),
        links: Array.from(links).map(link => {
            const [source, target] = link.split('|');
            return { source, target, value: 1 };
        })
    };

    console.log('Sending scraped data to database with websiteId:', websiteId);
    try {
        await axios.post('http://localhost:8000/api/store-flat-webmap', data);
        console.log('Flat web map data successfully stored');
    } catch (error) {
        console.error('Error storing flat web map data:', error);
    }
}

(async function main() {
    try {
        console.log('Starting web scraping process...');
        const browser = await initBrowser();
        await scrapeWebMap(targetUrl, 0, browser);
        await storeWebMapData();
        console.log('Web scraping process completed successfully.');
    } catch (error) {
        console.error('Error during web scraping:', error);
    } finally {
        if (browser) await browser.close();
    }
})();


/*
const puppeteer = require('puppeteer');
const axios = require('axios');

// Configuration
const maxDepth = 2;
const targetUrl = 'https://journeys-unlimited.com'; // Replace with your target URL
const visitedUrls = new Set();

// Generate websiteId based on URL and username
function generateWebsiteId(url, username) {
    const domain = getDomainFromUrl(url);
    return `${domain}-${username}`;
}

const websiteId = generateWebsiteId(targetUrl, 'username1'); // Replace 'username1' with your actual username

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
let browser; // Global browser instance




// User-Agent String for Puppeteer
const userAgentString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';

// Initialize Puppeteer with User-Agent
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true, // 'headless: "new"' is incorrect, should be 'true' or 'false'
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;

   // const page = await browser.newPage();
   // await page.setUserAgent(userAgentString);
  //  return { browser, page };
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
async function scrapeWebMap(currentUrl, depth, retryCount = 0, page) {
    if (depth > maxDepth || visitedUrls.has(currentUrl)) {
        return;
    }

    console.log(`Scraping URL: ${currentUrl}`);
    visitedUrls.add(currentUrl);
    const { browser} = await initBrowser();

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
/*
async function storeWebMapData() {
    console.log('Nodes:', JSON.stringify(Array.from(nodes.values())));
console.log('Links:', JSON.stringify(Array.from(links)));


    const data = {
        websiteId: websiteId,
        nodes: Array.from(nodes.values()),
        links: Array.from(links).map(link => {
            const [source, target] = link.split('|');
            return { source, target, value: 1 };
        })
    };

    console.log('Sending scraped data to database with websiteId:', websiteId);

    // Function to split data and send in smaller batches
    async function sendDataInBatches(data, batchSize) {
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            try {
                await axios.post('http://localhost:8000/api/store-flat-webmap', batch);
                console.log(`Batch ${i / batchSize} successfully stored`);
            } catch (error) {
                console.error('Error storing batch:', error);
            }
        }
    }

    const nodesArray = Array.from(nodes.values());
    const linksArray = Array.from(links).map(link => {
        const [source, target] = link.split('|');
        return { source, target, value: 1 };
    });

    console.log('Sending scraped nodes to database...');
    await sendDataInBatches(nodesArray, 50); // Adjust batch size as needed

    console.log('Sending scraped links to database...');
    await sendDataInBatches(linksArray, 50); // Adjust batch size as needed
}
*/


/*
async function storeWebMapData() {
    const data = {
        websiteId: websiteId,
        nodes: Array.from(nodes.values()),
        links: Array.from(links).map(link => {
            const [source, target] = link.split('|');
            return { source, target, value: 1 };
        })
    };

    console.log('Sending scraped data to database with websiteId:', websiteId);

    try {
        await axios.post('http://localhost:8000/api/store-flat-webmap', data);
        console.log('Flat web map data successfully stored');
    } catch (error) {
        console.error('Error storing flat web map data:', error);
    }
}
// Main execution
(async function main() {
    try {
        console.log('Starting web scraping process...');
        browser = await initBrowser(); // Initialize browser
        const page = await browser.newPage();
        await scrapeWebMap(targetUrl, 0, 0, page);
        await storeWebMapData();
        console.log('Web scraping process completed successfully.');
    } catch (error) {
        console.error('Error during web scraping:', error);
    } finally {
        if (browser) {
            await browser.close(); // Ensure browser is closed at the end
        }
    }
})();
*/
