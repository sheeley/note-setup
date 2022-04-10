let aliases = dv.current().aliases || []

// grab all pages, except:
// templates/ directory
// this page
// pages with ignoreTasks: true
let pages = dv.pages('-"shared/templates"')
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
	dv.taskList(outstanding, false)
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
		dv.taskList(group.rows, false)
	}
}

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