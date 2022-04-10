let curr = dv.current()
let authored = dv.pages('-"shared/templates"')
.filter(p => {
	return p.author &&
	p.author.path == curr.file.name &&
	p.file != this.file
})
.sort(p => p.ctime, 'desc')

let articles = authored.map(note => [note.file.link, note.read, note.notes])

dv.table(["Title", "Read", "Notes"], articles)