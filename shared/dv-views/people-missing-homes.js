let atts = new Set()

let p = dv.pages(`-"shared"`)
    .where(p => {
        if (p.author && p.author != "?") { return true }
        if (p.record == "meeting" && p.attendees && p.attendees.length) { return true }
    }).forEach(p => {
        if (p.author) { atts.add(p.author) }
        if (p.attendees) {
            p.attendees.forEach(a => {
                atts.add(a)
            })
        }
    })

let missing = []
for (let a of atts) {
    if (a.path) {
        let path = `people/${a.path}`
        if (!dv.page(path)) {
            if (dv.page(a.path)) {
                missing.push(`mv "${a.path}.md" people/`)
            } else {
                missing.push(`cat shared/templates/person.md > "${path}.md"`)
            }
        }
    }
}

if (missing.length) {
    dv.el("pre", missing.join("\n"))
} else {
    dv.paragraph("None")
}