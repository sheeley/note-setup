const { DateTime } = dv.luxon
const { Collections } = customJS

function union(setA, setB) {
    let _union = new Set(setA)
    for (let elem of setB) {
        _union.add(elem)
    }
    return _union
}

function difference(setA, setB) {
    let _difference = new Set(setA)
    for (let elem of setB) {
        _difference.delete(elem)
    }
    return _difference
}

let highLevelKeys = new Set([
    'happiness',
    'body fat',
    "waist",
    "weight",
    "sleep",
    "months of emergency fund"
])

let healthKeys = new Set([
    'activeEnergyBurned',
    'appleExerciseTime',
    'bloodOxygen',
    'flightsClimbed',
    'restingHeartRate',
])

let trackedKeys = union(highLevelKeys, healthKeys)

const skip = new Set([
    "tags",
    "track",
    "habits",
    "meditation",
    "exercise",
    "checkIn",
    "date",
    'activeEnergyBurnedGoal',
    'appleExerciseTimeGoal',
])

const habitKeys = new Set([
    'hitActiveEnergyGoal',
    'hitExerciseGoal',
    'hitMoveTimeGoal',
    "paid credit card",
])

const others = new Set()

// ----------------------- Setup -------------------------------------------------------
class TimeSeries {
    constructor(title) {
        this.title = title
        this.data = {}
        this.earliest = null
        this.latest = null
        this.min = null
        this.max = null
    }

    add(date, val) {
        if (!val) { return }
        if (typeof val == 'object') { console.log(`Oops: ${val}`); return }
        this.data[date.toISODate()] = val

        if (!this.earliest || date < this.earliest) { this.earliest = date }
        if (!this.latest || this.latest < date) { this.latest = date }

        if (!this.min || val < this.min) { this.min = val }
        if (!this.max || this.max < val) { this.max = val }
    }
}

class SeriesCollection {
    constructor() {
        this.series = {}
        this.earliest = null
        this.latest = null
    }

    add(date, key, value) {
        if (!trackedKeys.has(key) && !habitKeys.has(key)) {
            others.add(key);
            return
        }
        if (!this.earliest || date < this.earliest) { this.earliest = date }
        if (!this.latest || this.latest < date) { this.latest = date }
        this.series[key] = this.series[key] || new TimeSeries(key)
        this.series[key].add(date, value)
    }

    getStreak(key) {
        let entries = this.series[key]
        if (!entries) {
            dv.paragraph(`no entries: ${key}`)
            return
        }
        for (let [date, value] of Object.entries(entries)) {
            console.log(`wat`, date, value)
        }
        return 0
    }
}

// ----------------------- Data Gathering ----------------------------------------------
var errors = []
const data = new SeriesCollection()
const trackerPages = dv.pages(`"quant"`).forEach(p => {
    if (p.day) {
        p.date = p.day
        p.period = 'day'
    } else {
        if (p.file.name.contains("-W")) {
            const [weekYear, weekNumber] = p.file.name.split("-W")
            if (weekNumber) {
                p.date = DateTime.fromObject({ weekYear, weekNumber })
                p.period = 'week'
            }
        } else {
            p.date = DateTime.fromISO(p.file.name)
            if (p.date) { p.period = 'month' }
        }
    }

    let date = p.date || p.file.cday
    if (!date) {
        errors.push(`no date: ${p.file.name}`)
        return
    }

    if (!p.file.frontmatter) {
        errors.push(`no frontmatter: ${p.file.name}`)
        return
    }

    let fm = p.file.frontmatter
    for (let [k, value] of Object.entries(fm)) {
        if (habitKeys.has(k)) {
            // TODO
            continue
        }
        data.add(date, k, value)
    }

    // if (fm.habits) {
    //     fm.habits.forEach(h => data.add(date, h, true))
    // }
})

console.log(data)

// ----------------------- Display -----------------------------------------------------
const habits = []
const numeric = []
const scaleCfg = {
    // axis: 'y',
    // ticks: {
    //     display: false,
    // },
    // grid: {
    //     drawTicks: false,
    //     display: false,
    //     // drawBorder: false
    // }
}
const tracked = {}
let colors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(0, 20, 39, 1)',
    'rgba(222, 77, 134, 1)',
    'rgba(96, 113, 47, 1)',
    '#D3D0CB',
    '#98E2C6'
]
let baseChartData = {
    type: 'line',
    data: {
        datasets: []
    },
    // options: {
    //     plugins: {
    //         decimation: {
    //             enabled: true,
    //             algorithm: 'min-max',
    //             samples: 100,
    //         }
    //     },
    //     parsing: true,
    //     normalized: true,
    //     animation: false,
    //     // plugins: {
    //     //     legend: { display: false }
    //     // },
    //     scales: {
    //         xAxis: {
    //             ...scaleCfg,
    //             axis: 'x',
    //             ticks: {
    //                 // sampleSize: 4,
    //                 display: true,
    //                 callback: function (value, index) {
    //                     // return index % 4 === 0 ? this.getLabelForValue(value) : ''
    //                     return this.getLabelForValue(value)
    //                 }
    //             }
    //         }
    //     }
    // }
}

const highLevelChartData = JSON.parse(JSON.stringify(baseChartData))
const healthChartData = JSON.parse(JSON.stringify(baseChartData))
function getChartData(label) {
    if (highLevelKeys.has(label)) {
        return highLevelChartData
    }
    return healthChartData
}

Object.keys(data.series).forEach(key => {
    const series = data.series[key]
    if (habitKeys.has(key)) { habits.push(series); return }
    const chartData = getChartData(key)

    const values = series.data

    let dates = Object.keys(values).sort()
    for (const x of dates) {
        const y = values[x]
        tracked[key] = tracked[key] || []
        tracked[key].push({ x, y })
        // chartData.options.scales[key] = scaleCfg
    }
})
console.log('tracked', tracked)

for (const [label, data] of Object.entries(tracked)) {
    const chartData = getChartData(label)
    const color = colors[chartData.data.datasets.length % colors.length]
    chartData.data.datasets.push({
        // yAxisID: label,
        label,
        data,
        // borderColor: color,
        // backgroundColor: color,
        // max: data.max,
        // min: data.min
    })
}

// if (earliest) {
//     highLevelChartData.options.scales.xAxis.min = earliest.toMillis()
// }
// if (latest) {
//     highLevelChartData.options.scales.xAxis.max = latest.toMillis()
// }

dv.paragraph(data.earliest.toISODate())
dv.paragraph(data.latest.toISODate())
console.log('chart data', JSON.stringify(highLevelChartData))
window.renderChart(highLevelChartData, dv.container)
// window.renderChart(healthChartData, dv.container)
let filteredOthers = difference(others, skip)
if (filteredOthers.size) {
    dv.el(`pre`, `Others: ${JSON.stringify(Array.from(filteredOthers), null, ' ')}`)
}

// const today = DateTime.now()
// console.log(habits)
// habits.forEach(h => {
//     let entries = Object.entries(h.data)
//     dv.paragraph(`${h.title}: ${h.streak()} ${entries.length}`)
// })

// console.log(app.plugins.plugins["obsidian-charts"])
console.log(highLevelChartData)