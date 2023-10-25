const DEFAULT_URL = 'https://maitridesigns.com';  // Define a default URL at the top of your script
async function fetchData() {
    try {
        const response = await fetch('http://localhost:8000/api/get-webmap');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching web map data:", error);
    }
}

function renderNetworkChart(data) {
    const width = 800;
    const height = 600;

    const svg = d3.select("#network-chart")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);

    const root = d3.hierarchy(data);
    const links = root.links();
    const nodes = root.descendants();

    const simulation = d3.forceSimulation(nodes)
                         .force("link", d3.forceLink(links).id(d => d.id).distance(50))
                         .force("charge", d3.forceManyBody().strength(-50))
                         .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
                    .attr("stroke", "#999")
                    .attr("stroke-opacity", 0.6)
                    .selectAll("line")
                    .data(links)
                    .join("line");

    const node = svg.append("g")
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 1.5)
                    .selectAll("circle")
                    .data(nodes)
                    .join("circle")
                    .attr("r", 5)
                    .attr("fill", "blue")
                    .call(d3.drag()
                          .on("start", dragstarted)
                          .on("drag", dragged)
                          .on("end", dragended))
                    .on("click", nodeClicked);

    node.append("title")
        .text(d => d.data.id);

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    function nodeClicked(event, d) {
        // Use the node's URL if it exists, otherwise use the default URL
        const urlToScrape = d.data.id || DEFAULT_URL;
        triggerScraper(urlToScrape);
    }
}

async function triggerScraper(url) {
    try {
        const response = await fetch(`http://localhost:8000/api/trigger-scraper?url=${url}`);
        const data = await response.json();
        console.log("Scraper response:", data);
    } catch (error) {
        console.error("Error triggering the scraper:", error);
    }
}

async function init() {
    const webMapData = await fetchData();
    if (webMapData && webMapData.length > 0) {
        renderNetworkChart(webMapData[0]); // Assuming the first item is the root node
    } else {
        console.error("Failed to fetch web map data or data structure is incorrect.");
    }
}

init();


/*
((async function() {
    const targetUrl = 'https://maitridesigns.com';

    async function fetchData() {
        const response = await fetch("http://localhost:8000/api/get-webmap");

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const webMapData = await response.json();

        console.log("Server Response:", webMapData);

        if (!Array.isArray(webMapData)) {
            throw new Error("Data is not in the expected format");
        }

        return webMapData;
    }

    const rawData = await fetchData();

    if (!rawData || rawData.length === 0) {
        console.error('Failed to fetch data.');
        return;
    }
    console.log("Raw Data:", rawData);

    const data = transformData(rawData[0]); // Assuming you want the first item from the array
    console.log("Transformed Data:", data);

    const width = 928;
    const height = 600;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const links = data.links.map(d => ({...d}));
    const nodes = data.nodes.map(d => ({...d}));

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", draw);

    const canvas = d3.select("body").append("canvas")
        .attr("width", width)
        .attr("height", height)
        .node();

    const context = canvas.getContext("2d");

    function draw() {
        context.clearRect(0, 0, width, height);
        context.save();
        context.globalAlpha = 0.6;
        context.strokeStyle = "#999";
        context.beginPath();        
        links.forEach(drawLink);
        context.stroke();
        context.restore();

        context.save();
        nodes.forEach(node => {
            context.beginPath();
            drawNode(node);
            context.fillStyle = color(node.group);
            context.strokeStyle = "#fff";
            context.fill();
            context.stroke();
        });
        context.restore();
    }

    function drawLink(d) {
        context.moveTo(d.source.x, d.source.y);
        context.lineTo(d.target.x, d.target.y);
    }

    function drawNode(d) {
        context.moveTo(d.x + 5, d.y);
        context.arc(d.x, d.y, 5, 0, 2 * Math.PI);
    }

    d3.select(canvas)
        .call(d3.drag()
            .subject(event => {
                const [px, py] = d3.pointer(event, canvas);
                return d3.least(nodes, ({x, y}) => {
                    const dist2 = (x - px) ** 2 + (y - py) ** 2;
                    if (dist2 < 400) return dist2;
                });
            })
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    function transformData(data, parentId = null) {
        let nodes = [];
        let links = [];
    
        const nodeId = data.url;
        nodes.push({ id: nodeId, title: data.title });
    
        if (parentId) {
            links.push({ source: parentId, target: nodeId });
        }
    
        // Check if data.links is defined and is an array
        if (data.links && Array.isArray(data.links)) {
            data.links.forEach(child => {
                const childData = transformData(child, nodeId);
                nodes = nodes.concat(childData.nodes);
                links = links.concat(childData.links);
            });
        }
    
        return { nodes, links };
    }
})());
    


*/

        /*function transformDataToHierarchy(data) {
        let hierarchicalData = [];

        data.forEach(item => {
            hierarchicalData.push({
                id: item.url,
                parentId: getParentId(item.url),
                name: extractName(item.url)
            });
            item.links.forEach(link => {
                hierarchicalData.push({
                    id: link,
                    parentId: item.url,
                    name: extractName(link)
                });
            });
        });

        return hierarchicalData;
    }

    function extractName(url) {
        const parts = url.replace('https://maitridesigns.com/', '').split('/');
        return parts[parts.length - 1] || 'maitridesigns.com';
    }

    function getParentId(url) {
        const parts = url.replace('https://maitridesigns.com/', '').split('/');
        parts.pop();
        return parts.length ? `https://maitridesigns.com/${parts.join('/')}` : null;
    }
})();*/

