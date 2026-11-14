// ========================================
// ALGORITHM EXPLORER - DELIVERY ROUTE FINDER
// ========================================

let latestResults = {};

// ========================================
// 1. CREATE GRAPH
// ========================================

function createGraph(roadsInput) {
    const graph = {};

    const lines = roadsInput.split("\n");

    lines.forEach((line, index) => {
        if (line.trim() === "") {
            return;
        }

        const parts = line.split(",").map(item => item.trim());

        if (parts.length !== 3) {
            throw new Error(
                "Invalid road format on line " + (index + 1) +
                ". Use: A,B,4"
            );
        }

        const from = parts[0];
        const to = parts[1];
        const distance = Number(parts[2]);

        if (!from || !to) {
            throw new Error("Location names cannot be empty.");
        }

        if (from === to) {
            throw new Error("A road cannot connect a location to itself.");
        }

        if (!Number.isFinite(distance) || distance <= 0) {
            throw new Error(
                "Distance must be a positive number on line " + (index + 1)
            );
        }

        if (!graph[from]) {
            graph[from] = [];
        }

        if (!graph[to]) {
            graph[to] = [];
        }

        // Roads are treated as two-way connections.
        graph[from].push({
            node: to,
            distance: distance
        });

        graph[to].push({
            node: from,
            distance: distance
        });
    });

    if (Object.keys(graph).length === 0) {
        throw new Error("Please enter at least one road connection.");
    }

    return graph;
}


// ========================================
// HELPER: COMPARE TWO ROUTES
// ========================================

function betterRoute(first, second) {
    if (!first) {
        return second;
    }

    if (!second) {
        return first;
    }

    return second.distance < first.distance ? second : first;
}


// ========================================
// 2. BRUTE FORCE ALGORITHM
// ========================================

function bruteForce(graph, start, end) {
    let bestResult = null;
    let exploredRoutes = 0;

    function search(current, path, distance, visited) {

        // Destination reached
        if (current === end) {
            exploredRoutes++;

            const result = {
                path: [...path],
                distance: distance
            };

            bestResult = betterRoute(bestResult, result);
            return;
        }

        // Check every unvisited neighboring location
        for (const neighbor of graph[current]) {

            if (!visited.has(neighbor.node)) {

                visited.add(neighbor.node);
                path.push(neighbor.node);

                search(
                    neighbor.node,
                    path,
                    distance + neighbor.distance,
                    visited
                );

                // Backtracking
                path.pop();
                visited.delete(neighbor.node);
            }
        }
    }

    const visited = new Set([start]);

    search(start, [start], 0, visited);

    return {
        result: bestResult,
        details: [
            "Method: Checks all possible simple routes.",
            "Completed routes: " + exploredRoutes,
            "Uses recursion and backtracking.",
            "Selects the route with the minimum distance."
        ]
    };
}


// ========================================
// 3. GREEDY ALGORITHM
// ========================================

function greedy(graph, start, end) {
    let current = start;

    let path = [start];
    let totalDistance = 0;

    const visited = new Set([start]);
    let steps = 0;

    while (current !== end) {

        // Sort neighbors by smallest distance
        const neighbors = [...graph[current]].sort(
            (a, b) => a.distance - b.distance
        );

        let selected = null;

        // Select the nearest unvisited neighbor
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.node)) {
                selected = neighbor;
                break;
            }
        }

        // No available next location
        if (!selected) {
            return {
                result: null,
                details: [
                    "Method: Selects the smallest available edge.",
                    "Steps completed: " + steps,
                    "The algorithm could not reach the destination.",
                    "Greedy does not guarantee the shortest route."
                ]
            };
        }

        current = selected.node;

        visited.add(current);
        path.push(current);

        totalDistance += selected.distance;
        steps++;
    }

    return {
        result: {
            path: path,
            distance: totalDistance
        },
        details: [
            "Method: Selects the smallest available edge.",
            "Locations visited: " + path.join(" → "),
            "Steps completed: " + steps,
            "Greedy makes a locally best choice at each step."
        ]
    };
}


// ========================================
// 4. DYNAMIC PROGRAMMING ALGORITHM
// ========================================

