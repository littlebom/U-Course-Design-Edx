import type { Course } from "./schema";

export const sampleCourse: Course = {
  course: {
    org: "SRU",
    courseCode: "GED1001-MC1",
    run: "2026T1",
    displayName: "Micro-Course 1: Digital Foundation & The Future",
    language: "th",
    start: "2026-06-01T00:00:00Z",
    selfPaced: true,
  },
  about: {
    shortDescription: "เจาะลึกความฉลาดรู้ทางดิจิทัล (DQ) และเตรียมความพร้อมสู่โลกอนาคตที่ขับเคลื่อนด้วย AI",
    overview:
      "ท่ามกลางกระแสธารแห่งความเปลี่ยนแปลงที่ขับเคลื่อนด้วยปัญญาประดิษฐ์ (AI-Driven Era) ความสามารถในการปรับตัวและการเป็นพลเมืองดิจิทัลที่มีคุณภาพไม่ใช่ทางเลือกอีกต่อไป แต่เป็นทักษะการอยู่รอดพื้นฐานที่สำคัญที่สุดในศตวรรษที่ 21 รายวิชานี้มุ่งเน้นการติดอาวุธทางปัญญาผ่านกรอบแนวคิด 'ความฉลาดรู้ทางดิจิทัล' (Digital Intelligence - DQ) เพื่อให้ผู้เรียนก้าวข้ามขีดจำกัดจากการเป็นเพียงผู้ใช้งาน สู่การเป็นผู้นำเทคโนโลยีที่ชาญฉลาด\n\nผู้เรียนจะได้ร่วมสำรวจระบบนิเวศของโลกดิจิทัลในเชิงลึก ตั้งแต่โครงสร้างพื้นฐานอย่าง Cloud Computing การไหลเวียนของ Big Data ไปจนถึงกลไกการเรียนรู้ของ AI และ Machine Learning ที่กำลังสั่นสะเทือนอุตสาหกรรมทั่วโลก ผ่านเครื่องมือประเมินระดับ DQ มาตรฐานสากล ผู้เรียนจะได้วิเคราะห์จุดแข็งและจุดอ่อนของตนเองเพื่อวางแผนพัฒนาตนเองแบบเฉพาะบุคคล (Personalized Growth) พร้อมทั้งเจาะลึกสถานการณ์ Digital Disruption ที่มีผลต่อตลาดงานในอนาคต (Future of Work 2026) เพื่อสร้างทัศนคติแบบยืดหยุ่น (Agile Mindset) และจริยธรรมในการทำงานร่วมกับปัญญาประดิษฐ์ (Human-AI Collaboration) อย่างยั่งยืน มาร่วมกันเปลี่ยนความกลัวต่อเทคโนโลยีให้กลายเป็นโอกาส และเตรียมความพร้อมเพื่อเป็นบุคลากรที่โลกอนาคตต้องการในหลักสูตรที่เข้มข้นและล้ำสมัยนี้",
    effort: "03:00",
    duration: "1 week",
    introVideoYoutubeId: "VIDEO_ID_INTRO",
    subtitle: "ก้าวข้ามขีดจำกัด สู่ผู้นำดิจิทัลยุค AI",
  },
  grading: {
    cutoffs: { Pass: 0.8 },
    graders: [
      { type: "PreTest", shortLabel: "PT", minCount: 1, dropCount: 0, weight: 0 },
      { type: "Quiz", shortLabel: "Qz", minCount: 3, dropCount: 0, weight: 0.3 },
      { type: "FinalExam", shortLabel: "FE", minCount: 1, dropCount: 0, weight: 0.7 },
    ],
  },
  chapters: [
    {
      displayName: "Section 1 — The Power of Digital Intelligence (DQ)",
      sequentials: [
        {
          displayName: "Subsection 1.1: DQ vs IQ in AI Era",
          verticals: [
            {
              displayName: "บทนำและความหมายของ DQ",
              blocks: [
                { type: "video", displayName: "ยินดีต้อนรับสู่ GED1001 MC1", youtubeId: "VIDEO_ID_1", downloadAllowed: false },
                { type: "video", displayName: "DQ 8 Pillars: ทักษะพลเมืองดิจิทัล", youtubeId: "VIDEO_ID_2", downloadAllowed: false },
                { type: "html", displayName: "สรุปกรอบแนวคิด DQ", html: "<h3>Digital Intelligence (DQ) Framework</h3><p>ความเก่งทางเทคนิคเป็นเพียงส่วนหนึ่ง แต่ความฉลาดในการใช้ชีวิตในโลกดิจิทัลคือหัวใจหลักประกอบด้วย 8 ทักษะสำคัญ...</p>" },
                { type: "html", displayName: "กิจกรรมสะท้อนคิด (Discussion Point)", html: "<div style='background: #f9f9f9; padding: 15px; border-left: 5px solid #2d5f5d;'><p><strong>คำถามชวนคิด:</strong> จาก DQ ทั้ง 8 ด้าน คุณคิดว่าทักษะใดสำคัญที่สุดสำหรับการทำงานในอนาคต? กรุณานำความคิดเห็นของคุณไปแลกเปลี่ยนกับเพื่อนๆ ในเมนู Discussion ของระบบ</p></div>" },
              ],
            },
          ],
        },
        {
          displayName: "Subsection 1.2: Personal DQ Diagnostic",
          verticals: [
            {
              displayName: "การประเมินทักษะดิจิทัลตนเอง",
              blocks: [
                { type: "video", displayName: "แนะนำการใช้เครื่องมือ DQ Diagnostic", youtubeId: "VIDEO_ID_3", downloadAllowed: false },
                {
                  type: "problem",
                  displayName: "Quiz: ความเข้าใจพื้นฐาน DQ",
                  problemType: "multiplechoice",
                  question: "<p>ข้อใดคือเป้าหมายสูงสุดของการพัฒนาทักษะ DQ?</p>",
                  choices: [
                    { text: "การมีตัวตนในโลกออนไลน์ที่โดดเด่น", correct: false },
                    { text: "การเป็นพลเมืองดิจิทัลที่มีจริยธรรมและพร้อมรับการเปลี่ยนแปลง", correct: true },
                  ],
                  maxAttempts: 2,
                  showAnswer: "finished",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      displayName: "Section 2 — Technology Landscape & AI Disruption",
      sequentials: [
        {
          displayName: "Subsection 2.1: Infrastructure & Data",
          verticals: [
            {
              displayName: "หัวใจของเทคโนโลยีสมัยใหม่",
              blocks: [
                { type: "video", displayName: "The Cloud & Connectivity", youtubeId: "VIDEO_ID_4", downloadAllowed: false },
                { type: "video", displayName: "Big Data: พลังแห่งข้อมูล", youtubeId: "VIDEO_ID_5", downloadAllowed: false },
                {
                  type: "problem",
                  displayName: "Quiz: ระบบนิเวศข้อมูล",
                  problemType: "checkbox",
                  question: "<p>คุณลักษณะใดต่อไปนี้ที่ถือว่าเป็นองค์ประกอบของ Big Data?</p>",
                  choices: [
                    { text: "Volume (ปริมาณมหาศาล)", correct: true },
                    { text: "Velocity (ความรวดเร็วในการส่งผ่าน)", correct: true },
                    { text: "Vague (ความคลุมเครือของที่มา)", correct: false },
                    { text: "Variety (ความหลากหลายของรูปแบบ)", correct: true },
                  ],
                  maxAttempts: 1,
                  showAnswer: "finished",
                },
              ],
            },
          ],
        },
        {
          displayName: "Subsection 2.2: Understanding AI",
          verticals: [
            {
              displayName: "การทำงานของปัญญาประดิษฐ์",
              blocks: [
                { type: "video", displayName: "How AI Thinks: กระบวนการคิดของ AI", youtubeId: "VIDEO_ID_6", downloadAllowed: false },
                { type: "video", displayName: "AI & Machine Learning พื้นฐาน", youtubeId: "VIDEO_ID_7", downloadAllowed: false },
                { type: "html", displayName: "Interactive Visualizer Link", html: "<p>คลิกเพื่อทดลองใช้เครื่องมือ Neural Network Playground เพื่อทำความเข้าใจการเรียนรู้ของเครื่อง</p>" },
              ],
            },
          ],
        },
      ],
    },
    {
      displayName: "Section 3 — Future-Proofing Your Career",
      sequentials: [
        {
          displayName: "Subsection 3.1: Digital Transformation",
          verticals: [
            {
              displayName: "การเตรียมความพร้อมสู่อนาคต",
              blocks: [
                { type: "video", displayName: "วิเคราะห์ตลาดงานปี 2026", youtubeId: "VIDEO_ID_8", downloadAllowed: false },
                { type: "video", displayName: "Case Study: โลกที่เปลี่ยนไป", youtubeId: "VIDEO_ID_9", downloadAllowed: false },
              ],
            },
          ],
        },
        {
          displayName: "Subsection 3.2: Human-AI Collaboration",
          verticals: [
            {
              displayName: "บทสรุปและจริยธรรมเทคโนโลยี",
              blocks: [
                { type: "video", displayName: "Co-pilot Mindset: ทำงานร่วมกับ AI", youtubeId: "VIDEO_ID_10", downloadAllowed: false },
                {
                  type: "problem",
                  displayName: "Final Exam: Micro-Course 1",
                  problemType: "multiplechoice",
                  question: "<p>Agile Mindset ในยุค Digital Transformation มีความสำคัญอย่างไร?</p>",
                  choices: [
                    { text: "ช่วยให้สามารถปรับเปลี่ยนกลยุทธ์ได้ทันทีตามสถานการณ์ข้อมูลที่เปลี่ยนไป", correct: true },
                    { text: "ช่วยให้ประหยัดงบประมาณในการจ้างงานบุคลากรไอที", correct: false },
                    { text: "ช่วยลดขั้นตอนการทำงานให้เหลือเพียงอย่างเดียว", correct: false },
                  ],
                  maxAttempts: 2,
                  showAnswer: "finished",
                },
                { type: "video", displayName: "บทสรุปและแนะนำรายวิชาถัดไป", youtubeId: "VIDEO_ID_FINALE", downloadAllowed: false },
              ],
            },
          ],
        },
      ],
    },
  ],
};
