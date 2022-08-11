
const { DateTime } = dv.luxon
const today = DateTime.now()
const { weekNumber, month } = today

const active = new Set(dv.current().file.tasks.where(t => t.completed).map(t => t.text).array())

const getKey = (goal) => goal.key || goal.label.toLowerCase()
const plural = (count, unit) => {
    if (!unit) { throw new Exception("pass in unit") }
    if (count == 1 || unit == "%") return unit
    if (unit == "inch") return " inches"
    return ` ${unit}s`
}
const coloredSpan = (good, contents) => dv.el("span", contents, { cls: `${good ? "good" : "bad"}` })
const coloredLastUpdated = (date) => {
    if (!date) { return coloredSpan(false, "Never") }
    const good = today.diff(date, ["days"]).toObject().days <= 31
    return coloredSpan(good, date.toISODate())
}

class Streak {
    metadata = {}
    dates = []

    constructor(cfg) {
        this.metadata = cfg
    }

    add(date) {
        this.dates.push(date)
    }

    row() {
        const { goal, unit, countPer, category } = this.metadata
        const streak = 0
        const aggregated = this.dates.reduce((prev, current) => {
            const data = prev
            let aggKey = current[unit]
            if (unit == "week") {
                if (current.weekYear != today.year) { return data }
                aggKey = current.weekNumber
            }
            if (!data[aggKey]) { data[aggKey] = 0 }
            data[aggKey]++
            return data
        }, {})

        const ordered = Object.keys(aggregated).sort().reverse().filter(d => aggregated[d] >= countPer)
        let last = (unit == "month") ? today.month : today.weekNumber
        for (let d of ordered) {
            if (last && last - d > 1) { break }
            streak++
            last = d
        }

        // let delta = streak - goal
        const good = streak > 0
        let indicator = "❌" // (delta < 0) ? "🔻" : "✅"
        if (good) {
            indicator = (streak < 6) ? "✅ ".repeat(streak) : streak
        }
        const mostRecent = this.latest()
        let latest
        if (mostRecent) {
            latest = mostRecent
        }
        // 🟢
        return [
            `${this.metadata.label} (${countPer}/${unit})`,
            // category,
            // indicator,
            // coloredSpan(good, streak),
            coloredSpan(good, indicator),
            `${goal} ${unit} streak (${today.year} total: ${ordered.length}${plural(ordered.length, unit)})`,
            // `${streak}${plural(delta, unit)}`,
            // this.latest(), this.earliest(),
            coloredLastUpdated(latest)
        ]
    }

    latest() {
        return this.dates[0]
    }

    earliest() {
        return this.dates.length && this.dates[this.dates.length - 1]
    }
}

let pages = dv.pages('"quant"')
    .where(p => p.file.day) // && p.file.day.year == today.year)
    .sort(p => p.file.day, 'desc')

// Create metadata
const goals = [
    { label: "Weight", goal: 190, lowerIsBetter: true, unit: "pound", category: "health" },
    { label: "Body Fat", goal: 18, lowerIsBetter: true, unit: "%", category: "health" },
    { label: "Waist", goal: 34, lowerIsBetter: true, unit: "inch", category: "health" },
    { label: "Emergency Savings", goal: 96000, unit: "$", category: "finance" },
    { label: "Debt", goal: 0, unit: "$", lowerIsBetter: true, category: "finance" },
    { label: "Net Worth", goal: 6000000, unit: "$", category: "finance" }
].filter(g => active.size == 0 || active.has(g.category))

const trackGoals = new Set(goals.map(getKey))
const streaks = [
    { label: "Paid off CC", goal: 6, unit: "month", countPer: 1, key: "paid off credit card", category: "finance" },
    { label: "Closed Rings", goal: 52, unit: "week", countPer: 5, key: "closedCircles", category: "health" },
    { label: "Positive Cash Flow", goal: 12, unit: "month", countPer: 1, category: "finance" },
    { label: "Sleep", goal: 52, unit: "week", countPer: 6, key: "sleep", category: "health" }
].filter(g => active.size == 0 || active.has(g.category))

const streakLookup = streaks.reduce((prev, current) => {
    let data = prev
    prev[getKey(current)] = new Streak(current)
    return data
}, {})

// Gather data
const mostRecent = {}
const unhandled = new Set([])
pages.forEach(p => {
    const fm = p.file.frontmatter
    fm.closedCircles = fm.hitActiveEnergyGoal && fm.hitExerciseGoal && fm.hitMoveTimeGoal
    fm.metBudget = (fm.moneySpent && fm.income && fm.moneySpent < fm.income) || false
    for (let [key, value] of Object.entries(fm)) {
        if (trackGoals.has(key) && !mostRecent[key]) { mostRecent[key] = [value, p.file.day] }
        if (streakLookup[key] && fm[key]) { streakLookup[key].add(p.file.day) }
        unhandled.add(key)
    }
})

const goalRows = goals.map(g => {
    let latest = 0
    let date = today
    const key = g.key || g.label.toLowerCase()
    const entry = mostRecent[key]
    if (entry) {
        [latest, date] = mostRecent[key]
    }

    let delta = latest - g.goal
    let badIndicator = "🔻"
    if (g.lowerIsBetter) {
        delta = g.goal - latest
        badIndicator = "🔺"
    }

    const good = delta >= 0
    const indicator = (good) ? "✅" : badIndicator

    const withUnits = (quant) => {
        if (g.unit == "$") {
            return quant.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        }
        return `${quant.toLocaleString()}${plural(quant, g.unit)}`
    }

    return [
        g.label,
        // g.category,
        // indicator,
        // coloredSpan(good, withUnits(latest)),

        coloredSpan(good, `${indicator} ${withUnits(latest)}`),
        withUnits(g.goal),
        coloredLastUpdated(date)
    ]
})
let streakRows = Object.values(streakLookup).map(s => s.row())
// let allRows = goalRows.concat(streakRows)
// allRows.sort((r1, r2) => {
//     if (r1[1] < r2[1]) { return -1 }
//     if (r1[1] > r2[1]) { return 1 }
//     if (r1[0] < r2[0]) { return -1 }
//     if (r1[0] > r2[0]) { return 1 }
//     return 0
// })
const headers = [
    "Goal",
    // "Category", 
    // "Status",
    "Current",
    "Goal",
    "Updated"
]
// dv.table(headers, allRows)