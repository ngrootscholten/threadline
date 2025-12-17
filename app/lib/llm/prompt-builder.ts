import { ThreadlineInput } from '../processors/single-expert';

export function buildPrompt(
  threadline: ThreadlineInput,
  diff: string,
  matchingFiles: string[]
): string {
  let prompt = `You are a code quality checker focused EXCLUSIVELY on: ${threadline.id}\n\n`;
  prompt += `CRITICAL: You must ONLY check for violations of THIS SPECIFIC threadline. `;
  prompt += `Do NOT flag other code quality issues, style problems, or unrelated concerns. `;
  prompt += `If the code does not violate THIS threadline's specific rules, return "compliant" even if other issues exist.\n\n`;
  
  prompt += `Threadline Guidelines:\n${threadline.content}\n\n`;

  // Add context files if available
  if (threadline.contextContent && Object.keys(threadline.contextContent).length > 0) {
    prompt += `Context Files:\n`;
    for (const [file, content] of Object.entries(threadline.contextContent)) {
      prompt += `\n--- ${file} ---\n${content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Code Changes:\n${diff}\n\n`;
  prompt += `Changed Files:\n${matchingFiles.join('\n')}\n\n`;

  prompt += `Review the code changes AGAINST ONLY THE THREADLINE GUIDELINES ABOVE.\n\n`;
  prompt += `IMPORTANT:\n`;
  prompt += `- Only flag violations of the specific rules defined in this threadline\n`;
  prompt += `- Ignore all other code quality issues, style problems, or unrelated concerns\n`;
  prompt += `- If the threadline concern is not violated, return "compliant" regardless of other issues\n`;
  prompt += `- Only return "attention" if there is a DIRECT violation of this threadline's rules\n\n`;
  
  prompt += `Return JSON only with this exact structure:\n`;
  prompt += `{\n`;
  prompt += `  "status": "compliant" | "attention" | "not_relevant",\n`;
  prompt += `  "reasoning": "brief explanation",\n`;
  prompt += `  "line_references": [line numbers if attention needed]\n`;
  prompt += `}\n\n`;
  prompt += `Status meanings:\n`;
  prompt += `- "compliant": Code follows THIS threadline's guidelines, no violations found (even if other issues exist)\n`;
  prompt += `- "attention": Code DIRECTLY violates THIS threadline's specific guidelines\n`;
  prompt += `- "not_relevant": This threadline doesn't apply to these files/changes (e.g., wrong file type, no matching code patterns)\n`;
  
  return prompt;
}

