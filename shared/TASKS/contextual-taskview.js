var debug = false
function log(t) {
    if (!debug) { return }
    let now = new Date()
    let diff = now - last
    last = now
    console.log(t, diff)
}
let { DateTime } = dv.luxon
const curr = dv.current()
let query = `-"shared"`
// lookups is the list of "interesting" terms to look for in tasks
let lookups = new Set()

// add aliases grabs a page based on its title or a link, like
// ---
// attendees: ["[[Johnny]]", "Johnny"]
// ---
// or
// dv.view("contextual-taskview.js", {context: "Johnny"})
function addAliases(page) {
    if (!page) { return } 
    if (page.path) { page = page.path }
    if (!page || !page.replace) { return } 
    
    let pageText = page.replace("[[", "").replace("]]", "").toLowerCase()
    page = dv.page(pageText)

    if (page) {
        lookups.add(page.file.name.toLowerCase())
        if (page.aliases) {
            for (let alias of page.aliases) {
                lookups.add(alias.toLowerCase())
            }
        }
    } else {
        lookups.add(pageText)
    }
}

function intersects(setA, setB) {
    if (!setA || setA.size == 0 || !setB || setB.size == 0) { return }
    for (let elem of setB) {
        if (setA.has(elem)) {
            return true
        }
    }
    return false
}

function addAll(set, values) {
    if (!Array.isArray(values)) {
        values = [values]
    }
    for (let v of values) {
        if (!v) { continue }
        if (v.path) {
            v = `link:${v.path}`
        }
        set.add(v)
    }
}

// allow specifying a specific page via second argument to dv.view
if (input && input.context) { addAliases(input.context) }

// use frontmatter attendees
const current = dv.current()
console.log(current)
if (current.attendees) { current.attendees.forEach(a => addAliases(a)) }
if (current.aliases) { current.aliases.forEach(a => addAliases(a)) }
if (current.topic) { addAliases(current.topic) }
const search = new Set()
if (current.topic) { addAll(search, current.topic) }
if (current.attendees) { addAll(search, current.attendees) }


const allowImplicit = current.implicitTasks || true
let rendered = false
// if there are lookups, find appropriate tasks
if (lookups.size > 0) {
    const today = DateTime.local().startOf("day")
    const allTasks = dv.pages(query)
        .filter(p => {
            return p.record != "person"
                && !p.ignoreTasks
                && p.file.path != current.file.path
        }).map(p => {
            if (allowImplicit && p.file.tasks) {
                p.file.tasks.forEach(t => {
                    t.searchable = new Set()
                    if (p.topic) { addAll(t.searchable, p.topic) }
                    if (p.attendees && p.attendees.array ) { addAll(t.searchable, p.attendees) } 
                })
            }
            return p
        })
        .sort(p => p.ctime, 'desc')
        .file.tasks
        .where(t => {
            if (t.text.trim() == "") { return false }

            const text = t.text.toLowerCase()
            for (const lkp of lookups.values()) {
                if (text.contains(lkp)) { t.explicit = true; return true }
            }

            if (allowImplicit) {
                if (intersects(search, t.searchable)) {
                    return true
                }
            }   
            return false         
        })

    const outstanding = allTasks.where(t => !t.completed)
    if (outstanding.length) {
        dv.el("hr", "")
        dv.header(2, `Outstanding (${outstanding.length})`)
        const split = outstanding.array().reduce((prev, val) => {
            let key = val.explicit ? "explicit" : "implicit"          
            prev[key] = prev[key] || []
            prev[key].push(val)
            return prev
        }, {})

        const {implicit, explicit} = split
        if (explicit) {
            dv.header(3, "Explicit")
            dv.taskList(explicit, false)
        }
        if (implicit) {
            dv.header(3, "Implicit")
            dv.taskList(implicit, false)
        }
        
        rendered = true
    }

    const completed = allTasks
        .where(t => t.completed && t.completed > today.minus({ days: 21 }))
        .sort(t => t.completed, 'desc')
    if (completed.length) {
        dv.header(2, `Completed (${outstanding.length})`)
        dv.taskList(completed, false)
        rendered = true
    }
}


debug = true
if (debug && !rendered) { 
    dv.el("hr", "")
    if (lookups.size) {
        dv.paragraph(`No tasks found`)
    } else {
        dv.paragraph("No topic or attendees in frontmatter, not looking up tasks")
    }
}