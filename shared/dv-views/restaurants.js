let filters = input || {}
let {cuisine, location} = filters

let pages = dv.pages(`-"shared"`)
    .where(p => {
        if (p.record != "restaurant") { return false }
        if (cuisine && (p.cuisine || "").toLowerCase() != cuisine) { return false }
        if (p.location && location) {
            for (let [key, value] of Object.entries(location)) {
                if (!value) { continue }
                if (!p.location[key] || p.location[key].toLowerCase() != value.toLowerCase()) {
                    return false
                }
            }
        }

        return true
    })
    .sort(p => p.file.name, "asc")

let headers = [
    "Name", "Cuisine", "Website", "Location"
]

let rows = pages.map(p => {
    let webLink = p.url ? `[link](${p.url})` : ""
    let location = !p.location ? "" : [p.location.city, p.location.state, p.location.country].filter(p => p).join(", ")
    return [p.file.link, p.cuisine, webLink, location]
})

if (cuisine) {
    dv.paragraph(`Active Filters: ${cuisine}`)
}
dv.table(headers, rows)