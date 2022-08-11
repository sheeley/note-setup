var debug = false
let { DateTime } = dv.luxon

let shareAttrs = [
    "talk",
    "ask",
    "share",
    "tell"
]

let shareTags = [
    "#share",
    "#next"
]

let doNowText = [
    "#me",
    "#important",
    "#p0", "#p1", "#p2", "#p3", "#p4"
]

let workFilter = '-"shared" AND -"recipes" AND -"fanatics"'

const start = DateTime.now()
let last = DateTime.now()
function log(t) {
    if (!debug) { return }
    let now = new Date()
    let diff = now - last
    last = now
    console.log(t, diff)
    dv.paragraph(`${t}: ${diff}`)
}
log("starting ==============")

const curr = dv.current()

let today = DateTime.local().startOf("day")
let files = dv.pages(workFilter)
    .where(p => {
        return !p.ignoreTasks && p.file != curr.file && (!p.file.day || p.file.day <= today)
    }).file

let tasks = []
files.forEach(f => {
    let fileTasks = f.tasks.where(t => {
            if (!t || t.completed) { return false }
            // console.log(t)
            // TODO: should I care about this?
            // - [ ] 
            // ![[TASKS]]
            // causes an incorrect task to be created
            if (t.text.contains("\n")) { t.text = t.text.split("\n")[0] }
            // t.text = t.text.replace("![[TASKS]]", "")
            if (t.text.trim() == "") { return false }
            t.cday = f.cday
            t.mday = f.mday
            return true
        }).array()
    
    tasks = tasks.concat(fileTasks)
})
tasks.sort((t1, t2) => t1.cday < t2.cday )

log('alltasks')
let listTitle = ""
let taskList
log('completed')

// tasks.forEach(t => t.text.contains("\n") && console.log(t.text))


let hiring = (t) => t.text.contains("#hire")

let doNow = (t) => {
    if (t.p !== undefined) { return true }
    if (t.due && t.due.toISODate() <= today.toISODate()) { return true }
    let text = t.text.toLowerCase()
    for (let phrase of doNowText) {
        if (text.contains(phrase)) { return true }
    }
}

let triaged = (t) => {
    for (let s of triagedTags) {
        if (t.text.contains(s)) { return true }
    }

    for (let a of triagedAttrs) {
        if (t[a] !== undefined) { return true }
    }
}

const filters = {}
let addTask = (key, subKey, t) => {
    if (!filters[key]) { filters[key] = [] }
    if (typeof subKey !== "string") {
        if (!filters[key]) { filters[key] = [] }
        filters[key].push(subKey)
        return
    }

    filters[key].children = true
    // if (!filters[key]) { filters[key] = {} }
    if (!filters[key][subKey]) { filters[key][subKey] = {} }
    filters[key][subKey] = t
}

const soon = today.plus({ days: 2 })
const waiting = (t) => (t.waiting || t.text.contains("#waiting"))
const toShare = (t) => {
    for (let attr of shareAttrs) {
        if (t[attr]) { return true }
    }
    for (let tag of shareTags) {
        if (t.text.contains(tag)) { return true }
    }
}
const noise = (t) => t.text.contains("#someday")
const dueSoon = (t) => (t.due && t.due > today && t.due < soon)
const due = (t) => (t.due !== undefined)
const informational = (t) => t.text.contains("#info") || t.text.contains("#reminder")
const isSchedule = (t) => {
    let text = t.text.toLowerCase()
    return text.contains("talk to") || text.contains("reach out to")
}

const customSorts = {}
const customGroups = {}
// TODO: add any extra keys to order dynamically
let defaultSort = (t) => t

const doNowLabel = "do now"
const scheduleLabel = "Schedule Discussions"
// customSorts[doNowLabel] = (tasks) => tasks.sort(t => t.p, 'asc')
// customGroups[doNowLabel] = (tasks) => {
//     const priorityPattern = /#p(\d+)/
//     let due = []
//     let prioritized = []
//     let others = []
//     tasks.forEach(t => {
//         if (t.due) { due.push(t); return }

