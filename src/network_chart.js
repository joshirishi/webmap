
(async function() {
    const targetUrl = 'https://journeys-unlimited.com';

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

    const rawData = await fetchData();
    if (!rawData) {
        console.error('Failed to fetch data.');
        return;
    }

    console.log("Raw Data:", rawData);  // Debugging step to inspect the structure of rawData

    const data = rawData[0];
    
    // Specify the chart’s dimensions.
    const width = 1920;
    const height = 1080;

    // Compute the graph and start the force simulation.
    const root = d3.hierarchy(data); 
    const links = root.links();
    const nodes = root.descendants();

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(1))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    // Create the container SVG.
    const svg = d3.select("body").append("svg")
                .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Append links.
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");

    // Define the color function
    const color = (d) => {
        // Define your color logic here
        return "#9D00A0";
    };

    // Define the drag function
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
        // Add the tooltip element to the graph
        let div = d3.select("#graph-tooltip");
        if (!div.node()) {
        const tooltipDiv = document.createElement("div");
        tooltipDiv.classList.add("tooltip"); // Adjust the class name as per your CSS
        tooltipDiv.style.opacity = "0";
        tooltipDiv.id = "graph-tooltip";
        document.body.appendChild(tooltipDiv);
        div = d3.select("#graph-tooltip");
        }

    // Define the tooltip functions
    const addTooltip = (hoverTooltip, d, x, y) => {
        div
            .transition()
            .duration(200)
            .style("opacity", 0.9);
        div
            .html(hoverTooltip(d))
            .style("left", `${x}px`)
            .style("top", `${y - 28}px`);
    };
    
    const removeTooltip = () => {
        div
           // .transition()
           // .duration(200)
            .style("opacity", 0);
    };

    // Define the nodeHoverTooltip function
const nodeHoverTooltip = (d) => {
    // Define your tooltip content logic here
    // Dummy KPIs and numbers
    const kpi1 = { name: "KPI 1", value: 123 };
    const kpi2 = { name: "KPI 2", value: 456 };

    return `
        <strong>URL:</strong> ${d.data.name}<br>
        <strong>${kpi1.name}:</strong> ${kpi1.value}<br>
        <strong>${kpi2.name}:</strong> ${kpi2.value}
    `;
};

    // Append nodes (circles).
    const node = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .on('click', (event, d) => {
            console.log("Node clicked", d); // Check if this logs when you click a node
            event.preventDefault();
            addTooltip(nodeHoverTooltip, d, event.pageX, event.pageY);
        })
        .attr("r", 12)
        .attr("fill", color)
        .call(drag(simulation));

        //helper function
function extractNodeNameFromUrl(url) {
    // Remove the "http://" or "https://" prefix
    const cleanedUrl = url.replace(/^https?:\/\//, '');
    // Split the URL by '/' and filter out any empty segments
    const segments = cleanedUrl.split('/').filter(Boolean);
    // Return the last segment as the node name
    return segments[segments.length - 1];
}

    // Append node names (text) beside each node.
    const nodeText = svg.append("g")
        .attr("font-family", "Arial")
        .attr("font-size", 10)
        .attr("fill", "black")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.data.name)
        .style("cursor", "pointer")
        .on("dblclick", (event, d) => {
            window.open(d.data.url, '_blank');
        });

    simulation.on("tick", () => {
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
            .attr("y", d => d.y);
    });

    // Hide the tooltip when clicking anywhere else on the body
    d3.select('body').on('click', () => {
        removeTooltip();
    });
})();


/* //working code but flat hierarchy
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

    const rawData = await fetchData();
    if (!rawData) {
        console.error('Failed to fetch data.');
        return;
    }

    console.log("Raw Data:", rawData);  // Debugging step to inspect the structure of rawData

    // Check if rawData is an array and has the expected structure
    if (!Array.isArray(rawData)) {
        console.error('Unexpected data format. Expected an array.');
        return;
    }

    // Convert rawData into a hierarchical structure
    const data = {
        name: targetUrl,
        children: rawData.map(item => ({
            name: item.url,
            children: (item.links && Array.isArray(item.links)) ? item.links.map(link => ({ name: link })) : []
        }))
    };

    // Specify the chart’s dimensions.
    const width = 928;
    const height = 600;

    // Compute the graph and start the force simulation.
    const root = d3.hierarchy(data);
    const links = root.links();
    const nodes = root.descendants();

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(50).strength(1))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    // Create the container SVG.
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Append links.
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");

    // Append nodes.
    const node = svg.append("g")
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("fill", d => d.children ? null : "#000")
        .attr("stroke", d => d.children ? null : "#fff")
        .attr("r", 3.5)
        .call(drag(simulation));

    node.append("title")
        .text(d => d.data.name);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    function drag(simulation) {
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

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    function transformToHierarchy(data) {
        const hierarchy = {
            name: "root",
            children: []
        };
    
        data.forEach(item => {
            const domain = new URL(item.url).hostname;
            let domainNode = hierarchy.children.find(d => d.name === domain);
    
            if (!domainNode) {
                domainNode = {
                    name: domain,
                    children: []
                };
                hierarchy.children.push(domainNode);
            }
    
            const urlNode = {
                name: item.url,
                children: item.links.map(link => ({ name: link }))
            };
    
            domainNode.children.push(urlNode);
        });
    
        return hierarchy;
    }
    
    const hierarchicalData = transformToHierarchy(rawData);

})();

*/
