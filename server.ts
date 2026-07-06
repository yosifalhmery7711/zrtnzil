/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function generateContentWithRetry(apiKey: string, contents: any, systemInstruction: string) {
  // Use ultra-robust models list
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-pro-preview'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini REST] Attempting content generation using model: ${model} (attempt ${attempt}/2)`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              },
              generationConfig: {
                temperature: 0.7,
              }
            })
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
          throw new Error('Empty response or invalid JSON structure from Gemini REST API');
        }

        return { text };
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || String(error);
        console.warn(`[Gemini REST] Model ${model} failed on attempt ${attempt}:`, errMsg);

        // Check if API key is invalid to fail fast
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key is invalid') || errMsg.includes('400')) {
          throw error;
        }

        // Wait with backoff
        const delay = 1000 * attempt + Math.floor(Math.random() * 500);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks and retry attempts failed');
}

function getFallbackAdvisorResponse(userMessage: string, products: any[]): string {
  const msg = (userMessage || '').toLowerCase();
  
  // Find products that match keywords
  let matchedProducts: any[] = [];
  
  if (products && products.length > 0) {
    if (msg.includes('منزل') || msg.includes('مطبخ') || msg.includes('أدوات') || msg.includes('أواني') || msg.includes('بيت')) {
      matchedProducts = products.filter(p => 
        (p.categoryName || '').includes('منزل') || 
        (p.categoryName || '').includes('مطبخ') || 
        (p.categoryName || '').includes('أدوات') ||
        (p.name || '').includes('أدوات') || 
        (p.name || '').includes('مطبخ') || 
        (p.name || '').includes('بيت')
      );
    } else if (msg.includes('ملابس') || msg.includes('فساتين') || msg.includes('لبس') || msg.includes('أناقة') || msg.includes('بنات') || msg.includes('أولاد')) {
      matchedProducts = products.filter(p => 
        (p.categoryName || '').includes('ملابس') || 
        (p.categoryName || '').includes('أناقة') ||
        (p.name || '').includes('ملابس') || 
        (p.name || '').includes('فستان') || 
        (p.name || '').includes('لبس')
      );
    } else if (msg.includes('ألعاب') || msg.includes('لعبة') || msg.includes('أطفال') || msg.includes('طفل')) {
      matchedProducts = products.filter(p => 
        (p.categoryName || '').includes('ألعاب') || 
        (p.categoryName || '').includes('أطفال') ||
        (p.name || '').includes('لعبة') || 
        (p.name || '').includes('ألعاب') || 
        (p.name || '').includes('طفل')
      );
    } else if (msg.includes('تجميل') || msg.includes('مكياج') || msg.includes('عناية') || msg.includes('بشرة') || msg.includes('عطور')) {
      matchedProducts = products.filter(p => 
        (p.categoryName || '').includes('تجميل') || 
        (p.categoryName || '').includes('مكياج') || 
        (p.categoryName || '').includes('عناية') ||
        (p.name || '').includes('تجميل') || 
        (p.name || '').includes('مكياج') || 
        (p.name || '').includes('عطر')
      );
    } else if (msg.includes('عرض') || msg.includes('عروض') || msg.includes('خصم') || msg.includes('تخفيض')) {
      matchedProducts = products.filter(p => 
        (p.description || '').includes('عرض') || 
        (p.description || '').includes('تخفيض') || 
        (p.description || '').includes('خصم')
      );
    }
    
    // If no specific match, or match list is empty, pick up to 3 random or first products
    if (matchedProducts.length === 0) {
      matchedProducts = products.slice(0, 3);
    }
  }

  // Limit to max 3 recommendations
  const recs = matchedProducts.slice(0, 3);
  
  let productListMarkdown = '';
  if (recs.length > 0) {
    productListMarkdown = `إليكِ بعض المنتجات المميزة المتاحة في الكتالوج حالياً والتي قد تنال إعجابكِ يا جميلة: 🥰👇\n\n` + 
      recs.map(p => `✨ **${p.name}**\n  - السعر: ${p.priceYERNew} ريال يمني جديد\n  - القسم: ${p.categoryName || 'غير محدد'}`).join('\n\n');
  }

  return productListMarkdown;
}

const app = express();
const PORT = 3000;