/*
(async function() {
    const targetUrl = 'https://maitridesigns.com';

    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:8000/api/get-webmap?url=${encodeURIComponent(targetUrl)}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    const data = await fetchData();

    console.log("Fetched data:", data);

    if (!data) {
        console.error('Failed to fetch data.');
        return;
    }

    const { nodes, links } = transformData(data);

    console.log("Transformed nodes:", nodes);
    console.log("Transformed links:", links);

    // Set up the SVG canvas dimensions
    const width = 800;
    const height = 600;

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a force simulation
    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links (edges)
    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2);

    // Create nodes
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 5)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add tick instructions
    simulation
        .nodes(nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(links);

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    // Drag functions
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    function transformData(data) {
        let nodes = [];
        let links = [];

        data.forEach(item => {
            nodes.push({ id: item.url });
            item.links.forEach(link => {
                nodes.push({ id: link });
                links.push({ source: item.url, target: link });
            });
        });

        nodes = [...new Set(nodes.map(node => node.id))].map(id => ({ id }));

        return { nodes, links };
    }
})();

*/
/*
const targetUrl = 'https://maitridesigns.com';

const response = await fetch(`http://localhost:8000/api/get-webmap?url=${encodeURIComponent(targetUrl)}`);

(async function() {
   // Modified Fetch data from the server
async function fetchData() {
    try {
        const response = await fetch(`http://localhost:8000/api/get-webmap?url=${encodeURIComponent(targetUrl)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}


    const data = await fetchData();

    console.log("Fetched data:", data);  // Debugging step 1

    if (!data) {
        console.error('Failed to fetch data.');
        return;
    }

    const { nodes, links } = transformData(data);

    console.log("Transformed nodes:", nodes);  // Debugging step 2
    console.log("Transformed links:", links);  // Debugging step 2

    // Set up the SVG canvas dimensions
    const width = 800;
    const height = 600;

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a force simulation
    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links (edges)
    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2);  // Set a constant stroke width

    // Create nodes
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 5)  // Radius of the circle
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add tick instructions
    simulation
        .nodes(nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(links);

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    // Drag functions
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

})();

// Define the transformData function outside the async function
function transformData(data) {
    let nodes = [];
    let links = [];

    data.forEach(item => {
        // Add the main URL as a node
        nodes.push({ id: item.url });

        // Add each link as a node and create a link between the main URL and the link
        item.links.forEach(link => {
            nodes.push({ id: link });
            links.push({ source: item.url, target: link });
        });
    });

    // Remove duplicate nodes
    nodes = [...new Set(nodes.map(node => node.id))].map(id => ({ id }));

    return { nodes, links };
<<<<<<< Updated upstream
}*/


