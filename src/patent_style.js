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

    const width = 1160;
    const height = 700;
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            graphGroup.attr("transform", event.transform);
        }))
        .append("g");

    const graphGroup = svg.append("g");
    
    const simulation = d3.forceSimulation(graphData.nodes)
    .force("link", d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(100) // Increase this value to spread out the nodes more
    )
    .force("charge", d3.forceManyBody().strength(-400)) // Increase the magnitude of the negative value to increase repulsion
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => 20)); // Adjust the radius for collision detection


    // Define the arrowheads with no fill for the marker itself
    svg.append("defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
    .enter().append("marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)   // Must be tuned
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("stroke", "none"); // No fill for the path inside the marker


    
// Arrow color and opacity
const arrowColor = "grey";
const arrowOpacity = 0.6;

// Create the links as paths and set the stroke without a fill
    const link = graphGroup.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(graphData.links)
        .enter().append("path")
        .attr("stroke", "grey")  // Set the stroke to grey
        .attr("stroke-opacity", 0.6) // Set the opacity to 0.6
        .attr("stroke-width", 2)
        .attr("fill", "none") // No fill for the path
        .attr("marker-end", "url(#end)");
 
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
       // d.fx = null;
       // d.fy = null;
    }

    // Adjust the simulation's tick event handler
simulation.on("tick", () => {
    // Draw the links as curved paths
    link.attr("d", d => {
        const dx = d.target.x - d.source.x,
              dy = d.target.y - d.source.y,
              dr = Math.sqrt(dx * dx + dy * dy) * 2; // Control the amount of curvature
        // Use the 'A' command for a curved path
        return `M ${d.source.x} ${d.source.y} A ${dr} ${dr} 0 0,1 ${d.target.x} ${d.target.y}`;
    });

    node
    .attr("x", d => d.x - nodeWidth / 2)
    .attr("y", d => d.y - nodeHeight / 2);

text
    .attr("x", d => d.x - nodeWidth / 2 + 5)
    .attr("y", d => d.y + nodeHeight / 4);
});

const nodeWidth = 100;
const nodeHeight = 20;
const node = graphGroup.append("g")
    .attr("class", "nodes")
    .selectAll("rect")
    .data(graphData.nodes)
    .enter().append("rect")
    .attr("width", nodeWidth)
    .attr("height", nodeHeight)
    .attr("fill", "blue") // Set the fill to teal color
    .attr("stroke", "#333") // Optional: add a stroke to the rectangles
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

        // When appending text, handle the overflow and positioning
// Text inside the rectangles
const text = graphGroup.append("g")
    .attr("class", "texts")
    .selectAll("text")
    .data(graphData.nodes)
    .enter().append("text")
    .attr("x", d => d.x - nodeWidth / 2 + 5) // Position text inside the rectangle
    .attr("y", d => d.y + nodeHeight / 4) // Vertically center text within the rectangle
    .attr("fill", "white") // Set text color to contrast with teal background
    .text(d => d.name.length > 20 ? d.name.substring(0, 20) + "..." : d.name);

})();