// Enable JSON request body parsing up to 50MB for image base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Route: AI Advisor Chatbot proxy
app.post('/api/advisor/chat', async (req, res) => {
  try {
    const { messages = [], products = [] } = req.body || {};
    
    // Robust arrays check
    const msgs = Array.isArray(messages) ? messages : [];
    const prods = Array.isArray(products) ? products : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Advisor Rouh] GEMINI_API_KEY is not defined. Using fallback rule-based response.');
      const lastUserMessage = msgs.length > 0 ? msgs[msgs.length - 1]?.text : '';
      const fallbackResponse = getFallbackAdvisorResponse(lastUserMessage, prods);
      return res.json({ text: fallbackResponse });
    }

    // Format catalog to guide Ruh
    const catalogText = prods.length > 0 
      ? prods.map((p: any) => 
          `- المنتج: ${p.name}\n  رمز الإدارة السري: ${p.code}\n  القسم: ${p.categoryName}\n  الوصف: ${p.description}\n  السعر: ${p.priceYERNew} ريال يمني جديد\n  الخيارات المتوفرة: ${p.properties ? p.properties.map((pr: any) => `${pr.name} (${pr.options.join(', ')})`).join(' | ') : ''}`
        ).join('\n\n')
      : 'الكتالوج فارغ حالياً';

    const systemInstruction = `أنت "المستشارة روح" - مستشارة تسوق ذكية، أنيقة ولطيفة للغاية، تتحدث بلهجة عربية مهذبة ومرحبة جداً وتستخدم إيموجيات ملائمة باستمرار (مثل 🌸✨🛍️💖).
عملين في "متجر أم روح للأدوات المنزلية والملابس والألعاب ومستحضرات التجميل".
مهمتك هي مساعدة المتسوقات والرد على تساؤلاتهن حول المنتجات المتوفرة، وتقديم نصائح تسوق ممتازة، واقتراح هدايا رائعة بناءً على الكتالوج المتاح وميزانيتهن المفضلة.

إليك كتالوج المنتجات الكامل والنشط في المتجر حالياً، استخدميه لترشيح سلع محددة وتوضيح أسعارها ومقاساتها وألوانها بدقة للعميل:
${catalogText}

قواعد هامة جداً تلتزمين بها:
1. كوني متعاونة، دافئة وودودة جداً كصديقة مقربة.
2. لا تخترعي منتجات أو أسعار غير حقيقية أو غير موجودة في الكتالوج أعلاه! إذا سألتكِ العميلة عن صنف غير متوفر، قولي لها بلطف شديد أنك ستقترحين هذا الصنف على "أم روح" لتوفيره قريباً بالمتجر.
3. خاطبي العملاء بصيغة التأنيث دائماً وبكل لباقة (مثل: تفضلي يا عزيزتي، يسعدني خدمتكِ، يومكِ سعيد 🌸).
4. استخدمي تنسيق Markdown منسق جداً، واجعلي الردود على شكل نقاط منظمة ومريحة للعين لتسهيل القراءة.`;

    // Filter and map messages to ensure:
    // 1. Starts with 'user' message
    // 2. Roles alternate correctly (user -> model -> user -> model)
    let filteredMessages = [...msgs];
    while (filteredMessages.length > 0 && filteredMessages[0].role !== 'user') {
      filteredMessages.shift();
    }

    const contents: any[] = [];
    let expectedRole = 'user';
    for (const m of filteredMessages) {
      const mappedRole = m.role === 'user' ? 'user' : 'model';
      if (mappedRole === expectedRole) {
        contents.push({
          role: mappedRole,
          parts: [{ text: m.text || '' }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      } else {
        if (contents.length > 0) {
          contents[contents.length - 1].parts[0].text += '\n' + (m.text || '');
        }
      }
    }

    // Call Gemini model using robust retry and fallback helper
    try {
      if (contents.length === 0) {
        throw new Error('No valid content sequence to send to Gemini API');
      }
      const response = await generateContentWithRetry(apiKey, contents, systemInstruction);
      res.json({ text: response.text });
    } catch (error: any) {
      console.log('[Gemini REST] Handled fallback to rule-based advisor response successfully:', error?.message || error);
      const lastUserMessage = msgs.length > 0 ? msgs[msgs.length - 1]?.text : '';
      const fallbackResponse = getFallbackAdvisorResponse(lastUserMessage, prods);
      res.json({ text: fallbackResponse });
    }
  } catch (error: any) {
    console.error('Advisor chat error:', error);
    // Bulletproof: If anything fails in the outer scope, STILL return a successful JSON with fallback text
    const lastUserMessage = req.body && req.body.messages && req.body.messages.length > 0
      ? req.body.messages[req.body.messages.length - 1]?.text
      : '';
    const fallbackResponse = getFallbackAdvisorResponse(lastUserMessage, (req.body && req.body.products) || []);
    res.json({ text: fallbackResponse });
  }
});

// Mount Vite middleware for development or serve built SPA for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen on port if not running as a serverless function on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Um Rouh Store Server] listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});

export default app;
