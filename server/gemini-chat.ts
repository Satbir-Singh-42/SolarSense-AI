import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiCache, generateChatCacheKey } from "./api-cache";

// dotenv is loaded once in server/index.ts — no need to call it again
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const CHAT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function generateEnergyOptimizationResponse(
  userMessage: string,
  userContext?: {
    username: string;
    location?: string;
    households?: any[];
    energyData?: any;
  },
): Promise<string> {
  // Check cache for identical questions
  const cacheKey = generateChatCacheKey(userMessage, []);
  const cached = apiCache.get(cacheKey);
  if (cached) return cached as string;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
        topP: 0.9,
      },
    });

    const contextInfo = userContext
      ? `
USER CONTEXT:
- Name: ${userContext.username}
- Location: ${userContext.location || "Not specified"}
- Households: ${userContext.households?.length || 0} registered
- Has energy data: ${userContext.energyData ? "Yes" : "No"}
${userContext.energyData ? `- Solar capacity: ${userContext.energyData.solarCapacity || "N/A"} kW` : ""}
${userContext.energyData ? `- Battery level: ${userContext.energyData.batteryLevel || "N/A"}%` : ""}
`
      : "";

    const systemPrompt = `You are SolarSense AI — an expert solar energy advisor for residential users in India.

${contextInfo}

RULES:
- Maximum 3 concise sentences
- Give specific, actionable advice with numbers when possible
- Reference Indian market rates (₹6.5/kWh, ₹45/watt) when relevant
- If the user's data is available, personalize the answer
- Use markdown formatting for clarity (bold key terms, bullet points if needed)

QUESTION: ${userMessage}

ANSWER:`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();

    // Cache the response
    apiCache.set(cacheKey, text, CHAT_CACHE_TTL);
    return text;
  } catch (error) {
    console.error("Gemini AI error:", error);

    const q = userMessage.toLowerCase();
    if (q.includes("solar"))
      return "Keep panels clean and unshaded for best output. Peak generation is between 10 AM–2 PM. A typical 5 kW system saves ~₹50,000/year.";
    if (q.includes("battery"))
      return "Keep batteries between 20–80% charge to maximize lifespan. Lithium-ion batteries in India cost ₹8–12/Wh.";
    if (q.includes("trade") || q.includes("sell"))
      return "You can trade surplus energy with neighbours through SolarSense. Price your energy competitively around ₹5–6/kWh.";
    return "I'm having trouble connecting to the AI service. Please try again shortly.";
  }
}
