
export { getMD }

function getMD(title, intro, sections): string {
    return `# ${title}\n\n${intro}\n\n${sections.join('\n\n')}`
}
