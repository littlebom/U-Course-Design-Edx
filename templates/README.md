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

## 2) ชุดข้อสอบ — `quiz-template.csv` หรือ `quiz-template.json`
นำเข้า problem หลายข้อพร้อมกันเข้าไปใน Unit

**วิธีใช้:** เลือก Unit ในคอร์ส → ปุ่ม **"Bulk Import"** → เลือกแท็บ CSV หรือ JSON → อัปโหลด/วางไฟล์ → Import

### รูปแบบ CSV
คอลัมน์: `displayName, problemType, question, choices, maxAttempts`
- `choices` คั่นแต่ละตัวเลือกด้วย `|` และใส่ `*` ต่อท้ายข้อที่ถูก
  เช่น `3|4*|5` = ข้อ "4" ถูก
- multiplechoice/dropdown = ถูกได้ข้อเดียว · checkbox = ถูกได้หลายข้อ

### รูปแบบ JSON
อาเรย์ของ object: `{ displayName, problemType, question, choices: [{text, correct}], maxAttempts }`
- `question` ใส่ HTML ได้ (เช่น `<p>...</p>`, `<strong>`, `<em>`)

### ชนิดข้อสอบ (problemType) ที่ template นี้ครอบคลุม
`multiplechoice` · `checkbox` · `dropdown` (แบบเลือกตอบ)

> ชนิด `numerical` (ตอบเป็นตัวเลข) และ `text` (ตอบเป็นข้อความ) แนะนำให้สร้าง/แก้ในตัวแก้ไข Problem โดยตรง
