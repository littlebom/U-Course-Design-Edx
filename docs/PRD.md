# Product Requirements — OLX Course Builder

## 1. Vision
เครื่องมือเว็บ (single-page) สำหรับนักออกแบบหลักสูตร / ครู / ทีม content ที่ต้องการสร้างคอร์สบน Open edX โดยไม่ต้องสร้างทีละ unit ใน Studio — ใช้ JSON เป็น source of truth, แก้ผ่าน UI, แล้ว export เป็น `.tar.gz` (OLX bundle) ที่ import กลับเข้า Studio ได้ทันที (Tools → Import)

## 2. ผู้ใช้เป้าหมาย
- ครู / อาจารย์ที่สร้างคอร์สเองและไม่อยากคลิกใน Studio ทีละ block
- ทีม content / instructional design ที่ต้องการสร้างคอร์สจาก spreadsheet หรือ LLM-generated content
- ผู้ดูแลแพลตฟอร์ม MOOC (เช่น ThaiMOOC) ที่ต้องการ import คอร์สจำนวนมาก

## 3. ขอบเขต MVP

### 3.1 Block ที่รองรับ
| Block | OLX folder | สถานะ |
|---|---|---|
| Course / Chapter / Sequential / Vertical | `course/`, `chapter/`, `sequential/`, `vertical/` | ✅ |
| HTML | `html/<id>.{xml,html}` | ✅ + TinyMCE rich editor |
| Problem (Multiple Choice) | `problem/<id>.xml` (`<multiplechoiceresponse>`) | ✅ |
| Problem (Checkbox) | `problem/<id>.xml` (`<choiceresponse><checkboxgroup>`) | ✅ |
| Video (YouTube) | `video/<id>.xml` | ✅ |
| Course Overview / About | `about/*.html` | ✅ |
| Static assets | `static/<file>` | ✅ via image upload |
| Discussion / LTI / DnD / String/Numerical Response | — | ❌ out of scope |

### 3.2 Editor Features
- **Course Outline Designer** — tree view, rename inline (double-click), reorder ↑↓, delete, add chapter/sequential/vertical/block
- **Block Editor**
  - HTML block: TinyMCE WYSIWYG (toolbar เหมือน Open edX Studio) + Source mode
  - Problem block: question (HTML), choices with correct toggle, max attempts, show answer mode
  - Video block: YouTube ID/URL (auto-extract from full URL), download permission, embedded preview
- **Bulk Problem Import** — โหลด CSV หรือ JSON เพื่อสร้าง problems หลายข้อพร้อมกัน
- **Asset Manager** — drag-drop multi-file upload, อ้างใน HTML ผ่าน scheme `asset://<filename>` (rewrite เป็น `/static/<file>` ตอน export)
- **Image upload จากใน TinyMCE** — auto-route ไป asset panel ขวามือ, HTML ที่ได้ใช้ `asset://`
- **Course Info dialog** — แก้ overview HTML, short description, intro video, effort, duration, subtitle
- **Validation panel** — Zod schema + ตรวจ missing assets + choices ไม่มี correct + MCQ มีคำตอบถูกหลายข้อ

### 3.3 Persistence
| ระดับ | Trigger | ปลายทาง |
|---|---|---|
| Auto-save | ทุกการแก้ (debounce 500ms) | localStorage `olx-builder:course:v1` |
| Linked file (Save As) | คลิก Save / ลิงก์แล้ว auto-write | ไฟล์ .json บน disk ผ่าน File System Access API |
| Download JSON | ปุ่ม Save (browser ที่ไม่รองรับ FSA) | ดาวน์โหลด `.json` |
| Reset | ปุ่ม Reset | ล้าง localStorage + โหลด sample |
| Export OLX | ปุ่ม Export | ดาวน์โหลด `.tar.gz` |

### 3.4 UI Requirements
- 3-pane layout: Outline (4/12) | Block Editor (5/12) | Sidebar (3/12)
- Sidebar collapsible (เก็บสถานะใน localStorage)
- Sidebar contains: Course meta (org/code/run/title) + Asset Uploader + Validation Panel
- Header: logo, course title summary, action buttons (Course Info / Save / Reset / Sample / Import / Export / Toggle sidebar)
- ฟอนต์ Sarabun ทั้งระบบ (รองรับภาษาไทย), JetBrains Mono สำหรับ code
- สี/component จาก Dashcode (cherry-picked: button/card/dialog/tabs/input/textarea/label/badge/separator)
- Border radius: card = 5px, button/input ใช้ default Dashcode

