var debug = false
let { DateTime } = dv.luxon

let workFilter = '-"shared" AND -"recipes" AND -"fanatics"'

const curr = dv.current()

let hiringTasks = []
let highlightTasks = []
let challengeTasks = []
let otherTasks = []

function showTasks(t, skip) {
    if (t.length) {
        dv.taskList(t)
    } else if (!skip) {
        dv.paragraph("No updates.")
    }
}

let today = DateTime.local().startOf("day")
dv.pages(workFilter)
    .where(p => {
        return !p.ignoreTasks && p.file != curr.file && (!p.file.day || p.file.day <= today)
    })
    .file.tasks
    .where(t => {
        if (t.completed) { return false }
        if (t.text.contains("\n")) { t.text = t.text.split("\n")[0] }

        return t.text.trim() != "" && t.text.contains("#five-fifteen")
    })
    .forEach(t => {
        let text = t.text
        let cleaned = text.replace("#five-fifteen", "")
            .replace("#hiring", "")
            .replace("#highlight", "")
            .replace("#challenge", "")
        t.text = cleaned

        if (text.contains("#hiring")) { return hiringTasks.push(t) }
        if (text.contains("#highlight")) { return highlightTasks.push(t) }
        if (text.contains("#challenge")) { return challengeTasks.push(t) }
        otherTasks.push(t)
    })

dv.paragraph(`subject: Cloud Services Update ${today.month}/${today.day}`)
dv.paragraph(`Welcome to this week’s update!
Hiring:`)
showTasks(hiringTasks)

dv.paragraph(`
Highlights:`)
showTasks(highlightTasks)

dv.paragraph(`
Challenges:`)
showTasks(challengeTasks)


showTasks(otherTasks, true)


dv.paragraph(`
Thanks for taking the time to read, please let me know if you have any questions.

Curious about #five-fifteen? 
https://co2partners.com/515-report-increasing-effectiveness-200-percent/`)
