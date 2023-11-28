// dataProcessor.js

async function fetchData(websiteId) {
    try {
        const response = await fetch(`http://localhost:8000/api/combined-data?websiteId=${encodeURIComponent(websiteId)}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function extractLinksFromHierarchy(node, links = []) {
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
            links.push({ source: node.url, target: child.url });
            extractLinksFromHierarchy(child, links);
        });
    }
    return links;
}

function processUserMovements(webMapData, navigationPaths) {
    let links = extractLinksFromHierarchy(webMapData);
    let additionalLinks = [];
    let additionalNodes = [];

    // Collect all existing URLs from webMapData
    const existingUrls = getAllNodeUrls(webMapData);

    navigationPaths.forEach(path => {
        for (let i = 0; i < path.length - 1; i++) {
            let source = path[i];
            let target = path[i + 1];

            // If source or target URL doesn't exist in webMapData, create a new node
            [source, target].forEach(url => {
                if (!existingUrls.includes(url) && !additionalNodes.some(node => node.url === url)) {
                    additionalNodes.push(createNewNode(url));
                    existingUrls.push(url); // Add to existing URLs to avoid duplicates
                }
            });

            // Add link
            if (!linkExistsInHierarchy(source, target, links)) {
                additionalLinks.push({
                    source: source,
                    target: target,
                    // ... other link properties ...
                });
            }
        }
    });

    return { additionalLinks, additionalNodes };
}

function getAllNodeUrls(node, urls = []) {
    urls.push(node.url);
    if (node.children) {
        node.children.forEach(child => getAllNodeUrls(child, urls));
    }
    return urls;
}

function createNewNode(url) {
    return {
        url: url,
        // You can add other default properties for new nodes here
        name: url.split('/').pop(), // Example: use the last part of the URL as the name
        isNew: true // Flag to indicate that this is an additional node
    };
}

function linkExistsInHierarchy(sourceUrl, targetUrl, links) {
    return links.some(link => (link.source.url === sourceUrl && link.target.url === targetUrl) ||
                              (link.source.url === targetUrl && link.target.url === sourceUrl));
}

export { fetchData, processUserMovements };
