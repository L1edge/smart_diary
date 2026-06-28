import { NextResponse } from 'next/server';
// Додали імпорт HarmCategory та HarmBlockThreshold
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { text, userContext } = await req.json();

    const systemPrompt = `
      Ти — аналітичний механізм щоденника. Проаналізуй транзакційний лог користувача.
      Контекст користувача: Професія - ${userContext?.occupation || 'не вказано'}, Хобі - ${userContext?.hobbies || 'не вказано'}.
      
      Твоя задача — розпарсити неструктурований текст на атомарні дані. 
      1. Оціни показники (mood, energy, stress) від 1 до 10.
      2. Витягни ключові теги та головний інсайт (insight_sentence).
      3. Відслідкуй рух до цілей (goals_progress), майбутні плани/події (upcoming_events) та виконання регулярних звичок (checklist_hits).
      4. Згенеруй 1-2 навідні запитання (follow_up_questions), якщо помітиш прогалини у патернах (наприклад, користувач давно не згадував про ціль) в питаннях упомини про це, а якщо не було прогалин, то питання зв'язані з минулими записами.
      
      Поверни суворий JSON без маркдауну у такому форматі:
      {
        "mood": number,
        "energy": number,
        "stress": number,
        "tags": string[],
        "insight_sentence": string,
        "goals_progress": [
          { "goal_name": string, "progress_made": boolean, "details": string }
        ],
        "upcoming_events": [
          { "event_name": string, "date": string, "time": string }
        ],
        "checklist_hits": [
          { "habit_name": string, "completed": boolean }
        ],
        "follow_up_questions": string[]
      }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'user', parts: [{ text: text }] }
        ],
        config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            // Тепер використовуємо правильні типи з SDK
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE
                }
            ]
        }
    });

    const rawText = response.text || '{}';
    const cleanedText = rawText.replace(/```json\n?|\n?```/g, '').trim();
    
    const data = JSON.parse(cleanedText);
    return NextResponse.json(data);

} catch (error: any) {
    // Логуємо в термінал сервера (VS Code)
    console.error('=== GEMINI RAW ERROR ===');
    console.error(error);
    
    // Відправляємо деталі прямо на фронт
    return NextResponse.json(
      { 
        error: 'System Crash', 
        details: error?.message || String(error),
        name: error?.name
      }, 
      { status: 500 }
    );
  }
}