function dynamicProgramming(graph, start, end) {

    const memo = new Map();
    let calculatedStates = 0;

    function solve(current, visited) {

        // Destination reached
        if (current === end) {
            return {
                path: [end],
                distance: 0
            };
        }

        // Create a unique key for the current state
        const visitedKey = [...visited].sort().join(",");

        const key = current + "|" + visitedKey;

        // Return stored result if already calculated
        if (memo.has(key)) {
            return memo.get(key);
        }

        calculatedStates++;

        let best = null;

        for (const neighbor of graph[current]) {

            if (!visited.has(neighbor.node)) {

                const newVisited = new Set(visited);
                newVisited.add(neighbor.node);

                const subResult = solve(
                    neighbor.node,
                    newVisited
                );

                if (subResult !== null) {

                    const candidate = {
                        path: [current, ...subResult.path],
                        distance: neighbor.distance + subResult.distance
                    };

                    best = betterRoute(best, candidate);
                }
            }
        }

        // Store the calculated result
        memo.set(key, best);

        return best;
    }

    const result = solve(start, new Set([start]));

    return {
        result: result,
        details: [
            "Method: Stores and reuses subproblem results.",
            "Calculated states: " + calculatedStates,
            "Memoized states: " + memo.size,
            "Avoids repeating already calculated states."
        ]
    };
}


// ========================================
// 5. DIVIDE AND CONQUER ALGORITHM
// ========================================

function divideAndConquer(graph, start, end) {

    let dividedGroups = 0;
    let exploredChoices = 0;

    function solve(current, path, distance, visited) {

        if (current === end) {
            return {
                path: [...path],
                distance: distance
            };
        }

        // Collect all available next choices
        const choices = graph[current].filter(
            neighbor => !visited.has(neighbor.node)
        );

        if (choices.length === 0) {
            return null;
        }

        // Divide the choices into two groups
        function solveGroups(group) {

            if (group.length === 0) {
                return null;
            }

            if (group.length === 1) {
                const neighbor = group[0];

                exploredChoices++;

                const newVisited = new Set(visited);
                newVisited.add(neighbor.node);

                return solve(
                    neighbor.node,
                    [...path, neighbor.node],
                    distance + neighbor.distance,
                    newVisited
                );
            }

            dividedGroups++;

            const middle = Math.floor(group.length / 2);

            const leftGroup = group.slice(0, middle);
            const rightGroup = group.slice(middle);

            // Solve both divided groups
            const leftResult = solveGroups(leftGroup);
            const rightResult = solveGroups(rightGroup);

            // Compare their results
            return betterRoute(leftResult, rightResult);
        }

        return solveGroups(choices);
    }

    const result = solve(
        start,
        [start],
        0,
        new Set([start])
    );

    return {
        result: result,
        details: [
            "Method: Divides available route choices into groups.",
            "Divided groups: " + dividedGroups,
            "Explored choices: " + exploredChoices,
            "Compares the results of both groups."
        ]
    };
}


// ========================================
// 6. DISPLAY INDIVIDUAL RESULT CARDS
// ========================================

function displayResult(name, output, time, className) {

    const results = document.getElementById("results");

    const card = document.createElement("div");
    card.className = "result-card " + className;

    const heading = document.createElement("h3");
    heading.textContent = name;
    card.appendChild(heading);

    if (output.result) {

        const status = document.createElement("p");
        status.className = "status-success";
        status.textContent = "Route Found!";
        card.appendChild(status);

        const routeBox = document.createElement("div");
        routeBox.className = "result-info";

        const routeLabel = document.createElement("span");
        routeLabel.textContent = "Best Route";

        const routeValue = document.createElement("p");
        routeValue.className = "route-output";
        routeValue.textContent = output.result.path.join(" → ");

        routeBox.appendChild(routeLabel);
        routeBox.appendChild(routeValue);
        card.appendChild(routeBox);

        const distanceBox = document.createElement("div");
        distanceBox.className = "result-info";

        const distanceLabel = document.createElement("span");
        distanceLabel.textContent = "Total Distance";

        const distanceValue = document.createElement("p");
        distanceValue.className = "distance-output";
        distanceValue.textContent = output.result.distance;

        distanceBox.appendChild(distanceLabel);
        distanceBox.appendChild(distanceValue);
        card.appendChild(distanceBox);

    } else {

        const status = document.createElement("p");
        status.className = "status-failed";
        status.textContent = "No route found!";
        card.appendChild(status);
    }

    // Execution time
    const timeBox = document.createElement("div");
    timeBox.className = "result-info";

    const timeLabel = document.createElement("span");
    timeLabel.textContent = "Execution Time";

    const timeValue = document.createElement("p");
    timeValue.textContent = time.toFixed(4) + " ms";

    timeBox.appendChild(timeLabel);
    timeBox.appendChild(timeValue);
    card.appendChild(timeBox);

    // Algorithm-specific details
    const detailsBox = document.createElement("div");
    detailsBox.className = "result-info";

    const detailsHeading = document.createElement("span");
    detailsHeading.textContent = "Algorithm Details";

    const detailsList = document.createElement("ul");
    detailsList.className = "result-details";

    output.details.forEach(detail => {
        const item = document.createElement("li");
        item.textContent = detail;
        detailsList.appendChild(item);
    });

    detailsBox.appendChild(detailsHeading);
    detailsBox.appendChild(detailsList);
    card.appendChild(detailsBox);

    results.appendChild(card);
}


