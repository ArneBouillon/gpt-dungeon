import fs from "fs";

export { makeUndirectedGraph }

function makeUndirectedGraph(all, connections) {
    const instructions =
        `
            graph G {
                ${all.map(room => `"${room}";`).join('\n')}
                ${connections.map(
                    conn => `"${conn[0]}" -- "${conn[1]}";`
                ).join('\n')}
            }
        `

    console.log(instructions)
    fs.writeFile('graph.txt', instructions, err => { console.log(err); console.log(instructions) })
}
