// Ensure that dataProcessor.js is correctly referenced in your HTML and loaded before this script
import { fetchData, processUserMovements } from './dataProcessor.js'; // Uncomment this line if using modules

(async function() {
    const websiteId = 'example.com-username'; // Replace with your website identifier

    // Fetch and process the data
    const rawData = await fetchData(websiteId);
    if (!rawData || !rawData.webMap || rawData.webMap.length === 0) {
        console.error('Invalid or missing webMap data in rawData');
        return;
    }
    const webMap = rawData.webMap[0];
    const allLinks = processUserMovements(webMap, rawData.navigationPaths);

    // Visualization dimensions and setup
    const width = 1160;
    const height = 700;

    // Hierarchical data for D3
    const root = d3.hierarchy(webMap); // Create hierarchy from webMap
    const nodes = root.descendants(); // Get nodes from hierarchy
    const hierarchicalLinks = root.links(); // Links from hierarchy

    // Add unique identifiers to nodes if not already present
    nodes.forEach((node, index) => {
        node.id = node.id || `node-${index}`; // Assign unique id if not present
    });

    // Define the color function
    const color = d => `hsl(135, 63%, ${43 - d.depth}%)`;

    // Set up the force simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(hierarchicalLinks).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(d => Math.max(d.data.name.length * 1, 20)));

    // Create the SVG container
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            graphGroup.attr("transform", event.transform);
        }))
        .append("g");

    const graphGroup = svg.append("g");

    // Draw the links
    const link = graphGroup.append("g")
        .attr("stroke", "#999")
        .attr("stroke-width", 2)
        .selectAll("line")
        .data(hierarchicalLinks)
        .join("line");

    // Draw the nodes
    const node = graphGroup.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(drag(simulation));

    // Add tooltips, rectangles, and text for each node
    node.append("title").text(d => d.data.name);

    node.append("rect")
        .attr("width", d => d.data.name.length * 5.2)
        .attr("height", 20)
        .attr("fill", color)
        .attr("x", d => -d.data.name.length * 5.2 / 2)
        .attr("y", -10);

    node.append("text")
        .attr("font-family", "Raleway, Helvetica Neue, Helvetica")
        .attr("font-size", 10)
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .text(d => d.data.name);

    // Define the drag behavior
    function drag(simulation) {
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

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    // Update positions on simulation tick
    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
})();
