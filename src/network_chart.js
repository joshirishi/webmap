

(async function() {
    const websiteId = 'maitridesigns.com-username'; // Replace with your website identifier

    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:8000/api/get-webmap?websiteId=${encodeURIComponent(websiteId)}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    const rawData = await fetchData();
    if (!rawData || rawData.length === 0) {
        console.error('Failed to fetch data or data is empty.');
        return;
    }

    const data = rawData[0];
    
    // Specify the chart’s dimensions.
    const width = 1160;
    const height = 700;

    // Compute the graph and start the force simulation.
    const root = d3.hierarchy(data); 
    const links = root.links();
    const nodes = root.descendants();
    

   
    const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-50)) // Reduced strength for less repulsion
    .force("center", d3.forceCenter(width / 2, height / 2)) // Centering force
    .force("collide", d3.forceCollide(d => Math.max(d.data.name.length * 1, 20))); // Collision based on rectangle size

    // Create the container SVG and group for holding the graph
        const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            graphGroup.attr("transform", event.transform);
        }))
        .append("g");

        const graphGroup = svg.append("g");

    // Append links to the graph group
        const link = graphGroup.append("g")
        .attr("stroke", "#999")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");
           
    // Append node groups (for both rectangle and text)
        const node = graphGroup.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 0)
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(drag(simulation))
        .on('dblclick', (event, d) => {
            window.open('about:blank', '_blank'); // Opens a new blank page
            // If you want to open a specific URL, replace 'about:blank' with the URL
        })
    
        .on('mouseover', (event, d) => {
            addTooltip(nodeHoverTooltip, d, event.pageX, event.pageY);
        });


    
    // Modify the color function to check the node's depth
    const color = (d) => {
        return d.depth === 1 ? "#FF5733" : "#96A621"; // Different color for root node
    };

    // Define the drag behavior
        function drag(simulation) {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart(); // Reduced alpha target for less bounciness
                d.fx = d.x; // Fixing node position on drag start
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x; // Fixing node position while dragging
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0); // Setting alpha target back to zero
                d.fx = d.x; // Node remains at the position where it was dragged
                d.fy = d.y;
            }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

    // Add the tooltip element to the graph
    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Define the tooltip functions
    const addTooltip = (hoverTooltip, d, x, y) => {
        div.transition()
            .duration(200)
            .style("opacity", 0.9);
        div.html(hoverTooltip(d))
            .style("left", `${x}px`)
            .style("top", `${y - 28}px`);
    };
    
    const removeTooltip = () => {
        div.transition()
            .duration(500)
            .style("opacity", 0);
    };

    // Define the nodeHoverTooltip function
    const nodeHoverTooltip = (d) => {
        return `
            <strong>URL:</strong> ${d.data.url}<br>
            <strong>Additional Info:</strong> Some info here
        `;
    };


// Function to format text and calculate width
function formatText(d) {
const maxLength = 20; // Maximum number of characters to display
let formattedText = d.data.name.length > maxLength ? d.data.name.substring(0, maxLength) + "..." : d.data.name;
let rectWidth = formattedText.length * 5.2; // Approximate width based on character count
return { formattedText, rectWidth };
}

// Append rectangles and text to the node groups
node.each(function(d) {
const { formattedText, rectWidth } = formatText(d);
const group = d3.select(this);

// Append rectangle
group.append("rect")
    .attr("width", rectWidth)
    .attr("height", 20)
    .attr("fill", color(d))
    .attr("x", -rectWidth / 2)
    .attr("y", -10);

// Append text
group.append("text")
    .attr('font-family', 'Raleway', 'Helvetica Neue, Helvetica')
    .attr("font-size", 10)
    .attr("fill", "white")
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .text(formattedText);
});

simulation.on("tick", () => {
// Update positions of links, rectangles, and text
link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

node
    .attr("transform", d => `translate(${d.x}, ${d.y})`);
});

    // Hide the tooltip when clicking anywhere else on the body
    d3.select("body").on("click", () => {
        removeTooltip();
    });
})();

