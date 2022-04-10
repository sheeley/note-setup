function getRandomNote() {
    const markdownFiles = app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith("quotes/"))
    let min = 0
    let max = markdownFiles.length - 1
    const id = Math.floor(Math.random() * (max - min + 1) + min)
    const note = markdownFiles[id]
    return `![[${note.path}]]`;
}
module.exports = getRandomNote;