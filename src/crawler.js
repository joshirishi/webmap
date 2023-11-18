var express = require('express');
var app = express();
const fs = require('fs');
const del = require('del');
const util = require('util');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const JSON = require('circular-json');

const URL = process.env.URL || 'http://www.maitridesigns.com';
const SCREENSHOTS = true;
const DEPTH = parseInt(process.env.DEPTH) || 10;
const VIEWPORT = null;//SCREENSHOTS ? {width: 1028, height: 800, deviceScaleFactor: 2} : null;
var OUT_DIR = process.env.OUTDIR || `output/${slugify(URL)}`;
var SCREEN_SHOT_DIR = OUT_DIR;

const crawledPages = new Map();
const maxDepth = DEPTH; // Subpage depth to crawl site.

app.use(express.json())
app.use(express.urlencoded({extended: true}))

//Start the server on port 3030
app.listen(3030);

//Handle the request from UI

app.post('/', async function(req, res) {
    console.log(req.body); // the posted data
    var data = req.body;

    console.log(data.url);
    await StartCrawl(data.url);
});

async function StartCrawl(URLNew){
    OUT_DIR = `output/${slugify(URLNew)}`;
    SCREEN_SHOT_DIR = OUT_DIR + '/screenshots';
    console.log(OUT_DIR);
    console.log(SCREEN_SHOT_DIR);
    mkdirSync(OUT_DIR); // create output dir if it doesn't exist.
    await del([`${OUT_DIR}/*`]); // cleanup after last run.
    const browser = await puppeteer.launch({headless:true});
    const page = await browser.newPage();
    if (VIEWPORT) {
      await page.setViewport(VIEWPORT);
    }
    const index = 1;
    const root = {url : URLNew};
    await crawl(browser, root, index);
    await util.promisify(fs.writeFile)(`./${OUT_DIR}/crawl.json`, JSON.stringify(root, null, ' '));
    await browser.close();
    return;
}

function slugify(str) {
  return str.replace(/[\/:]/g, '_');
}

function mkdirSync(dirPath) {
  try {
    dirPath.split('/').reduce((parentPath, dirName) => {
      const currentPath = parentPath + dirName;
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
      return currentPath + '/';
    }, '');
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Finds all anchors on the page, inclusive of those within shadow roots.
 * Note: Intended to be run in the context of the page.
 * @param {boolean=} sameOrigin When true, only considers links from the same origin as the app.
 * @return {!Array<string>} List of anchor hrefs.
 */
function collectAllSameOriginAnchorsDeep(sameOrigin = true) {
  const allElements = [];

  const findAllElements = function(nodes) {
    for (let i = 0, el; el = nodes[i]; ++i) {
      allElements.push(el);
      // If the element has a shadow root, dig deeper.
      if (el.shadowRoot) {
        findAllElements(el.shadowRoot.querySelectorAll('*'));
      }
    }
  };

  findAllElements(document.querySelectorAll('*'));

  const filtered = allElements
    .filter(el => el.localName === 'a' && el.href) // element is an anchor with an href.
    .filter(el => el.href !== location.href) // link doesn't point to page's own URL.
    .filter(el => {
      if (sameOrigin) {
        return new URL(location).origin === new URL(el.href).origin;
      }
      return true;
    })
    .map(a => a.href);

  return Array.from(new Set(filtered));
}

function collectAllElementFromPage(){
	const allElements = [];
	const findAllElements = function(nodes) {
		for (let i = 0, e2; e2 = nodes[i]; ++i) {
			allElements.push(e2);
		}
	};
	findAllElements(document.querySelectorAll('*'));

  const elements = allElements.map(obj => {
    const container = {};
    container.name = obj.localName;
    container.id = obj.getAttribute('id');
    container.class = obj.getAttribute('class');
    return container;
  });
	return elements;
}


/**
 * Crawls a URL by visiting an url, then recursively visiting any child subpages.
 * @param {!Browser} browser
 * @param {{url: string, title: string, img?: string, children: !Array<!Object>}} page Current page.
 * @param {number=} depth Current subtree depth of crawl.
 */
async function crawl(browser, page, index, depth = 0) {
  if (depth > maxDepth) {
    return;
  }

  //If we've already crawled the URL, we know its children.
  if (crawledPages.has(page.url)) {
    console.log(`Reusing route: ${page.url}`);
    const item = crawledPages.get(page.url);
    page.index = index;
    page.path = item.path;
    page.title = item.title;
    return;
  } else {
    console.log(`Loading: ${page.url}`);

    const newPage = await browser.newPage();
    await newPage.goto(page.url, {waitUntil: 'networkidle2'});
  	await newPage.setJavaScriptEnabled(true);

    let anchors = await newPage.evaluate(collectAllSameOriginAnchorsDeep);
    anchors = anchors.filter(a => a !== URL) // link doesn't point to start url of crawl.

	  page.index = index;
    page.title = await newPage.evaluate('document.title');
	page.elements = await newPage.evaluate(collectAllElementFromPage);

    if (SCREENSHOTS) {
      let path = `./${SCREEN_SHOT_DIR}`;
      mkdirSync(path);
      path = path + '/' + index;
      mkdirSync(path);
      console.log('taking screenshot of page ' + path);
      path = path +`/img.png`;
      page.path = path;
      console.log(path);
      await newPage.screenshot({path: path, fullPage: true});
    }
    page.children = anchors.map(url => ({url}));
    crawledPages.set(page.url, page); // cache it.
    await newPage.close();
  }

  // Crawl subpages.
  let ii = 0;
  for (const childPage of page.children) 
  {
	ii = ii + 1;
    await crawl(browser, childPage, index + ii.toString(), depth + 1);
  }
}