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
    // ... Additional logic for processing user movements
}

export { fetchData, processUserMovements };
