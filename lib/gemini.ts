import { GoogleGenerativeAI } from '@google/generative-ai';

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not configured!');
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use available models in priority order: lite version first (faster), then fallback to non-lite
const modelName = 'gemini-2.5-flash-lite';

const model = genAI.getGenerativeModel({
  model: modelName,
  generationConfig: {
    maxOutputTokens: 4096,
    temperature: 1,
  },
});

console.log('✅ Gemini API initialized with model:', modelName);

export const ANALYZE_PROSPECT_PROMPT = (company: string, content: string, service: string) => `
You are an expert cold email prospecting specialist.
Analyze this company content and find 3 VERY SPECIFIC cold email angles.
Each angle must be based on actual evidence from the content.

COMPANY: ${company}
CONTENT: ${content}
SERVICE TO SELL: ${service}

CRITICAL BUSINESS LOGIC
Before generating angles, DETERMINE the company type:
Read the content and infer what this company actually provides/does.
If the company IS a provider of the same service being sold:
  Example: Prospect = Stripe, Service = "Payment Processing Integration" → MISMATCH
  Do NOT generate angles about "helping them scale payments" or "optimizing their own tools"
  If MISMATCH detected, generate angles around:
    - Partnership/co-development opportunities
    - Building on top of their platform
    - White-label extensions
  Never: selling them their own product
If no mismatch, generate normal cold email angles.

IMPORTANT: You MUST return ONLY a valid JSON object, nothing else. No markdown, no explanation.
Start with { and end with }

{
  "companyName": "string",
  "angles": [
    {
      "type": "recent_achievement|product_launch|team_change|funding|hiring|content_marketing|tech_stack|market_problem|specific_metric|partnership_opportunity|platform_extension",
      "hook": "specific first line hook under 50 chars",
      "evidence": "exact quote or specific detail from content",
      "reasoning": "why this matters",
      "connection": "how your service helps solve this"
    }
  ]
}

Requirements:
- Score 1-10, reject if <6
- Hook must be SPECIFIC, not generic
- Hook length: MUST be under 50 chars for maximum impact
- Evidence must be traceable to content
- Max 3 angles
- Sort by specificityScore descending
- Language rule: All output MUST be in English only. If source content is in another language, translate evidence snippets to English. DO NOT mix languages in a single field.
- RETURN ONLY JSON, NO OTHER TEXT
`;

export const GENERATE_EMAILS_PROMPT = (company: string, hook: string, evidence: string, service: string) => `
Generate 3 cold email variants based on this specific angle.

COMPANY: ${company}
HOOK: ${hook}
EVIDENCE: ${evidence}
SERVICE: ${service}

TONE GUIDELINES (CRITICAL)
Write emails like a busy founder who did real research, NOT like a corporate marketer.

Forbidden phrases (delete them from all outputs):
- "I hope this email finds you well"
- "unlock value"
- "leverage"
- "synergies"
- "world-class"
- "cutting-edge"
- "We help industry leaders like..."
- "optimize" (use "improve" or be specific instead)
- "enhance your existing"
- "innovative solutions"

Required style:
- Short sentences. Under 15 words per sentence.
- Plain English. Use words a 12-year-old knows.
- Conversational tone, like you're texting a friend.
- One clear idea per email.
- Use specific company details, not generic praise.

IMPORTANT: You MUST return ONLY a valid JSON object, nothing else. No markdown, no explanation.
Start with { and end with }

{
  "variants": [
    {
      "type": "direct|question|value-first",
      "subject": "direct hook, under 50 chars, low friction",
      "body": "under 120 words, specific hook first line",
      "reasoning": "why this approach works"
    }
  ],
  "followUps": [
    {
      "day": 3,
      "subject": "soft bump, specific detail, under 40 chars",
      "body": "soft bump, under 80 words, no pressure"
    },
    {
      "day": 7,
      "subject": "final follow up, direct idea, under 40 chars",
      "body": "exit option included, under 80 words, clear close"
    }
  ]
}

Requirements:
- First line = the exact hook from the angle
- Subject line max 50 chars, no clickbait
- Body max 120 words total
- Must read like a human wrote it in 2 minutes, not an AI in an hour
- Never over-praise the prospect more than once
- If mentioning their strengths, immediately pivot to what they might be missing
- No spam triggers (free, discount, urgent)
- You/I ratio > 3:1
- Subject line style:
  - MUST be under 50 chars max
  - Use specific detail from their company/content, NOT generic praise
  - Examples of GOOD: "One thing about your 'How do you train' section", "Quick thought on your Stripe Connect"
  - Examples of BAD: "Let's talk about your business", "Interested in a quick chat?"
  - Lead with curiosity or specific observation, not your service
- Follow-up style:
  - Day 3: Soft bump with specific detail (80 words max), no pressure
  - Day 7: Direct close ("Simple idea: [concrete benefit]" or clear exit: "If this isn't a priority, just reply STOP")
  - No guilt-tripping or manipulation
- RETURN ONLY JSON, NO OTHER TEXT
`;

