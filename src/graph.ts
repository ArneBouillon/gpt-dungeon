import fs from "fs";

export { makeUndirectedGraph }

function makeUndirectedGraph(all, connections, filename) {
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
    fs.writeFileSync(filename, instructions)
}
