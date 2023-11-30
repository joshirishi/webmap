function calculateMissingLinks(processedData, originalWebMap) {
    let missingLinks = new Set();

    // Function to extract links from a hierarchical data structure
    function extractLinks(node, linksSet) {
        if (node.children) {
            node.children.forEach(child => {
                linksSet.add(node.url + '->' + child.url);
                extractLinks(child, linksSet);
            });
        }
    }

    let processedLinks = new Set();
    let originalLinks = new Set();

    // Extract links from both processedData and originalWebMap
    extractLinks(processedData, processedLinks);
    extractLinks(originalWebMap, originalLinks);

    // Find links in processedLinks not in originalLinks
    processedLinks.forEach(link => {
        if (!originalLinks.has(link)) {
            missingLinks.add(link);
        }
    });

    return missingLinks;
}

(async function() {
    const websiteId = 'example.com-username'; // Replace with your website identifier
    // Base color in HSL format
    const baseHue = 135; // Example: blue hue
    const baseSaturation = 63; // Percentage



    function shadeColorByDepth(depth) {
        // Adjust lightness based on depth (deeper nodes are darker)
        const lightness = 43 - depth*10;
        return `hsl(${baseHue}, ${baseSaturation}%, ${lightness}%)`;
    }

    // Variables for customization
    let a = "#96A621"; // Normal node color
    let b = "#FF5733"; // Root node color
    let c = 20;        // Node size
    let d = "#000000";    // Link color
    let e = 0.5;         // Link width
    let f = 5.2;       // Rectangle width multiplier
    let g = 20;        // Maximum text length

 
    async function fetchData() {
        try {
            const response = await fetch(`http://localhost:8000/api/get-final-data`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Assuming the response is an array and you want the first item
            return data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }
    // Fetch the original web map data
        const originalWebMapResponse = await fetch('http://localhost:8000/api/get-webmap?url=https://example.com-username');
        const originalWebMap = await originalWebMapResponse.json();

    // Process the final data to match the expected structure for d3.hierarchy
       // const processedData = processFinalData(finalData);

   // Calculate missing links by comparing the finalData with the originalWebMap
      //  const missingLinks = calculateMissingLinks(finalData, originalWebMap);


    
    const rawData = await fetchData();
    if (!rawData || !rawData.webMap) {
        console.error('Failed to fetch data or data is empty.');
        return;
    }
    

// Extract webMap and backtracking data
const { webMap, backtracking } = rawData;
 // Calculate missing links by comparing the finalData with the originalWebMap
    // Assuming that webMap is the processedData equivalent from finalDatas3
    const missingLinks = calculateMissingLinks(webMap, originalWebMap);

    const data = rawData[0];
    const width = 1160;
    const height = 700;

    const root = d3.hierarchy(webMap); 
    const links = root.links();
    const nodes = root.descendants();
     // Modify the color function to use the shadeColorByDepth function
     const color = (d) => {
        return shadeColorByDepth(d.depth);
    };

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(d => Math.max(d.data.name.length * 1, c)));

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            graphGroup.attr("transform", event.transform);
        }))
        .append("g");

    const graphGroup = svg.append("g");

    const link = graphGroup.append("g")
    .attr("stroke-opacity", 1)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "black") // Default color for all links
    .attr("stroke-width", d => {
        // Apply the weight for thickness. Ensure that 'weight' is a number.
        // Adjust the multiplier to get a visible difference in thickness.
        return d.target.data.weight ? d.target.data.weight * 2 : 1;
    })
    .attr("stroke-dasharray", d => {
        // If the link is missing, style it with a blue dashed line
        const linkKey = `${d.source.data.url}->${d.target.data.url}`;
        /*if (missingLinks.has(linkKey)) {
            return "4,2"; // Dashed style for missing links
        } else {
            return ""; // Solid line for normal links
        }*/
    })
    .attr("stroke", d => {
        // Change the color to blue if the link is missing
        const linkKey = `${d.source.data.url}->${d.target.data.url}`;
        if (missingLinks.has(linkKey)) {
            return "black"; // Blue color for missing links
        } else {
            return "red"; // Default color for normal links
        }
    });
    
    
    
    
    const node = graphGroup.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 0)
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(drag(simulation))
        .on('dblclick', (event, d) => {
            window.open('about:blank', '_blank');
        })
        .on('mouseover', (event, d) => {
            addTooltip(nodeHoverTooltip, d, event.pageX, event.pageY);
        });

 
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
            d.fx = d.x;
            d.fy = d.y;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

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

   
    function formatText(d) {
        let formattedText = d.data.name.length > g ? d.data.name.substring(0, g) + "..." : d.data.name;
        let rectWidth = formattedText.length * f;
        return { formattedText, rectWidth };
    }

    node.each(function(d) {
        const { formattedText, rectWidth } = formatText(d);
        const group = d3.select(this);
    
        group.append("rect")
            .attr("width", rectWidth)
            .attr("height", c)
            .attr("fill", color(d))
            .attr("x", -rectWidth / 2)
            .attr("y", -c / 2);
    
        group.append("text")
            .attr('font-family', 'Raleway', 'Helvetica Neue, Helvetica')
            .attr("font-size", 10)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(formattedText);
    });

    const nodeHoverTooltip = (d) => {
        // Include weight information in the tooltip
        const weight = d.data.weight ? `<strong>Weight:</strong> ${d.data.weight}<br>` : '';
        return `
            <strong>URL:</strong> ${d.data.url}<br>
            ${weight}
            <strong>Additional Info:</strong> Some info here
        `;
    };

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
    });

    d3.select("body").on("click", () => {
        removeTooltip();
    });
})();
