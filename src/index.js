
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const maxDepth = 5; // Maximum number of links to scrape
const visitedUrls = new Set(); // Set of visited URLs
const batchSize = 3; // Number of URLs to scrape concurrently in each batch

process.setMaxListeners(0); // 0 means unlimited

// Scrape a batch of URLs concurrently
async function scrapeBatch(urls) {
    return await Promise.all(urls.map(url => scrapeWebMap(url)));
}

// Fetch visited URLs
if (fs.existsSync('visitedUrls.json')) {
    const urls = JSON.parse(fs.readFileSync('visitedUrls.json', 'utf-8'));
    for (let url of urls) {
        visitedUrls.add(url);
    }
}
// fetch stored URLs
async function fetchStoredUrls() {
    try {
        const response = await axios.get('http://localhost:8000/api/get-stored-urls');
        return new Set(response.data);
    } catch (error) {
        console.error('Error fetching stored URLs:', error);
        return new Set();
    }
}

// Remove URL from storage which has been visited but not scraped because of change by website
async function removeUrlFromStorage(url) {
    try {
        await axios.post('http://localhost:8000/api/remove-url', { url });
        console.log(`Removed ${url} from storage`);
    } catch (error) {
        console.error(`Error removing ${url} from storage:`, error);
    }
}

// Scrape a batch of URLs 
// Improved scrapeWebMap function
async function scrapeWebMap(url, targetURL, depth = 0) {
    if (depth > maxDepth || visitedUrls.has(url) || storedUrls.has(url)) {
        console.log('URL visited:', url);
        return [];
    }

    visitedUrls.add(url);

    const browser = await puppeteer.launch({
        headless: "new", // Change this to true for faster scraping without visual browser
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
    const page = await browser.newPage();

    //await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        await page.goto(url, { waitUntil: 'networkidle2',timeout:60000 });//60 sec timeout
        // rest of the scraping logic
    } catch (error) {
        console.error(`Failed to scrape ${url}:`, error.message);
    }

    const links = await page.$$eval('a', anchors => {
        return anchors.map(anchor => anchor.href);
    });

    await browser.close();

   // Improved URL filtering
   const uniqueLinks = [...new Set(links)].filter(link => 
    !link.startsWith('#') && 
    link.startsWith(targetURL) && 
    !visitedUrls.has(link) && 
    !storedUrls.has(link)
);

// Recursively scrape links
const children = await Promise.all(uniqueLinks.map(link => scrapeWebMap(link, targetURL, depth + 1)));


return [{
    name: url,
    value: "",
    children: children.length > 0 ? children : undefined
}];
}
/*
  // children of each link in the batch uniqueLinks
  let children = [];
  for (let i = 0; i < uniqueLinks.length; i += batchSize) {
      const batch = uniqueLinks.slice(i, i + batchSize);
      const batchResults = await scrapeBatch(batch);
      children = [...children, ...batchResults];
  }
    return [{
        name: url,
        value: "",
        children: children.length > 0 ? children : undefined
    }];
*/

// write # to stdout to separate batches
process.stdout.write('#');
async function storeWebMapData(data) {
    try {
        const response = await axios.post('http://localhost:8000/api/store-webmap', data);
        console.log('Data stored:', response.data);
    } catch (error) {
        console.error('Error storing web map data:', error);
    }
}


async function main() {
    const targetURL = process.argv[2] || 'https://maitridesigns.com';
    console.log('Starting web scraping...');
    storedUrls = await fetchStoredUrls();
    const webMapData = await scrapeWebMap(targetURL, targetURL);
    await storeWebMapData(webMapData[0]);
    console.log(webMapData);

    const urlsToRemove = [...storedUrls].filter(url => !visitedUrls.has(url));
    for (let url of urlsToRemove) {
        await removeUrlFromStorage(url);
    }

    console.log('Web scraping completed!');
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