import fs from "fs";

export { makeUndirectedGraph }

function makeUndirectedGraph(all, connections, filename) {
    connections = connections.map(conn => conn.sort())
                             .sort()
                             .filter((conn, i, a) => i == 0 || conn.toString() != a[i-1].toString())
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
