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

let workFilter = '-"shared" AND -"recipes"'

const start = DateTime.now()
let last = DateTime.now()
function log(t) {
    let now = new Date()
    let diff = now - last
    last = now
    console.log(t, diff)
}
log("starting ==============")

const curr = dv.current()

let tasks = dv.pages(workFilter)
    .where(p => !p.ignoreTasks && p.file != curr.file)
    // .sort(p => p.ctime, 'desc')
    .file.tasks
    .where(t => t.text.trim() != "" && !t.completed)
log('alltasks')
let listTitle = ""
let taskList
log('completed')
let today = DateTime.local().startOf("day")


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
        if (t.text.contains(s)) {
            return true
        }
    }

    for (let a of triagedAttrs) {
        if (t[a] !== undefined) {
            return true
        }
    }

    return false
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
        if (t[attr]) {
            return true
        }
    }
    for (let tag of shareTags) {
        if (t.text.contains(tag)) {
            return true
        }
    }
}
const dueSoon = (t) => (t.due && t.due > today && t.due < soon)
const due = (t) => (t.due !== undefined)
const informational = (t) => {
    if (t.text.contains("#info") || t.text.contains("#reminder")) { return true }
    return false
}
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
customGroups[doNowLabel] = (tasks) => {
    let due = []
    let prioritized = []
    let others = []
    tasks.forEach(t => {
        if (t.due) { due.push(t); return }
        if (t.text.contains("#p0") || t.text.contains("#p1") || t.text.contains("#p2") || t.text.contains("#p3")) {
            t.p = 1
        }
        if (t.p !== undefined) { prioritized.push(t); return }
        others.push(t)
    })

    due = dv.array(due).sort(t => t.due, 'asc')
    prioritized = dv.array(prioritized).where(t => t.p !== undefined).sort(t => t.p, 'asc')
    others = dv.array(others).where(t => !t.due || t.p == undefined)
    return [
        { title: "Due", tasks: due },
        { title: "Prioritized", tasks: prioritized },
        { title: "Others", tasks: others }
    ]
}


const doSoonLabel = "due soon"
// customSorts[doSoonLabel] = (tasks) => tasks.sort(t => t.due, 'asc')

const shareLabel = "to share"
// customSorts[shareLabel] = (tasks) => tasks.sort(t => t.share, 'asc')

const waitingLabel = "awaiting responses"
// customSorts[waitingLabel] = customSorts[shareLabel]

const triageLabel = "triage"
const order = [triageLabel, "Schedule", doNowLabel, doSoonLabel, shareLabel, waitingLabel]

tasks.forEach(t => {
    if (informational(t)) { return }

    if (doNow(t)) {
        // if(isSchedule(t)) { addTask(doNowLabel, scheduleLabel, t) }
        // then due
        // then prioritized
        addTask(doNowLabel, t); return
    }
    if (dueSoon(t)) { addTask(doSoonLabel, t); return }
    if (due(t)) { return; } // TODO: should show a list of scheduled

    if (toShare(t)) { addTask(shareLabel, t); return }
    if (waiting(t)) { addTask(waitingLabel, t); return }

    addTask(triageLabel, t)
})
log('filtering completed')
let headers = []

let pageTitle = curr.file.name.toLowerCase().replace("tasks - ", "")
for (let filter of order) {
    let title = filter
    if (!filters[filter]) { continue }
    let text = `[[TASKS - ${title}|${title} (${filters[filter].length})]]`
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
        dv.taskList(customSort(dv.array(taskList)), false)
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
console.log("Total", DateTime.now() - start)
// dv.paragraph(`Empty: ${secondaryHeaders.join(" | ")}`)

// let filters2 = {
//     // "Triage": tasks.where(t => !triaged(t))
//     //     .sort(t => t.ctime, 'asc'),
//     // "Overdue": tasks.where(t => { return t.due && t.due < today }).sort(t => t.p || t.due, 'asc'),
//     // "Active": tasks.where(t => t.active),

//     // "Do Now": tasks.where(doNow).sort(t => t.p, 'asc'),
//     // "Due Soon": tasks.where(t => {
//     //     return t.due &&
//     //         t.due > today &&
//     //         t.due < today.plus({ days: 2 })
//     // }).sort(t => t.due, 'asc'),
//     // "Outdated": tasks.where(t => t.created && t.created.diffNow("days") > 30),

//     // "To Share": tasks.where(t => t.share || t.talk || t.ask),
//     // "Awaiting Responses": tasks.where(t => t.waiting).sort(t => t.waiting, 'asc'),
//     // "Do Sometime": tasks.where(t => !t.completed && (t.text.contains("#todo") || t.text.contains("#someday"))),
//     // TODO: contexts / projects

//     // "Lacking Context": tasks.where(t => !t.completed && !t.text.contains("#")), // TODO: missing person or project
//     // "Lacking Due Date": tasks.where(t => !t.completed && !t.due),
//     // "Review": tasks.where(t => !t.completed && (t.text.contains("#blocked") || t.text.contains("#delegated"))),
// // let secondaryTreatment = {
//     // "Triage": { 
//     //     "Schedule": (tasks) => tasks.filter(t => t.text.contains("reach out to"))
//     // }
// }