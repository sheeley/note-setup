let headers = ["Project", "Last Update", "Next Milestone", "Comments"]
function summarizeProject(page) {
    let projPages = dv.array(dv.pages(`[[${page.project}]]`), groupedByProject[page.project] || [])
    let lastUpdate = projPages.last().file.mday
    let nextMilestone = projPages.where(p => p.milestone && !p.completed).sort(p => p.file.mday, "desc")
    return [page.file.name, lastUpdate, nextMilestone]
}
let anythingProject = dv.pages().where(p => p.record == "project")
let activeProjects = anythingProject.where(p => p.state == "active")

let groupedByProject = {}
activeProjects.forEach(p => {
    groupedByProject[p.project] = groupedByProject[p.project] || []
    groupedByProject[p.project].push(p)
})
let rows = activeProjects.map(summarizeProject)
dv.table(headers, rows)


// dv.taskList(taskList, false)
// ```dataview
// table file.mday as "Updated", last as "Previous Milestone", next as "Upcoming Milestone", comment as Comment
// where record="project" and state="active"
// ```