// ========================================
// 7. RUN ALL FOUR ALGORITHMS
// ========================================

function runAllAlgorithms() {

    const start = document.getElementById("start").value.trim();
    const end = document.getElementById("end").value.trim();
    const roads = document.getElementById("roads").value.trim();

    const error = document.getElementById("error");
    const results = document.getElementById("results");

    error.textContent = "";
    results.innerHTML = "";

    latestResults = {};

    if (!start || !end || !roads) {
        error.textContent =
            "Please enter starting location, destination and road connections.";
        return;
    }

    if (start === end) {
        error.textContent =
            "Starting location and destination must be different.";
        return;
    }

    let graph;

    try {
        graph = createGraph(roads);
    } catch (problem) {
        error.textContent = problem.message;
        return;
    }

    if (!graph[start] || !graph[end]) {
        error.textContent =
            "Starting location or destination is missing from the road connections.";
        return;
    }

    // All algorithms use the same graph and input
    const algorithms = [
        {
            name: "Brute Force",
            className: "brute-card",
            run: bruteForce
        },
        {
            name: "Greedy",
            className: "greedy-card",
            run: greedy
        },
        {
            name: "Dynamic Programming",
            className: "dp-card",
            run: dynamicProgramming
        },
        {
            name: "Divide and Conquer",
            className: "divide-card",
            run: divideAndConquer
        }
    ];

    const times = [];

    algorithms.forEach(algorithm => {

        const startTime = performance.now();

        const output = algorithm.run(graph, start, end);

        const endTime = performance.now();

        const executionTime = endTime - startTime;

        times.push(executionTime);

        latestResults[algorithm.name] = {
            result: output.result,
            details: output.details,
            time: executionTime
        };

        displayResult(
            algorithm.name,
            output,
            executionTime,
            algorithm.className
        );
    });

    drawPerformanceChart(times);

    document.getElementById("chartMessage").textContent =
        "Performance comparison for the four algorithms.";
}


// ========================================
// 8. SHOW ALGORITHM EXPLANATIONS
// ========================================

