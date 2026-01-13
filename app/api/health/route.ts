import { NextResponse } from 'next/server';
import { testConnection } from '@/app/lib/db';

export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const dbTest = await testConnection();
  
  return NextResponse.json({
    status: 'ok',
    config: {
      openai: {
        apiKeyConfigured: hasApiKey,
        model: process.env.OPENAI_MODEL || null,
        serviceTier: process.env.OPENAI_SERVICE_TIER || null
      },
      database: {
        connected: dbTest.connected
      }
    },
    environmentVariables: {
      OPENAI_API_KEY: {
        required: true,
        configured: hasApiKey
      },
      OPENAI_MODEL: {
        required: false,
        configured: !!process.env.OPENAI_MODEL,
        default: 'gpt-5.2',
        description: 'OpenAI model to use for LLM calls'
      },
      OPENAI_SERVICE_TIER: {
        required: false,
        configured: !!process.env.OPENAI_SERVICE_TIER,
        default: 'flex',
        description: 'OpenAI service tier (flex, standard). See: https://platform.openai.com/docs/pricing'
      }
    }
  });
}

