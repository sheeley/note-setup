---
tags: [tasklist]
---

```dataviewjs
dv.view("tasks/taskview")
```
```dataviewjs
let { DateTime } = dv.luxon

let allTasks = dv.pages('-"shared/templates" AND -"test"')
    .filter(p => {
        return p.record != "recipe"
            && !p.ignoreTasks
            && p.file != this.file
    })
    .sort(p => p.ctime, 'desc').file.tasks
    .where(t => t.text.trim() != "")

let tasks = allTasks.where(t => !t.completed)
let today = DateTime.local().startOf("day")
let filters = {
    "Overdue": tasks.where(t => { return t.due && t.due < today }).sort(t => t.p || t.due, 'asc'),

    "Completed": allTasks.where(t => {
        return t.done && t.done > today.minus({ days: 6 })
    }).sort(t => t.done, 'desc'),

    "To Share": tasks.where(t => t.share || t.talk || t.ask), // or #wins #challenges #focus
    "Awaiting Responses": tasks.where(t => t.waiting),
    "Created": allTasks.where(t => {
        return t.created >= today.minus({ days: 6 })
    }).sort(t => t.created, 'desc'),
}

for (let title in filters) {
    let filter = filters[title]
	if (filter.length) {
	    let text = `${title} (${filter.length})`
	    dv.header(2, text)
	    dv.taskList(filter, false)
	}
}
```