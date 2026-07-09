# Template — โครงสร้างคอร์ส & ชุดข้อสอบ (Quiz)

ไฟล์ตัวอย่างสำหรับนำเข้า (import) เข้า U-CourseBuilder

## 1) โครงสร้างคอร์ส — `course-outline-template.md`
สร้างโครงบท/หัวข้อ/Unit จาก Markdown

| Markdown | กลายเป็น |
|----------|----------|
| `# หัวข้อ` | บท (Section) |
| `## หัวข้อ` | หัวข้อย่อย (Subsection) |
| `### หัวข้อ` | Unit (ได้บล็อก HTML ว่าง 1 อัน) |

**วิธีใช้:** ในหน้าแก้คอร์ส → ปุ่ม **"Markdown"** → วางเนื้อหาไฟล์นี้ → ดูพรีวิว → Import
(เติมเนื้อหา/วิดีโอ/ข้อสอบในแต่ละ Unit ภายหลังในตัวแก้ไข)

## 2) ชุดข้อสอบ — `quiz-template.csv` · `quiz-template.json` · `quiz-template.xml`
นำเข้า problem หลายข้อพร้อมกันเข้าไปใน Unit (คอร์ส) หรือ Library

**วิธีใช้:** เลือก Unit ในคอร์ส (หรือหน้าแก้ Library) → ปุ่ม **"Bulk Import"** → เลือกแท็บ CSV / JSON / XML → อัปโหลด/วางไฟล์ → Import
(กดปุ่ม **"ใส่ตัวอย่าง"** ในหน้าต่างเพื่อเติม template ตั้งต้นได้)

### ชนิดข้อสอบ (problemType) ที่รองรับ
| ชนิด | ความหมาย | CSV | JSON | XML |
|------|----------|:---:|:----:|:---:|
| `multiplechoice` | เลือกตอบข้อเดียว | ✅ | ✅ | ✅ |
| `checkbox` | เลือกได้หลายข้อ | ✅ | ✅ | ✅ |
| `dropdown` | เมนูดรอปดาวน์ | ✅ | ✅ | ✅ |
| `numerical` | ตอบเป็นตัวเลข | — | ✅ | ✅ |
| `text` | ตอบเป็นข้อความ | — | ✅ | ✅ |

> ชนิด `numerical` / `text` ต้องใช้ **JSON หรือ XML** (CSV รองรับเฉพาะแบบเลือกตอบ)

### รูปแบบ CSV — `quiz-template.csv`
คอลัมน์: `displayName, problemType, question, choices, maxAttempts`
- `choices` คั่นแต่ละตัวเลือกด้วย `|` และใส่ `*` ต่อท้ายข้อที่ถูก
  เช่น `3|4*|5` = ข้อ "4" ถูก · checkbox ใส่ `*` ได้หลายข้อ

### รูปแบบ JSON — `quiz-template.json`
อาเรย์ของ object แต่ละข้อ:
- เลือกตอบ: `choices: [{ text, correct, hint? }]` — หรือย่อเป็นสตริง `"4*"` (ใส่ `*` = ถูก)
- ตัวเลข: `numericalAnswer` (ตัวเลข) + `numericalTolerance` (เช่น `"0.01"` หรือ `"2%"`)
- ข้อความ: `textAnswers: [...]` + `textMatchMode`: `exact | ci | regex | ci-regex`
- ฟิลด์เสริมทุกชนิด: `maxAttempts`, `showAnswer`, `explanation`, `weight`, `shuffle`
- `question` / `explanation` ใส่ HTML ได้ (เช่น `<p>...</p>`, `<strong>`, `<em>`)

### รูปแบบ XML — `quiz-template.xml`
ครอบทุกข้อด้วย `<problems>`; แต่ละข้อ `<problem problemType="...">` มีคำอธิบายรายฟิลด์อยู่ในหัวไฟล์
- เลือกตอบ: `<choices><choice correct="true" hint="...">…</choice></choices>`
- ตัวเลข: `<numericalAnswer tolerance="0.01">3.14</numericalAnswer>`
- ข้อความ: `<textAnswers><answer>…</answer></textAnswers>` (`matchMode` เป็น attribute ของ `<problem>`)
- เนื้อหา HTML ใน `<question>` / `<explanation>` ครอบด้วย `<![CDATA[ ... ]]>`
