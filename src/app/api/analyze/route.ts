import { NextResponse } from 'next/server';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import Groq from 'groq-sdk';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      Вивід повинен бути суворо у форматі JSON, без додаткового тексту чи пояснень.
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

    let parsedData = null;

    try {
      // Спроба 1: Б'ємо в Gemini
      const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite', // Або 1.5-flash
          contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              { role: 'user', parts: [{ text: text }] }
          ],
          config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              safetySettings: [
                  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
              ]
          }
      });

      const rawText = response.text || '{}';
      const cleanedText = rawText.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleanedText);

      // Якщо Gemini повернув порожній об'єкт через приховану цензуру — тригеримо помилку, щоб перейти до Groq
      if (Object.keys(parsedData).length === 0 || parsedData.error) {
        throw new Error('GEMINI_CENSORED_OR_EMPTY');
      }

    } catch (geminiError) {
      console.log('Gemini відхилив запит (Цензура/Збій). Перемикання на Groq (Llama 3)...');

      // Спроба 2: Fallback на Groq (Llama 3 70B - найрозумніша відкрита модель для JSON)
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        // Groq нативно підтримує гарантований вивід JSON
        response_format: { type: 'json_object' }
      });

      const groqText = chatCompletion.choices[0]?.message?.content || '{}';
      parsedData = JSON.parse(groqText);
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Критична помилка обох AI:', error);
    return NextResponse.json(
      { error: 'System Crash', details: error?.message || String(error) }, 
      { status: 500 }
    );
  }
}