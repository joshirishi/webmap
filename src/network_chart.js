// Function to normalize URLs for consistent comparison
function normalizeUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function calculateMissingLinks(processedData, originalWebMap) {
    let missingLinks = new Set();

    // Function to extract links from a hierarchical data structure
    function extractLinks(node, linksSet, weightsMap) {
        if (node.children) {
            node.children.forEach(child => {
                const link = normalizeUrl(node.url) + '->' + normalizeUrl(child.url);
                linksSet.add(link);
                weightsMap[link] = child.weight || 1; // Default weight to 1 if not provided
                extractLinks(child, linksSet, weightsMap);
            });
        }
    }

    let processedLinks = new Set();
    let originalLinks = new Set();
    let weightsMap = {}; // To store weights of links

    // Extract links from both processedData and originalWebMap
    extractLinks(processedData, processedLinks, weightsMap);

    console.log('Processed web map links:', Array.from(processedLinks));

    // Log the fetched original web map data
    console.log('Fetched original web map data:', originalWebMap);

    extractLinks(originalWebMap, originalLinks, {});

     // Log the original web map links
     console.log('Original web map links:', Array.from(originalLinks));


    // Find links in processedLinks not in originalLinks
    processedLinks.forEach(link => {
        if (!originalLinks.has(link)) {
            missingLinks.add(link);
        }
    });

     // Log the missing links
     console.log('Missing links:', Array.from(missingLinks));

    return { missingLinks, weightsMap, originalLinks };
}



// Function to determine the size of the node based on the weight (unique visitors)
function getNodeSize(weight) {
    // Example scaling function, you can adjust this as needed
    return Math.sqrt(weight) * 1000; // Adjust the multiplier to scale the size
}

function getTextSize(weight) {
    // Adjust text size based on weight
    return Math.sqrt(weight) * 200; // Adjust the multiplier to scale the text size
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
      //  const originalWebMap = await originalWebMapResponse.json();
        
    
    const rawData = await fetchData();
    console.log('Fetched raw data:', rawData);

    if (!rawData || !rawData.webMap) {
        console.error('Failed to fetch data or data is empty.');
        return;
    }
    
 
 
 // Assuming the original web map data is wrapped in an array and we want the first item
 const originalWebMap = rawData.webMap;

 // Log the corrected original web map data
 console.log('Corrected original web map data:', originalWebMap);

 // Extract webMap and backtracking data
 const { webMap, backtracking } = rawData;
 
 // Calculate missing links by comparing the finalData with the originalWebMap
 // Now passing the correct originalWebMap root node
 const { missingLinks, weightsMap, originalLinks } = calculateMissingLinks(webMap, webMap);

 // Log the original web map links after passing the correct data
 console.log('Original web map links after correction:', Array.from(originalLinks));

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
    .attr("stroke", d => {
        // Determine if the link is part of backtracking
        const linkKey = `${normalizeUrl(d.source.data.url)}->${normalizeUrl(d.target.data.url)}`;
        return missingLinks.has(linkKey) ? "red" : "black"; // Red for missing links
    })
    .attr("opacity", d => {
        const linkKey = `${normalizeUrl(d.source.data.url)}->${normalizeUrl(d.target.data.url)}`;
        return missingLinks.has(linkKey) ? 0.6 : 1; // 60% opacity for missing links
    })
    .attr("stroke-width", d => {
        // Here you might need to decide whether to use the source or target node's weight
        // This example uses the target node's weight
        return d.target.data.weight || 1; // Default to 1 if weight is undefined
    })
    .attr("stroke-dasharray", d => {
        const linkKey = `${normalizeUrl(d.source.data.url)}->${normalizeUrl(d.target.data.url)}`;
        return missingLinks.has(linkKey) ? "4,2" : ""; // Dashed style for missing links
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

// Define a base size for nodes and text
const baseNodeSize = 15; // Adjust this as necessary
const baseTextSize = 18; // Adjust this as necessary
const maxWeight = 100; // Set this to whatever the max weight for your dataset is

// Helper function to calculate node size based on weight
function calculateNodeSize(weight) {
    return baseNodeSize + (weight / maxWeight) * baseNodeSize;
}

// Helper function to calculate text size based on node size
function calculateTextSize(nodeSize) {
    return baseTextSize * (nodeSize / baseNodeSize);
}

   // Helper functions to calculate size
const maxNodeSize = 5000; // Maximum size for node rectangles
const maxTextSize = 16; // Maximum size for text

function calculateRectSize(weight) {
    // Normalize the weight value to your range here
    // This is an example normalization that assumes a max weight of 100
    return Math.min(weight / 2, maxNodeSize);
}

function calculateTextSize(weight) {
    // Normalize and ensure the text size is not larger than maxTextSize
    return Math.min(Math.sqrt(weight) * 2, maxTextSize);
}

// Modify your existing node.each function
node.each(function(d) {
    // Calculate node size
    const nodeWeight = d.data.weight || 1; // Default to 1 if weight is undefined
    const nodeSize = calculateNodeSize(nodeWeight);
    const textSize = calculateTextSize(nodeSize);

    const group = d3.select(this);

    // Append rectangle with increased size
    group.append("rect")
        .attr("width", nodeSize)
        .attr("height", nodeSize)
        .attr("fill", color(d))
        .attr("x", -nodeSize / 2)
        .attr("y", -nodeSize / 2);

    // Append text with increased size
    const formattedText = d.data.name.length > g ? d.data.name.substring(0, g) + "..." : d.data.name;

    group.append("text")
        .attr('font-family', 'Raleway', 'Helvetica Neue, Helvetica')
        .attr("font-size", textSize)
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("x", 0)
        .attr("y", textSize / 4)
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
