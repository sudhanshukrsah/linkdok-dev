/**
 * AI Tutor Service - Using OpenRouter via Serverless API
 * Answers questions using resources + general AI knowledge
 */

// Use serverless API endpoint instead of direct API calls
const API_ENDPOINT = '/api/chat';

// Primary model - most cost-effective
const PRIMARY_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

// Fallback models if primary fails
const FALLBACK_MODELS = [
  'nex-agi/deepseek-v3.1-nex-n1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'google/gemma-3-27b-it:free'
];

async function callOpenRouter(messages, { temperature = 0.2, maxTokens = 1024 } = {}) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      console.log(`Tutor using model: ${model}`);
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || response.statusText);
      }

      const data = await response.json();
      const result = data?.choices?.[0]?.message?.content?.trim() || 'I could not generate a response.';
      console.log(`✓ Tutor success with model: ${model}`);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`✗ Tutor model ${model} failed: ${err.message}`);
      // Try next model if available
      if (i < modelsToTry.length - 1) {
        continue;
      }
    }
  }

  throw new Error(`All tutor models failed. Last error: ${lastError?.message}`);
}

/**
 * Ask a question to the AI tutor
 */
export async function askTutor(question, resourceContents) {
  if (!question?.trim()) {
    return {
      answer: 'Please ask a valid question.',
      basedOnResources: false
    };
  }

  if (!Array.isArray(resourceContents) || resourceContents.length === 0) {
    return {
      answer: 'This category has no resources yet. Please add links so I can learn from them.',
      basedOnResources: false
    };
  }

  // Combine extracted resource text with larger limits
  const combinedContent = resourceContents
    .filter(r => r.success && r.extractedText)
    .map((r, i) => {
      return `=== RESOURCE ${i + 1}: ${r.url} ===\n${r.extractedText.slice(0, 15000)}`;
    })
    .join('\n\n')
    .slice(0, 60000); // Increased total limit to 60KB

  const hasResources = combinedContent.trim().length > 0;
  
  // Log content for debugging
  console.log(`AI Tutor - Processing ${resourceContents.filter(r => r.success).length} resources`);
  console.log(`Total content length: ${combinedContent.length} characters`);

  // Smart prompt - uses resources if available, otherwise general knowledge
  const prompt = hasResources 
    ? `You are a helpful AI tutor with access to the student's study materials.

INSTRUCTIONS:
1. FIRST, check if the answer is in the study materials below
2. If found in materials: Answer using that information and cite the resource
3. If NOT found in materials: Use your general knowledge to answer, but mention you're using external knowledge
4. Be concise and direct - answer only what was asked
5. Use simple formatting: headings (##), bullet points (-), and **bold** for key terms

STUDY MATERIALS:
${combinedContent}

STUDENT'S QUESTION:
${question}

Provide a clear, helpful answer. If using information from study materials, mention it. If using general knowledge because the topic isn't in materials, clearly state that.`
    : `You are a helpful AI tutor. The student hasn't added any resources yet, so answer using your general knowledge.

STUDENT'S QUESTION:
${question}

Provide a clear, concise answer using your knowledge. Use simple formatting: headings (##), bullet points (-), and **bold** for key terms.`;

  try {
    const answer = await callOpenRouter(
      [
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.3,
        maxTokens: 1500
      }
    );

    return {
      answer,
      basedOnResources: hasResources,
      usedGeneralKnowledge: !hasResources || answer.toLowerCase().includes('general knowledge') || answer.toLowerCase().includes('external knowledge'),
      resourceCount: resourceContents.filter(r => r.success).length
    };
  } catch (err) {
    console.error('AI Tutor Error:', err);
    throw new Error(`Failed to get tutor answer: ${err.message}`);
  }
}

/**
 * Category summary (non-AI)
 */
export function summarizeCategoryContent(resourceContents) {
  if (!resourceContents || resourceContents.length === 0) {
    return 'No resources added yet.';
  }
  
  const successfulContents = resourceContents.filter(c => c.success && c.extractedText);
  
  if (successfulContents.length === 0) {
    return 'Resources are being processed...';
  }
  
  return `This category contains ${successfulContents.length} resource(s). Ask me questions about the content!`;
}
