
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

    // function transformData(rawData) {
    //     const transformed = {
    //         name: "flare",
    //         children: []
    //     };

    //     if (rawData && Array.isArray(rawData.children)) {
            
    //         transformed.children = rawData.children.map(node => {
    //         return {
    //             name: node.name,
    //             children: node.children ? node.children.map(link => {
    //             return {
    //                 name: link.name,
    //                 value: 1 // or some other value you want to assign
    //             };
    //             }) : []
    //         };
    //         });
    //     }
    //     console.log(transformed)    
    //     return transformed;
    // }

    const data = rawData[0];
    

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
        .attr("r", d => d.children ? 7 : 5)
        .call(drag(simulation));

    //Adds tooltip to circles
    node.append("title")
        .text(d => d.data.name)

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
