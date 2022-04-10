// Usage:
// ```dataviewjs
// dv.view("shared/dv-views/last-period-summary", {kind: "daily", date: "2022-03-01"})
// dv.view("shared/dv-views/last-period-summary", {kind: "weekly", date: "2022-W12"})
// dv.view("shared/dv-views/last-period-summary", {kind: "monthly", date: "2022-03"})
// ```

let { DateTime } = dv.luxon
let { kind, date } = input
let curr = dv.current()

// LIBRARY: BEGIN
let errMsg = (extra) => dv.paragraph(`${kind}, ${date} - This needs to be used in a file with: ${extra}`)
let taskFilter = () => false
let pageFilter = () => false
let pageLinker = (p) => p.file.link
const dateWithinRange = (date, start, end) => date >= start && date <= end
let extraContent

function noteFallsWithinRange(note, startDay, endDay) {
    if (!note.file) { return false }
    if (note.file.name == curr.file.name) { return false }

    let created = note.file.cday
    if (note.file.day) { created = note.file.day }
    if (dateWithinRange(created, startDay, endDay)) { return true }
    if (dateWithinRange(note.file.mday, startDay, endDay)) { return true }

    return false
}

function taskFallsWithinRange(t, startDay, endDay) {
    if (t.done && dateWithinRange(t.done, startDay, endDay)) { return true }
    if (t.due) {
        if (dateWithinRange(t.due, startDay, endDay)) { return true }
        return false
    }
    if (t.created && dateWithinRange(t.created, startDay, endDay)) { return true }
    return false
}
// LIBRARY: END
function main() {
    if (kind == "daily") {
        if (!curr.file.day) { errMsg("file.day"); return }

        // DUM SPIRO SPERO; MEMENTO MORI
        const expectedEnd = dv.date("2054-07-09")
        const daysRemaining = expectedEnd.diff(curr.file.day || curr.file.ctime, "days")
        extraContent = () => dv.paragraph(`You have ${daysRemaining.days.toLocaleString()} days left`)

        let today = curr.file.day.toISODate()

        const isoMatch = (d) => d && today == d.toISODate()
        taskFilter = (t) => isoMatch(t.due) || isoMatch(t.done)

        pageFilter = (p) => {
            if (p.file.name == curr.file.name) { return false }

            if (isoMatch(p.file.day)) { return true }

            // if (isoMatch(p.file.ctime) || isoMatch(p.file.mtime)) { return true } 
        }
        pageLinker = (p) => dv.fileLink(p.file.path, false, p.file.name.replace(`${today} `, ""))
    }

    if (kind == "weekly") {
        let [weekYear, weekNumber] = date.split("-W")

        if (!weekNumber) { errMsg("YYYY-WW date"); return }

        let today = DateTime.fromObject({ weekYear, weekNumber })
        let startDay = today.minus({ days: 7 })

        taskFilter = (t) => taskFallsWithinRange(t, startDay, today)

        pageFilter = (p) => {
            if (p.file.name == curr.file.name) { return false }
            return noteFallsWithinRange(p, startDay, today)
        }
    }

    if (kind == "monthly") {
        let [year, month] = date.split("-")

        if (!month) { errMsg("YYYY-MM date"); return }
        extraContent = () => {
            if (month % 3 == 0) {
                extraContent += "\n- [ ] Do [[Check-In Quarterly]]"
            }
            let randomPage = dv.page("Random Things to Review")
            if (randomPage && randomPage.file) {
                let goals = randomPage.file.tasks
                    .sort(t => t.completed, 'desc')
                if (goals.length) {
                    dv.header(2, "[[Random Things to Review]]")
                    dv.taskList(goals, false)
                }
            }
        }

        let today = DateTime.fromObject({ year, month })
        let startDay = today.minus({ months: 1 })

        taskFilter = (t) => taskFallsWithinRange(t, startDay, today)

        pageFilter = (p) => noteFallsWithinRange(p, startDay, today)
    }

    // PERIOD'S TASKS ==============================
    let pages = dv.pages(`-"shared"`)
    let tasks = pages.where(p => !p.ignoreTasks && p.file != curr.file)
        .file.tasks
        .where(taskFilter)
    let outstanding = tasks.where(t => !t.completed)
    let completed = tasks.where(t => t.completed)

    if (outstanding.length) {
        dv.header(2, `Outstanding ${kind} Tasks (${outstanding.length})`)
        dv.taskList(outstanding, false)
    }

    // PERIOD'S PAGES
    let todayPages = pages
        .where(pageFilter)
        .sort(p => p.file.name, 'asc')
        .map(pageLinker)

    if (todayPages.length > 0) {
        dv.header(2, `${kind} Notes (${todayPages.length})`)
        dv.list(todayPages)
    }

    if (completed.length) {
        dv.header(2, `Completed ${kind} Tasks (${completed.length})`)
        dv.taskList(completed, false)
    }

    // PERIOD'S GOALS ==============================
    let currentGoals = dv.page("Current Goals")
    if (currentGoals) {
        let goals = currentGoals.file.tasks
            .sort(t => t.completed, 'desc')
        if (goals.length) {
            dv.header(2, "[[Current Goals]]")
            dv.taskList(goals, false)
        }
    }

    if (extraContent) {
        extraContent()
    }
}

main()

dv.view("shared/dv-views/tracker")