## 4. JSON Schema (Source of Truth)
ดู [`lib/schema.ts`](../lib/schema.ts) — Zod schemas สำหรับ:
- `courseSchema` (root)
  - `course` (org, courseCode, run, displayName, language, start, selfPaced)
  - `about` (shortDescription, overview, effort, duration, introVideoYoutubeId, subtitle)
  - `grading` (cutoffs, graders[])
  - `chapters[]` → `sequentials[]` → `verticals[]` → `blocks[]`
- `blockSchema` = discriminated union: `html | problem | video`

## 5. OLX Output Spec
ต้อง match ของจริงที่ Open edX export ออกมา (อ้างอิงจากตัวอย่าง `course.kkhtB4.tar.gz` ของ TAT Academy):

```
course/
  course.xml                         # <course url_name=run org=... course=...>  pointer
  course/<run>.xml                   # <course display_name=...> + <chapter>* + <wiki>
  chapter/<id32>.xml                 # <chapter display_name=...> + <sequential>*
  sequential/<id32>.xml              # <sequential> + <vertical>*
  vertical/<id32>.xml                # <vertical> + <html|problem|video>*
  html/<id32>.xml                    # <html filename="<id32>"/>  pointer
  html/<id32>.html                   # actual HTML
  problem/<id32>.xml                 # <problem markdown="..."> + response variant
  video/<id32>.xml                   # <video youtube="1.00:..." youtube_id_1_0=...>
  policies/<run>/policy.json         # mirror of run xml attrs
  policies/<run>/grading_policy.json # GRADER[] + GRADE_CUTOFFS
  about/                             # title, subtitle, overview, short_description, effort, duration, video, description
  assets/assets.xml                  # <assets/> empty
  static/<file>                      # uploaded files
```

**Hard rules:**
- `url_name` = 32-char hex (uuid4 ไม่มี `-`) — เป็นทั้งชื่อไฟล์และ reference
- HTML ต้องเป็น pointer + ไฟล์ `.html` แยก ไม่ inline
- MCQ ใช้ `<choicegroup type="MultipleChoice">`, checkbox ใช้ `<choiceresponse><checkboxgroup>`
- Problem มี `markdown` attribute เป็น Studio-style markdown (auto-generate จาก choices)
- `start` ใน run xml เป็น JSON-encoded string (`"&quot;2026-06-01T00:00:00Z&quot;"`)
- Static asset path ใน HTML ใช้ `/static/<filename>`

## 6. Acceptance Criteria
1. `npm run dev` รันบน Node 22 ได้, `next build` clean ไม่มี TS error
2. Load sample → tree แสดง 6 บทครบ + block ทุก type
3. Outline operations: rename inline / move ↑↓ / delete / add ใหม่ → state ถูก
4. TinyMCE upload image → Asset panel ขวามือเด้งไฟล์ + HTML ใช้ `asset://`
5. Bulk import 10 problems CSV/JSON → เข้า vertical ที่เลือก
6. Open File `.json` → แก้ → ไฟล์บน disk update อัตโนมัติ
7. Export → `.tar.gz` มี `course/`, `course/<run>.xml`, `chapter/`, `sequential/`, `vertical/`, `html/{xml,html}`, `problem/`, `video/`, `static/`, `policies/<run>/{policy,grading_policy}.json`, `about/*.html`
8. นำไฟล์ `.tar.gz` ไป import เข้า Open edX Studio (Tools → Import) ต้องเปิดได้ ทุก problem ตรวจคำตอบถูก รูปใน HTML แสดงผล video เล่นได้

## 7. Out of Scope (รุ่นแรก)
- Multi-user / authentication / cloud sync
- Re-import OLX → JSON (เฉพาะทางเดียว)
- Drag-and-drop problem, LTI, discussion
- String / Numerical / Custom response problem
- Advanced policies (cohorts, prerequisites, paced)
- Import jobs / queueing / progress streaming
