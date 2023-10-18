const puppeteer = require('puppeteer');
const axios = require('axios');

// Function to introduce a delay (for rate limiting)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to scrape links from a given webpage
async function scrapeLinks(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const links = await page.$$eval('a', anchors => {
            return anchors.map(anchor => anchor.href);
        });

        await browser.close();
        return links;
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

        const links = await scrapeLinks(url);
        webMap[url] = links;

        process.stdout.write('#');

        // Use Promise.all() to handle multiple pages concurrently
        const promises = [];
        for (let link of links) {
            if (!webMap[link]) {
                promises.push(crawl(link, level + 1));
            }
        }
        await Promise.all(promises);
    }

    await crawl(startUrl, 1);
    console.log(`\nCrawling completed.`);
    return webMap;
}

buildWebMap('https://maitridesigns.com', 2).then(data => {
    axios.post('http://localhost:8000/api/store-webmap', data)
         .then(response => {
             console.log('Data sent to backend:', response.data);
         })
         .catch(error => {
             console.error('Error sending data to backend:', error);
         });
});


module.exports = buildWebMap;