function showAlgorithm(type) {

    const details = document.getElementById("algorithmDetails");

    const explanations = {

        brute: {
            title: "Brute Force Algorithm",
            description:
                "Brute Force checks all possible simple routes between the starting location and destination.",
            points: [
                "Explores every possible route.",
                "Uses recursion and backtracking.",
                "Compares route distances.",
                "Returns the shortest route if one exists.",
                "Can take a long time for large road networks."
            ]
        },

        greedy: {
            title: "Greedy Algorithm",
            description:
                "Greedy selects the smallest available road distance at each step.",
            points: [
                "Makes a locally best choice.",
                "Moves to the nearest unvisited location.",
                "Repeats until it reaches the destination.",
                "It is usually fast.",
                "It does not always guarantee the globally shortest route."
            ]
        },

        dp: {
            title: "Dynamic Programming",
            description:
                "Dynamic Programming solves smaller subproblems and stores their results to avoid repeated calculations.",
            points: [
                "Uses recursion and memoization.",
                "Stores previously calculated states.",
                "Reuses stored results.",
                "Finds the shortest simple route in this implementation.",
                "Requires more memory for larger problems."
            ]
        },

        divide: {
            title: "Divide and Conquer Algorithm",
            description:
                "This implementation divides the available route choices into smaller groups, solves each group recursively and compares their results.",
            points: [
                "Divides available choices into two groups.",
                "Solves each group recursively.",
                "Compares the results of both groups.",
                "Combines the best result.",
                "Can still require exponential work because it explores simple routes."
            ]
        }
    };

    const selected = explanations[type];

    if (!selected) {
        return;
    }

    details.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = selected.title;

    const description = document.createElement("p");
    description.textContent = selected.description;

    const list = document.createElement("ul");

    selected.points.forEach(point => {
        const item = document.createElement("li");
        item.textContent = point;
        list.appendChild(item);
    });

    details.appendChild(heading);
    details.appendChild(description);
    details.appendChild(list);

    // Show the result for this algorithm if it has been run
    const names = {
        brute: "Brute Force",
        greedy: "Greedy",
        dp: "Dynamic Programming",
        divide: "Divide and Conquer"
    };

    const saved = latestResults[names[type]];

    if (saved) {

        const resultText = document.createElement("p");

        if (saved.result) {
            resultText.textContent =
                "Current route: " +
                saved.result.path.join(" → ") +
                " | Distance: " +
                saved.result.distance +
                " | Time: " +
                saved.time.toFixed(4) + " ms";
        } else {
            resultText.textContent =
                "Current result: No route found.";
        }

        details.appendChild(resultText);
    }
}


// ========================================
// 9. PERFORMANCE COMPARISON CHART
// ========================================

function drawPerformanceChart(times) {

    const canvas = document.getElementById("performanceChart");
    const context = canvas.getContext("2d");

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    context.setTransform(
        pixelRatio, 0, 0, pixelRatio, 0, 0
    );

    context.clearRect(0, 0, width, height);

    const names = [
        "Brute Force",
        "Greedy",
        "Dynamic Programming",
        "Divide and Conquer"
    ];

    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 65;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxTime = Math.max(...times, 0.001);
    const barWidth = chartWidth / 6;

    // Draw vertical axis
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(paddingLeft, paddingTop);
    context.lineTo(paddingLeft, height - paddingBottom);
    context.lineTo(width - paddingRight, height - paddingBottom);
    context.stroke();

    // Draw horizontal grid lines
    context.font = "11px Arial";
    context.fillStyle = "#94a3b8";

    for (let i = 0; i <= 4; i++) {

        const y = paddingTop + (chartHeight / 4) * i;

        const value = maxTime * (1 - i / 4);

        context.strokeStyle = "#334155";
        context.beginPath();
        context.moveTo(paddingLeft, y);
        context.lineTo(width - paddingRight, y);
        context.stroke();

        context.textAlign = "right";
        context.fillText(value.toFixed(3), paddingLeft - 8, y + 4);
    }

    const colors = [
        "#f97316",
        "#22c55e",
        "#3b82f6",
        "#a78bfa"
    ];

    // Draw bars
    times.forEach((time, index) => {

        const x = paddingLeft +
            (index * 2 + 0.7) * barWidth;

        const barHeight = (time / maxTime) * chartHeight;

        const y = height - paddingBottom - barHeight;

        context.fillStyle = colors[index];

        context.fillRect(
            x,
            y,
            barWidth,
            Math.max(barHeight, 2)
        );

        context.fillStyle = "#ffffff";
        context.textAlign = "center";
        context.font = "11px Arial";

        context.fillText(
            time.toFixed(4) + " ms",
            x + barWidth / 2,
            Math.max(y - 7, 15)
        );

        context.save();

        context.translate(
            x + barWidth / 2,
            height - paddingBottom + 15
        );

        context.rotate(-0.35);

        context.textAlign = "right";
        context.fillStyle = "#cbd5e1";

        context.fillText(names[index], 0, 0);

        context.restore();
    });
}


// ========================================
// 10. LOAD SAMPLE INPUT
// ========================================

function loadSample() {

    document.getElementById("start").value = "A";

    document.getElementById("end").value = "F";

    document.getElementById("roads").value =
`A,B,4
A,C,2
B,D,5
C,D,2
D,F,3
B,F,10
C,F,8`;

    document.getElementById("error").textContent = "";

    document.getElementById("results").innerHTML = "";
}