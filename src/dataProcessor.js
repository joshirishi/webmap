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

    // Implement logic to process user movements
    // Example: Create links based on navigation paths
    if (navigationPaths && Array.isArray(navigationPaths)) {
        navigationPaths.forEach(path => {
            for (let i = 0; i < path.length - 1; i++) {
                let source = path[i];
                let target = path[i + 1];
                // Add logic to avoid duplicates and ensure valid links
                if (!links.some(link => link.source === source && link.target === target)) {
                    additionalLinks.push({ source: source, target: target });
                }
            }
        });
    }

    return additionalLinks;
}

export { fetchData, processUserMovements };