//         const match = priorityPattern.exec(t.text)
//         if (match) {
//             t.p = match[1]
//         }
//         if (t.p !== undefined) { prioritized.push(t); return }
//         others.push(t)
//     })

//     due = dv.array(due).sort(t => t.due, 'asc')
//     prioritized = dv.array(prioritized).where(t => t.p !== undefined).sort(t => t.p, 'asc')
//     others = dv.array(others).where(t => !t.due || t.p == undefined)
//     return [
//         { title: "Due", tasks: due },
//         { title: "Prioritized", tasks: prioritized },
//         { title: "Others", tasks: others }
//     ]
// }

const doSoonLabel = "schedule"
const shareLabel = "to share"
const delegateLabel = "delegate"
const noiseLabel = "drop"
const waitingLabel = "awaiting responses"
const triageLabel = "triage"

const hiringLabel = "hiring"
const order = [triageLabel, doNowLabel, delegateLabel, doSoonLabel, hiringLabel, shareLabel, waitingLabel, noiseLabel]

let eisenhower = (t) => {
    if (t.text.contains("#important-urgent")) { return doNowLabel } // do
    if (t.text.contains("#important-nonurgent")) { return doSoonLabel } // schedule
    if (t.text.contains("#unimportant-urgent")) { return delegateLabel } // delegate
    if (t.text.contains("#unimportant-nonurgent")) { return noiseLabel } // delete
    return "triage"
}

tasks.forEach(t => {
    if (informational(t)) { return }
    // if (doNow(t)) { addTask(doNowLabel, t); return }
    // if (dueSoon(t)) { addTask(doSoonLabel, t); return }
    // if (due(t)) { return; } // TODO: should show a list of scheduled
    if (toShare(t)) { addTask(shareLabel, t); return }
    if (waiting(t)) { addTask(waitingLabel, t); return }
    if (noise(t)) { addTask(noiseLabel, t); return }
    if (hiring(t)) { addTask(hiringLabel, t); return }
    addTask(eisenhower(t), t)
    // addTask(triageLabel, t)
})
log('filtering completed')
let headers = []

let toTitleCase = (str) => str.replace( /\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())

let pageTitle = curr.file.name.toLowerCase().replace("tasks - ", "")
for (let filter of order) {
    let title = filter
    if (!filters[filter]) { continue }
    let text = `[[TASKS - ${title}|${toTitleCase(title)} (${filters[filter].length})]]`
    headers.push(text)

    if (pageTitle == filter.toLowerCase()) {
        listTitle = filter
        taskList = filters[filter]
    }
}
headers.push("[[TASKS - Weekly Summary| Weekly Summary]]")

if (listTitle) {
    dv.header(1, `${listTitle} (${taskList.length})`)
}

log('headers')
dv.paragraph(headers.join(" | "))
log('headers2')
if (taskList) {
    let customGrouping = customGroups[pageTitle]
    if (!customGrouping) {
        let customSort = customSorts[pageTitle] || defaultSort
        // const tasks = customSort(dv.array(taskList))
        const tasks = dv.array(taskList).sort(t => t.cday, 'desc')
        dv.taskList(tasks, false)
        log('tasks')
    } else {
        let groups = customGrouping(taskList)
        log('tasks grouped')
        for (const { title, tasks } of groups) {
            dv.header(3, title)
            //let customSort = customSorts[pageTitle] || defaultSort
            dv.taskList(dv.array(tasks), false)
        }
    }
}
// if (taskList) {
//     const headers = ["", "Task", "Link"] // "Priority", "Due", "Tags"]
//     const rows = taskList.map(t => {
//         console.log(t)
//         return ["- [ ] ", t.text, `[[${t.link.path}|link]]`] // , t.p, t.due, t.tags]
//     })
//     dv.table(headers, rows)
// }
log("Total", DateTime.now() - start)