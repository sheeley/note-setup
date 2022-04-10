
```dataviewjs
let recordType = "person"
let tag = "#person"
let moveTo = "people"

recordType = "quote"
tag = "quotes"
moveTo = "quotes"

let p = dv.pages(`-"shared" AND -"${moveTo}"`)
  .where(p => {
    if (recordType && p.record == recordType) { return true }

	if (tag) {
		let tags = new Set(p.tags)
		if (tags.has(tag)) { return true }
     }
  })
  .file.path.map(p => `mv "${p}" ${moveTo}/`)

p = dv.pages(`"quotes"`)
  .where(p => {
    if (p.record != "quote") { return true }
  })
  .file.path.map(p => `"${p}"`)
dv.paragraph(p)
```