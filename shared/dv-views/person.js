let curr = dv.current()
let aliases = curr.aliases || []
aliases.push(curr.file.name)
// grab all pages, except:
// templates/ directory
// this page
// pages with ignoreTasks: true

let broadFilter = dv.pages('-"shared/"')
let pages = broadFilter
	.filter(p => {
		return !p.ignoreTasks &&
			p.file != this.file
	})
	.sort(p => p.ctime, 'desc')

// grab all tasks that contain an alias in this page's frontmatter, e.g.
// @tony
let personTasks = pages.file.tasks
	.where(t => {
		if (t.text == "") { return false }
		for (let alias of aliases) {
			if (t.text.contains(alias)) {
				return true
			}
		}
		return false
	})

// show anything that isn't completed
let outstanding = personTasks
	.where(t => !t.completed)
	.sort(t => t.due, 'asc')
if (outstanding.length > 0) {
	dv.header(2, "Outstanding")
	dv.taskList(outstanding, true)
}

// show anything that has been completed
let done = personTasks
	.where(t => t.completed)
	.groupBy(t => t.done)
	.sort(g => g.key, 'desc')
if (done.length > 0) {
	for (let group of done) {
		let key = "Others"
		if (group.key && group.key.toISODate) {
			key = group.key.toISODate()
		}
		dv.header(2, key)
		dv.taskList(group.rows, true)
	}
}

let recent = broadFilter
	.where(p => {
		if (p.attendees) { 
			let filtered = new Set(p.attendees.filter(n => n).map(n => n.path))
			if (filtered.has(curr.file.name)) { return true }
		}
	}).limit(20)
if (recent.length) {
	dv.header(2, "Recent Meetings")
	dv.list(recent.file.link)
}

let authored = broadFilter
	.filter(p => {
		return p.author &&
			p.author.path == curr.file.name &&
			p.file != this.file
	})
	.sort(p => p.ctime, 'desc')

let articles = authored.map(note => [note.file.link, note.read, note.notes])
if (articles.length) {
	dv.table(["Title", "Read", "Notes"], articles)
}

let backlinks = curr.file.inlinks
if (backlinks.length) {
	dv.header(2, "References")
	dv.list(backlinks)
}