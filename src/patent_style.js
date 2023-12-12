
async function fetchData() {
    try {
        const response = await fetch('http://localhost:8000/api/get-flat-webmap');
        const dataArrays = await response.json();
        const mergedData = {
            nodes: [],
            links: []
        };

        // Merging nodes and links
        dataArrays.forEach(dataObject => {
            mergedData.nodes.push(...dataObject.nodes);
            mergedData.links.push(...dataObject.links);
        });

        // Create a Set of node IDs for quick lookup
        const nodeIds = new Set(mergedData.nodes.map(node => node.id));

        // Filter out links that reference non-existent nodes
        mergedData.links = mergedData.links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target));

        createNetworkChart(mergedData);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function createNetworkChart(data) {
    const width = 800;
    const height = 600;
    const svg = d3.select('#network-chart').append('svg').attr('width', width).attr('height', height);

    // Create simulation with nodes and links
    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links
    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter().append("line");

    // Create nodes
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded));

    // Add hover text (URLs)
    node.append("title")
        .text(d => d.id);

            // Define arrow markers for graph links
    svg.append('svg:defs').selectAll('marker')
    .data(['end'])      // Different link/path types can be defined here
    .enter().append('svg:marker')    // This section adds in the arrows
    .attr('id', String)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 15)  // Controls the shift along the path
    .attr('refY', -1.5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5');

    // Add the links with arrows
    const path = svg.append('svg:g').selectAll('path')
    .data(force.links())
    .enter().append('svg:path')
    .attr('class', 'link')
    .attr('marker-end', 'url(#end)'); // Use the marker as defined above

    // Add node labels
    const labels = svg.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(force.nodes())
    .enter().append("text")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(d => d.id);  // The node data must have an 'id' property

    // Add forces to nodes and links
    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

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

    function dragStarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {
        if (!event.active) simulation.alphaTarget(0);
       // d.fx = null;
       // d.fy = null;
    }
}

fetchData();

/*
function processHierarchy(hierarchy) {
    let nodes = [], links = [];

    function traverse(node, parentId = null) {
        if (!node.url || !node.name) {
            console.error('Node with missing data:', node);
            return; // Skip nodes with missing data
        }

        nodes.push({ id: node.url, name: node.name });
        if (parentId) {
            links.push({ source: parentId, target: node.url });
        }
        if (Array.isArray(node.children)) {
            node.children.forEach(child => traverse(child, node.url));
        }
    }

    if (Array.isArray(hierarchy)) {
        hierarchy.forEach(rootNode => traverse(rootNode));
    } else {
        console.error('Hierarchy is not an array:', hierarchy);
    }

    return { nodes, links };
}

(async function() {
    const websiteId = 'journeys-unlimited.com-username'; // Replace with your website identifier

    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:8000/api/get-webmap?websiteId=${encodeURIComponent(websiteId)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    const rawData = await fetchData();

if (!rawData || !Array.isArray(rawData)) {
    console.error('Failed to fetch data or data structure is not as expected.');
    return;
}

// Initialize empty arrays for nodes and links
let allNodes = [], allLinks = [];

// Process each element in the rawData array
rawData.forEach(element => {
    if (element && element.children) {
        const graphData = processHierarchy(element);
        allNodes = allNodes.concat(graphData.nodes);
        allLinks = allLinks.concat(graphData.links);
        console.log('Created links:', graphData.links);

    }
});



// Combine all nodes and links
const combinedGraphData = {
    nodes: allNodes,
    links: allLinks
};

const graphData = processHierarchy(rawData);
console.log('Processed graph data:', graphData);

const width = 1160, height = 700;
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", (event) => {
        graphGroup.attr("transform", event.transform);
    }))
    .append("g");

const graphGroup = svg.append("g");

// Define arrow markers for graph links
svg.append("defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
    .enter().append("marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)   // Position of the arrowhead
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "grey");

const simulation = d3.forceSimulation(graphData.nodes)
    .force("link", d3.forceLink(graphData.links).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

// Create links as curved paths
const link = graphGroup.append("g")
    .attr("class", "links")
    .selectAll("path")
    .data(graphData.links)
    .enter().append("path")
    .attr("fill", "none")
    .attr("stroke", "grey")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#end)");

// Create nodes as rectangles
const nodeWidth = 120, nodeHeight = 30;
const node = graphGroup.append("g")
    .attr("class", "nodes")
    .selectAll("rect")
    .data(graphData.nodes)
    .enter().append("rect")
    .attr("width", nodeWidth)
    .attr("height", nodeHeight)
    .attr("fill", "blue")
    .attr("stroke", "#333")
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

// Add labels to the nodes
const text = graphGroup.append("g")
    .selectAll("text")
    .data(graphData.nodes)
    .enter().append("text")
    .text(d => d.name)
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("dx", 5)  // Set a margin from the left of the rectangle
    .attr("dy", 20) // Vertically center the text
    .attr("fill", "white");

// Update positions on each tick of the simulation
simulation.on("tick", () => {
    link.attr("d", d => {
        // Calculate a curve for each link
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M ${d.source.x} ${d.source.y} A ${dr} ${dr} 0 0,1 ${d.target.x} ${d.target.y}`;
    });

    node.attr("x", d => d.x - nodeWidth / 2)
        .attr("y", d => d.y - nodeHeight / 2);

    text.attr("x", d => d.x - nodeWidth / 2 + 10)
        .attr("y", d => d.y + nodeHeight / 4);
});

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
})();
*/