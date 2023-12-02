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

    svg.append("defs").selectAll("marker")
        .data(["end"])
        .enter().append("marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5");

    const link = graphGroup.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graphData.links)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#end)");

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
        d.fx = null;
        d.fy = null;
    }

    simulation.on("tick", () => {
        // Debugging: Log the position of the first link to see if it's updating
        if (graphData.links.length > 0) {
            console.log('First link position:', {
                sourceX: graphData.links[0].source.x,
                sourceY: graphData.links[0].source.y,
                targetX: graphData.links[0].target.x,
                targetY: graphData.links[0].target.y
            });
        }
    
        // Update the positions of the links and nodes
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });
})();
