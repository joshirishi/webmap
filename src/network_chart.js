const targetUrl = 'https://maitridesigns.com';
const response = await fetch(`http://localhost:8000/api/get-webmap?url=${encodeURIComponent(targetUrl)}`);

(async function() {
    // Fetch data from the server
    async function fetchData() {
        try {
            const response = await fetch('http://localhost:8000/api/get-webmap');
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
}
