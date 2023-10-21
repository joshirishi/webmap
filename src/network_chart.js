const targetUrl = 'https://maitridesigns.com';

(async function() {
    // Fetch data from the server
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

    const width = 1920;
    const height = 1080;

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

        //force simulation
        const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(100)) // Increase the distance to make linked nodes farther apart
        .force("charge", d3.forceManyBody().strength(-1000)) // Make the charge more negative to repel nodes more strongly
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2);

    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 25)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const nodeText = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .text(d => d.title)
        .attr("font-size", "10px")
        .attr("text-anchor", "middle");

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

        nodeText
            .attr("x", d => d.x)
            .attr("y", d => d.y + 15);
    }

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

function transformData(data) {
    let nodes = [];
    let links = [];
    let nodesMap = {};

    data.forEach(item => {
        let title = item.url.split('/').filter(Boolean).pop(); // Extract the last segment of the URL
        nodes.push({ id: item.url, title: title });
        nodesMap[item.url] = { id: item.url, title: title };

        item.links.forEach(link => {
            let linkTitle = link.split('/').filter(Boolean).pop(); // Extract the last segment of the link URL
            if (!nodesMap[link]) {
                nodes.push({ id: link, title: linkTitle });
                nodesMap[link] = { id: link, title: linkTitle };
            }
            links.push({ source: item.url, target: link });
        });
    });

    // Remove duplicate nodes
    nodes = Object.values(nodesMap);

    return { nodes, links };
}