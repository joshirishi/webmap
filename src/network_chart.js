(async function() {
    const websiteId = 'cityaslabindia.org-username'; // Replace with your website identifier
    // Base color in HSL format
    const baseHue = 135; // Example: blue hue
    const baseSaturation = 63; // Percentage

    function shadeColorByDepth(depth) {
        // Adjust lightness based on depth (deeper nodes are darker)
        const lightness = 43 - depth ;
        return `hsl(${baseHue}, ${baseSaturation}%, ${lightness}%)`;
    }

    // Variables for customization
    let a = "#96A621"; // Normal node color
    let b = "#FF5733"; // Root node color
    let c = 20;        // Node size
    let d = "#999";    // Link color
    let e = 2;         // Link width
    let f = 5.2;       // Rectangle width multiplier
    let g = 20;        // Maximum text length

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
    const width = 1160;
    const height = 700;

    const root = d3.hierarchy(data); 
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
        .attr("stroke", d)
        .attr("stroke-width", e)
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");

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

    const nodeHoverTooltip = (d) => {
        return `
            <strong>URL:</strong> ${d.data.url}<br>
            <strong>Additional Info:</strong> Some info here
        `;
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