export const HANDLE_RESPONSE_PROMPT = (originalEmail: string, prospectResponse: string, angleUsed: string) => `
Analyze this cold email response and generate perfect replies.

ORIGINAL_EMAIL: ${originalEmail}
PROSPECT_RESPONSE: ${prospectResponse}
ANGLE_USED: ${angleUsed}

IMPORTANT: You MUST return ONLY a valid JSON object, nothing else. No markdown, no explanation.
Start with { and end with }

{
  "analysis": {
    "sentiment": "positive|neutral|negative|ghosting_prevention",
    "objectionType": "price_concern|timing_issue|no_need|trust_barrier|brush_off|info_request|meeting_request|none",
    "urgency": "high|medium|low",
    "buyingSignals": ["signal1", "signal2"],
    "redFlags": ["flag1", "flag2"],
    "recommendedAction": "what to do next"
  },
  "replies": [
    {
      "variant": "direct|soft",
      "subject": "subject under 50 chars",
      "body": "under 100 words, framework: acknowledge + empathize + address + micro-commit + leave door open"
    }
  ]
}

Requirements:
- Acknowledge their concern specifically
- Offer micro-commitment (not big ask)
- Leave door open gracefully
- No pushiness or desperation
- Match their tone
- RETURN ONLY JSON, NO OTHER TEXT
`;

export async function analyzeProspect(company: string, content: string, service: string) {
  let lastError: Error | null = null;
  // Order: lite first (faster), then regular versions
  const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
  
  for (const modelName of models) {
    try {
      // Validate inputs
      if (!company || !content || !service) {
        throw new Error(`Missing required inputs: company=${!!company}, content=${!!content}, service=${!!service}`);
      }

      let contentToUse = content;
      if (contentToUse.length > 30000) {
        console.warn(`Content is very long (${contentToUse.length} chars), truncating to 30000 chars`);
        contentToUse = contentToUse.substring(0, 30000);
      }

      const prompt = ANALYZE_PROSPECT_PROMPT(company, contentToUse, service);
      console.log(`Calling Gemini API (${modelName}) with company: ${company}, service: ${service}, content length: ${contentToUse.length}`);
      
      // Get model for this attempt
      const attemptModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 1,
        },
      });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API timeout (${modelName}) after 30 seconds`)), 30000)
      );
      
      const result = await Promise.race([
        attemptModel.generateContent(prompt),
        timeoutPromise as Promise<any>
      ]);
      
      let text = result.response.text();

      console.log(`=== GEMINI RESPONSE (${modelName}) ===`);
      console.log(text.substring(0, 500)); // Log only first 500 chars
      console.log('=== END RESPONSE ===');

      // Remove markdown code blocks
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Try to find complete JSON object
      let jsonStr: string | null = null;
      
      // Strategy 1: Find first { and last }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = text.substring(firstBrace, lastBrace + 1);
      }

      if (!jsonStr) {
        throw new Error(`Could not extract JSON from response: ${text.substring(0, 300)}`);
      }

      console.log('Extracted JSON:', jsonStr.substring(0, 300));

      try {
        const parsed = JSON.parse(jsonStr);
        console.log(`✅ Successfully analyzed with ${modelName}`);
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('JSON string:', jsonStr.substring(0, 500));
        
        // Last resort: try to fix escaped newlines in strings
        let fixed = jsonStr
          .replace(/\n/g, ' ') // Replace actual newlines with spaces
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/:\s*undefined/g, ': null')
          .trim();
        
        return JSON.parse(fixed);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`❌ Analysis failed with ${modelName}:`, lastError.message);
      
      // If this is the last model, throw the error
      if (modelName === models[models.length - 1]) {
        throw lastError;
      }
      // Otherwise, continue to next model
      console.log(`Retrying with next model...`);
    }
  }
  
  throw lastError || new Error('Analysis failed with all available models');
}

export async function generateEmails(company: string, hook: string, evidence: string, service: string) {
  try {
    const prompt = GENERATE_EMAILS_PROMPT(company, hook, evidence, service);
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Remove markdown code blocks
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('Gemini raw response (cleaned):', text.substring(0, 300));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not find JSON in response:', text);
      throw new Error(`Invalid JSON response. Response: ${text.substring(0, 500)}`);
    }

    const jsonStr = jsonMatch[0];
    
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempting to fix JSON...');
      
      let fixed = jsonStr
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/:\s*undefined/g, ': null')
        .replace(/'/g, '"');
      
      return JSON.parse(fixed);
    }
  } catch (error) {
    console.error('Generate emails error:', error);
    throw error;
  }
}

export async function handleResponse(originalEmail: string, prospectResponse: string, angleUsed: string) {
  try {
    const prompt = HANDLE_RESPONSE_PROMPT(originalEmail, prospectResponse, angleUsed);
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Remove markdown code blocks
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('Gemini raw response (cleaned):', text.substring(0, 300));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not find JSON in response:', text);
      throw new Error(`Invalid JSON response. Response: ${text.substring(0, 500)}`);
    }

    const jsonStr = jsonMatch[0];
    
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempting to fix JSON...');
      
      let fixed = jsonStr
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/:\s*undefined/g, ': null')
        .replace(/'/g, '"');
      
      return JSON.parse(fixed);
    }
  } catch (error) {
    console.error('Handle response error:', error);
    throw error;
  }
}
