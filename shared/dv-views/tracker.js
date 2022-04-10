let { DateTime } = dv.luxon
let startDay = DateTime.now().minus({ years: 1 })
let allowed = new Set(["weight", "waist", "happiness", "body fat"])

const scaleCfg = {
    axis: 'y',
    ticks: {
        display: false,
    },
    grid: {
        drawTicks: false,
        display: false,
        // drawBorder: false
    }
}

let chartData = {
    type: 'line',
    data: {
        datasets: []
    },
    options: {
        animation: false,
        // plugins: {
        //     legend: { display: false }
        // },
        scales: {
            xAxis: {
                ...scaleCfg,
                axis: 'x',
                ticks: {
                    display: true,
                    callback: function (value, index) {
                        return index % 4 === 0 ? this.getLabelForValue(value) : ''
                    }
                }
            }
        }
    }
}
let fileDay = (p) => p.file.day || p.file.cday
let colors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)'
]

let others = new Set()
let tracked = {}
let trackerPages = dv.pages(`-"shared"`)
    .where(p => {
        if (!p.track) { return }
        let day = fileDay(p)
        return startDay < day
    })
    .sort(p => fileDay(p), "asc")
    .forEach(p => {
        let { track } = p
        for (let [key, value] of Object.entries(track)) {
            if (!allowed.has(key)) { others.add(key); continue }

            let day = fileDay(p)
            tracked[key] = tracked[key] || []
            tracked[key].push({
                x: day.toISODate(),
                y: value
            })
            chartData.options.scales[key] = scaleCfg
        }
    })

for (let [label, data] of Object.entries(tracked)) {
    let color = colors[chartData.data.datasets.length % colors.length]
    chartData.data.datasets.push({
        yAxisID: label,
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        spanGaps: true
    })
}

window.renderChart(chartData, dv.container)
// dv.list([...others])