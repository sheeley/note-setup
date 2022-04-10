# Record Types

```dataviewjs
let skip = new Set(["journal"])

let recordTypes = dv.pages().where(p => p.record).distinct(p => p.record).map(p => p.record).array()
let recordHomes = dv.pages().where(p => p.recordHome).array()
    .reduce((o, p) => {
		let home = p.recordHome
		if (typeof home == "string") {
			home = [home]
		}
		for (let recHome of home) {
			o[recHome] = true
		}
        return o
    }, {})

let missing = []
for (let t of recordTypes) {
    if (!skip.has(t) && !recordHomes[t]) {
        missing.push(t)
    }
}

if (missing.length) {
    dv.header(2, "Missing Homes")
    dv.list(missing)
}
```

```dataview
table recordHome as Types
where recordHome
sort file.name
```
