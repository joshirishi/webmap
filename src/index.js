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
