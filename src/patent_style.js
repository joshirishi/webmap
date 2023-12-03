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
    .force("link", d3.forceLink(graphData.links).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

    // Define the arrowheads
    svg.append("defs").selectAll("marker")
        .data(["end"])
        .enter().append("marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15) // Position of the arrowhead
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "black");

    const link = graphGroup.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(graphData.links)
        .enter().append("path")
        .attr("stroke", "black")  // Ensure the stroke is a visible color
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#end)");



    const text = graphGroup.append("g")
        .attr("class", "texts")
        .selectAll("text")
        .data(graphData.nodes)
        .enter().append("text")
        .attr("dx", 12) // Offset from the node center
        .attr("dy", ".35em") // Vertical offset to align text
        .text(d => d.name); // Assuming each node data has a `name` property


    const node = graphGroup.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graphData.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

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
              dr = Math.sqrt(dx * dx + dy * dy) * 2; // Increase the 2 to make more curvature
        return `M ${d.source.x} ${d.source.y} A ${dr} ${dr} 0 0 1 ${d.target.x} ${d.target.y}`;
    });

    // Update node positions
    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    // Update text label positions
    text
        .attr("x", d => d.x + 10) // Offset the text a bit to the right of the node
        .attr("y", d => d.y);
});
})();
