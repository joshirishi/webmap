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


/*
const puppeteer = require('puppeteer');
const axios = require('axios');

// Function to introduce a delay (for rate limiting)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to scrape links and titles from a given webpage
async function scrapeLinks(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const links = await page.$$eval('a', anchors => {
            return anchors.map(anchor => ({ href: anchor.href, title: anchor.textContent.trim() }))
                          .filter(link => link.href.startsWith('https://maitridesigns.com/'));  // Filter links to only include those within the domain
        });

        await browser.close();
        return links;
    } catch (error) {
        console.error(`Failed to scrape ${url}: ${error.message}`);
        await browser.close();
        return [];
    }
}

// Recursive function to build the web map in a hierarchical manner
async function buildWebMap(url, visited = new Set(), depth = 0, maxDepth = 2) {
    if (depth > maxDepth || visited.has(url)) return null;

    visited.add(url);

    const links = await scrapeLinks(url);
    let children = [];

    for (let linkObj of links) {
        const childData = await buildWebMap(linkObj.href, visited, depth + 1, maxDepth);
        if (childData) {
            children.push(childData);
        }
    }

    return {
        url: url,
        title: links.find(link => link.href === url)?.title || '',
        links: children
    };
}

buildWebMap('https://maitridesigns.com', new Set(), 0, 2).then(webMap => {
    // Send the hierarchical webMap to the backend
    axios.post('http://localhost:8000/api/store-webmap', webMap)
         .then(response => {
             console.log(`Data sent to backend:`, response.data);
         })
         .catch(error => {
             console.error(`Error sending data to backend:`, error);
         });
});

module.exports = buildWebMap;


*/
/* 
const puppeteer = require('puppeteer');
const axios = require('axios');

// Function to introduce a delay (for rate limiting)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to scrape links and their titles from a given webpage
async function scrapeLinks(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const data = await page.$$eval('a', anchors => {
            return anchors.map(anchor => ({
                href: anchor.href,
                title: anchor.innerText.trim()
            }));
        });

        await browser.close();
        return data;
    } catch (error) {
        console.error(`Failed to scrape ${url}: ${error.message}`);
        await browser.close();
        return [];
    }
}

// Function to build the web map
async function buildWebMap(startUrl, depth = 2) {
    let webMap = {};

    async function crawl(url, level) {
        if (level > depth) return;

        const data = await scrapeLinks(url);
        webMap[url] = data.map(linkObj => linkObj.href);  // Store only hrefs for compatibility with your backend

        process.stdout.write('#');

        // Use Promise.all() to handle multiple pages concurrently
        const promises = [];
        for (let linkObj of data) {
            if (!webMap[linkObj.href]) {
                promises.push(crawl(linkObj.href, level + 1));
            }
        }
        await Promise.all(promises);
    }

    await crawl(startUrl, 1);
    console.log(`\nCrawling completed.`);
    return webMap;
}

buildWebMap('https://maitridesigns.com', 2).then(webMap => {
    // Iterate over the webMap object and send each URL and its links to the backend
    for (let [url, links] of Object.entries(webMap)) {
        axios.post('http://localhost:8000/api/store-webmap', { url: url, links: links })
             .then(response => {
                 console.log(`Data for ${url} sent to backend:`, response.data);
             })
             .catch(error => {
                 console.error(`Error sending data for ${url} to backend:`, error);
             });
    }
});

module.exports = buildWebMap;

*/