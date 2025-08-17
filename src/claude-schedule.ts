#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import dayjs from 'dayjs';
import chalk from 'chalk';

const PROMPTS_FILE = './prompts/prompts.jsonl';

// Modern color palette
const colors = {
  primary: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  muted: chalk.gray,
  accent: chalk.magenta,
  highlight: chalk.bgCyan.black
};

interface PromptData {
  prompt: string;
  tmux_session: string;
  sent: string;
  sent_timestamp: number | null;
  default_wait: string;
}

interface PromptResult {
  prompt: PromptData;
  index: number;
}

interface ScheduleOptions {
  stopAtTime?: string; // "3pm", "15:00", etc.
  stopAfterHours?: number; // number of hours to run
  promptFile?: string; // custom prompt file path
  ignoreApproachingLimit?: boolean; // ignore "Approaching usage limit" messages
  mode?: 'repeat' | 'sequential'; // execution mode
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tmuxSendKeys(session: string, keys: string): void {
  execSync(`tmux send-keys -t "${session}" ${keys}`);
}

function tmuxLoadBufferFromData(data: string): void {
  execSync(`echo "${data}" | tmux load-buffer -`);
}

function tmuxPasteBuffer(session: string): void {
  execSync(`tmux paste-buffer -t "${session}"`);
}

function tmuxCapturePane(session: string): string {
  try {
    const output = execSync(`tmux capture-pane -t "${session}" -p`).toString();
    return output;
  } catch (error) {
    console.log(colors.error(`❌ Error capturing tmux pane: ${(error as Error).message}`));
    return '';
  }
}

function showHelp(): void {
  console.log(colors.highlight('\n 🚀 PROMPT SCHEDULER - Modern AI Agent Automation Tool \n'));
  
  console.log(colors.primary('📋 COMMANDS:'));
  console.log(colors.info('  run') + colors.muted('     - Execute all unsent prompts sequentially with auto-wait'));
  console.log(colors.info('  next') + colors.muted('    - Execute only the next unsent prompt'));
  console.log(colors.info('  status') + colors.muted('  - Show status of all prompts with timestamps'));
  console.log(colors.info('  reset') + colors.muted('   - Reset all prompts to unsent status'));
  console.log(colors.info('  help') + colors.muted('    - Show this help message'));
  console.log(colors.info('  [1-n]') + colors.muted('   - Execute specific prompt by index'));
  
  console.log(colors.primary('\n⏰ TIME OPTIONS:'));
  console.log(colors.info('  --stop-at') + colors.muted('   - Stop execution at specific time (e.g., --stop-at 3pm)'));
  console.log(colors.info('  --hours') + colors.muted('     - Run for specified hours (e.g., --hours 2)'));
  
  console.log(colors.primary('\n📄 FILE OPTIONS:'));
  console.log(colors.info('  --prompt-file') + colors.muted(' - Use custom prompt file (e.g., --prompt-file /path/to/prompts.jsonl)'));
  
  console.log(colors.primary('\n🔄 MODE OPTIONS:'));
  console.log(colors.info('  --mode') + colors.muted('        - Execution mode: repeat (default) or sequential'));
  console.log(colors.muted('                    repeat: Use tmux history (Up key) to repeat prompts'));
  console.log(colors.muted('                    sequential: Directly send prompts without history'));
  
  console.log(colors.primary('\n⚠️  LIMIT OPTIONS:'));
  console.log(colors.info('  --ignore-approaching-limit') + colors.muted(' - Ignore "Approaching usage limit" messages'));
  
  console.log(colors.primary('\n✨ FEATURES:'));
  console.log(colors.success('  • ⏱️  Auto usage limit detection & wait'));
  console.log(colors.success('  • 🔄 Sequential execution with custom wait times'));
  console.log(colors.success('  • 📊 Status tracking with timestamps'));
  console.log(colors.success('  • 🎯 Skip already sent prompts automatically'));
  console.log(colors.success('  • 🖥️  Direct tmux integration'));
  console.log(colors.success('  • ⏰ Time-based execution control'));
  
  console.log(colors.primary('\n🎨 USAGE EXAMPLES:'));
  console.log(colors.accent('  tsx src/claude-schedule.ts run') + colors.muted('                         # Start automation (repeat mode)'));
  console.log(colors.accent('  tsx src/claude-schedule.ts run --mode sequential') + colors.muted('        # Sequential mode'));
  console.log(colors.accent('  tsx src/claude-schedule.ts run --stop-at 5pm') + colors.muted('             # Stop at 5pm'));
  console.log(colors.accent('  tsx src/claude-schedule.ts run --hours 3') + colors.muted('                 # Run for 3 hours'));
  console.log(colors.accent('  tsx src/claude-schedule.ts run --prompt-file ~/my-prompts.jsonl') + colors.muted(' # Custom file'));
  console.log(colors.accent('  tsx src/claude-schedule.ts run --ignore-approaching-limit') + colors.muted('   # Ignore approaching limit'));
  console.log(colors.accent('  tsx src/claude-schedule.ts status') + colors.muted('                      # Check progress'));
  console.log(colors.accent('  tsx src/claude-schedule.ts next') + colors.muted('                        # Execute one prompt'));
  
  console.log(colors.muted('\n💡 The scheduler automatically detects AI agent usage limit messages'));
  console.log(colors.muted('   and waits until the specified reset time before continuing.\n'));
  console.log(colors.muted('📝 Edit prompts/prompts.jsonl (or custom file) to configure your automation tasks.\n'));
  console.log(colors.muted('🎯 Currently supports Claude Code with plans for additional AI agents.'));
}

async function checkUsageLimit(session: string, skipInitial: boolean = false, ignoreApproaching: boolean = false): Promise<boolean> {
  // Skip usage limit check for initial execution (terminal startup)
  if (skipInitial) {
    return false;
  }
  
  const content = tmuxCapturePane(session);
  
  // Match both "Approaching usage limit" and "Claude usage limit reached" patterns
  const approachingMatch = content.match(/Approaching usage limit · resets at (\d+(am|pm))/i);
  const reachedMatch = content.match(/Claude usage limit reached\. Your limit will reset at (\d+(am|pm))/i);
  
  // If ignoreApproaching is true, only handle "reached" messages
  const usageLimitMatch = ignoreApproaching ? reachedMatch : (approachingMatch || reachedMatch);
  
  if (usageLimitMatch) {
    const resetTime = usageLimitMatch[1];
    const limitType = approachingMatch ? "approaching" : "reached";
    
    if (ignoreApproaching && approachingMatch) {
      console.log(colors.info(`ℹ️  Ignoring "approaching usage limit" message (--ignore-approaching-limit enabled)`));
      return false;
    }
    
    console.log(colors.warning(`⚠️  Usage limit ${limitType} during loop execution. Resets at ${resetTime}`));
    
    // Parse time and calculate wait duration
    const timeMatch = resetTime.match(/(\d+)(am|pm)/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const ampm = timeMatch[2].toLowerCase();
      
      // Convert to 24-hour format
      let resetHour = hour;
      if (ampm === 'pm' && hour !== 12) {
        resetHour += 12;
      } else if (ampm === 'am' && hour === 12) {
        resetHour = 0;
      }
      
      const now = dayjs();
      let resetDateTime = now.hour(resetHour).minute(0).second(0).millisecond(0);
      
      // If reset time is earlier than current time, it means next day
      if (resetDateTime.isBefore(now)) {
        resetDateTime = resetDateTime.add(1, 'day');
      }
      
      const waitMs = resetDateTime.diff(now);
      const waitMinutes = Math.ceil(waitMs / (1000 * 60));
      
      console.log(colors.info(`⏳ Waiting ${waitMinutes} minutes until ${colors.accent(resetDateTime.format('YYYY-MM-DD HH:mm:ss'))}...`));
      await sleep(waitMs);
      
      return true; // Indicates we waited for usage limit
    }
  }
  
  return false; // No usage limit detected
}

function parseWaitTime(waitStr: string): number {
  const match = waitStr.match(/(\d+)([mh])/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return unit === 'h' ? value * 60 * 60 * 1000 : value * 60 * 1000;
}

function parseStopTime(timeStr: string): dayjs.Dayjs | null {
  const now = dayjs();
  
  // Parse "3pm", "15:00", "3:30pm" formats
  const ampmMatch = timeStr.match(/(\d+)(?::(\d+))?(am|pm)/i);
  const militaryMatch = timeStr.match(/(\d+):(\d+)/);
  
  if (ampmMatch) {
    const hour = parseInt(ampmMatch[1]);
    const minute = parseInt(ampmMatch[2] || '0');
    const ampm = ampmMatch[3].toLowerCase();
    
    let hour24 = hour;
    if (ampm === 'pm' && hour !== 12) {
      hour24 += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour24 = 0;
    }
    
    let stopTime = now.hour(hour24).minute(minute).second(0).millisecond(0);
    
    // If stop time is earlier than current time, it means next day
    if (stopTime.isBefore(now)) {
      stopTime = stopTime.add(1, 'day');
    }
    
    return stopTime;
  } else if (militaryMatch) {
    const hour = parseInt(militaryMatch[1]);
    const minute = parseInt(militaryMatch[2]);
    
    let stopTime = now.hour(hour).minute(minute).second(0).millisecond(0);
    
    // If stop time is earlier than current time, it means next day
    if (stopTime.isBefore(now)) {
      stopTime = stopTime.add(1, 'day');
    }
    
    return stopTime;
  }
  
  return null;
}

function parseArgs(): { command: string; options: ScheduleOptions } {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options: ScheduleOptions = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--stop-at' && args[i + 1]) {
      options.stopAtTime = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--hours' && args[i + 1]) {
      options.stopAfterHours = parseInt(args[i + 1]);
      i++; // Skip next arg
    } else if (args[i] === '--prompt-file' && args[i + 1]) {
      options.promptFile = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--ignore-approaching-limit') {
      options.ignoreApproachingLimit = true;
    } else if (args[i] === '--mode' && args[i + 1]) {
      const mode = args[i + 1];
      if (mode === 'repeat' || mode === 'sequential') {
        options.mode = mode;
      } else {
        console.log(colors.error(`❌ Invalid mode: ${mode}. Valid modes: repeat, sequential`));
        process.exit(1);
      }
      i++; // Skip next arg
    }
  }
  
  return { command, options };
}

function shouldStop(startTime: dayjs.Dayjs, options: ScheduleOptions): boolean {
  const now = dayjs();
  
  // Check stop-at time
  if (options.stopAtTime) {
    const stopTime = parseStopTime(options.stopAtTime);
    if (stopTime && now.isAfter(stopTime)) {
      console.log(colors.warning(`⏰ Reached stop time ${options.stopAtTime}, stopping execution`));
      return true;
    }
  }
  
  // Check hours limit
  if (options.stopAfterHours) {
    const elapsedHours = now.diff(startTime, 'hour', true);
    if (elapsedHours >= options.stopAfterHours) {
      console.log(colors.warning(`⏰ Reached ${options.stopAfterHours} hour limit, stopping execution`));
      return true;
    }
  }
  
  return false;
}

function loadPrompts(promptFile: string = PROMPTS_FILE): PromptData[] {
  if (!existsSync(promptFile)) {
    console.log(colors.error(`❌ Error: ${promptFile} not found`));
    process.exit(1);
  }

  const content = readFileSync(promptFile, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    try {
      return JSON.parse(line) as PromptData;
    } catch (error) {
      console.log(colors.error(`❌ Error parsing line ${index + 1}: ${(error as Error).message}`));
      process.exit(1);
    }
  });
}

function updatePromptStatus(index: number, sent: boolean = true, timestamp: number | null = Date.now(), promptFile: string = PROMPTS_FILE): void {
  const prompts = loadPrompts(promptFile);
  
  if (index < 0 || index >= prompts.length) {
    console.log(colors.error(`❌ Error: Invalid prompt index ${index}`));
    return;
  }
  
  prompts[index].sent = sent.toString();
  prompts[index].sent_timestamp = timestamp;
  
  const updatedContent = prompts.map(prompt => JSON.stringify(prompt)).join('\n');
  writeFileSync(promptFile, updatedContent);
}

function getNextPrompt(promptFile: string = PROMPTS_FILE): PromptResult | null {
  const prompts = loadPrompts(promptFile);
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    if (prompt.sent === "false") {
      return { prompt, index: i };
    }
  }
  
  return null;
}

function getPromptByIndex(index: number, promptFile: string = PROMPTS_FILE): PromptResult {
  const prompts = loadPrompts(promptFile);
  
  if (index < 1 || index > prompts.length) {
    console.log(colors.error(`❌ Error: Invalid prompt index ${index}. Available: 1-${prompts.length}`));
    process.exit(1);
  }
  
  return { prompt: prompts[index - 1], index: index - 1 };
}

async function executePromptSequential(promptData: PromptData, session: string, skipUsageLimitCheck: boolean = false, ignoreApproaching: boolean = false): Promise<void> {
  // Check for usage limit before executing (skip for initial/single executions)
  const usageLimitDetected = await checkUsageLimit(session, skipUsageLimitCheck, ignoreApproaching);
  if (usageLimitDetected) {
    console.log(colors.success('✅ Usage limit wait completed, continuing with prompt execution...'));
  }
  
  // Sequential mode: directly send prompt without using history
  // Send Escape keys twice to clear any current input
  tmuxSendKeys(session, 'Escape');
  await sleep(200);
  tmuxSendKeys(session, 'Escape');
  
  await sleep(1000);
  
  // Load prompt data directly to buffer and paste
  tmuxLoadBufferFromData(promptData.prompt);
  tmuxPasteBuffer(session);
  
  await sleep(1000);
  
  // Send Enter
  tmuxSendKeys(session, 'Enter');
}

async function executePromptRepeat(promptData: PromptData, session: string, skipUsageLimitCheck: boolean = false, ignoreApproaching: boolean = false): Promise<void> {
  // Check for usage limit before executing (skip for initial/single executions)
  const usageLimitDetected = await checkUsageLimit(session, skipUsageLimitCheck, ignoreApproaching);
  if (usageLimitDetected) {
    console.log(colors.success('✅ Usage limit wait completed, continuing with prompt execution...'));
  }
  
  // Repeat mode: use tmux history (original implementation)
  // Send Escape keys twice
  tmuxSendKeys(session, 'Escape');
  await sleep(200);
  tmuxSendKeys(session, 'Escape');
  
  // await sleep(1000);
  await sleep(5000);
  
  // Send Up arrow key
  tmuxSendKeys(session, 'Up');
  
  await sleep(1000);
  
  // Send Enter
  tmuxSendKeys(session, 'Enter');
  
  // await sleep(1000);
  await sleep(5000);
  
  // Send Ctrl+C
  tmuxSendKeys(session, 'C-c');
  
  await sleep(1000);
  
  // Load prompt data directly to buffer and paste
  tmuxLoadBufferFromData(promptData.prompt);
  tmuxPasteBuffer(session);
  
  await sleep(1000);
  
  // Send Enter
  tmuxSendKeys(session, 'Enter');
}

async function executePrompt(promptData: PromptData, session: string, skipUsageLimitCheck: boolean = false, ignoreApproaching: boolean = false, mode: 'repeat' | 'sequential' = 'repeat'): Promise<void> {
  if (mode === 'sequential') {
    await executePromptSequential(promptData, session, skipUsageLimitCheck, ignoreApproaching);
  } else {
    await executePromptRepeat(promptData, session, skipUsageLimitCheck, ignoreApproaching);
  }
}

async function main(): Promise<void> {
  const { command, options } = parseArgs();
  const promptFile = resolve(options.promptFile || PROMPTS_FILE);
  const mode = options.mode || 'repeat';
  
  if (!command || command === 'help') {
    showHelp();
    console.log(colors.info(`📄 Current prompt file: ${promptFile}\n`));
    return;
  }
  
  if (command === 'run') {
    const startTime = dayjs();
    console.log(colors.highlight('\n🚀 Starting automated prompt execution...\n'));
    
    console.log(colors.info(`📄 Using prompt file: ${promptFile}`));
    console.log(colors.info(`🔄 Execution mode: ${mode}`));
    if (options.stopAtTime) {
      const stopTime = parseStopTime(options.stopAtTime);
      console.log(colors.info(`⏰ Will stop at ${options.stopAtTime} (${stopTime?.format('YYYY-MM-DD HH:mm:ss')})`));
    }
    if (options.stopAfterHours) {
      const endTime = startTime.add(options.stopAfterHours, 'hour');
      console.log(colors.info(`⏰ Will stop after ${options.stopAfterHours} hours (${endTime.format('YYYY-MM-DD HH:mm:ss')})`));
    }
    
    const prompts = loadPrompts(promptFile);
    let executed = 0;
    let isFirstExecution = true;
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      
      // Check time limits before each prompt
      if (shouldStop(startTime, options)) {
        break;
      }
      
      // Skip if already sent
      if (prompt.sent === "true") {
        console.log(colors.muted(`⏭️  Skipping prompt ${i + 1}: already sent`));
        continue;
      }
      
      console.log(colors.primary(`\n🎯 Executing prompt ${i + 1}:`), colors.accent(prompt.prompt));
      // Skip usage limit check for first execution, enable for subsequent ones
      await executePrompt(prompt, prompt.tmux_session, isFirstExecution, options.ignoreApproachingLimit || false, mode);
      updatePromptStatus(i, true, Date.now(), promptFile);
      executed++;
      console.log(colors.success(`✅ Prompt ${i + 1} completed`));
      
      // After first execution, enable usage limit checking for subsequent prompts
      isFirstExecution = false;
      
      // Check time limits after execution (before wait)
      if (shouldStop(startTime, options)) {
        console.log(colors.info('🎯 Stopping before wait period due to time limit'));
        break;
      }
      
      // Wait if specified
      const waitTime = parseWaitTime(prompt.default_wait);
      if (waitTime > 0) {
        console.log(colors.info(`⏳ Waiting ${prompt.default_wait}...`));
        await sleep(waitTime);
      }
    }
    
    const elapsedTime = dayjs().diff(startTime, 'minute');
    console.log(colors.highlight(`\n🎉 Execution completed! (${executed} new executions, ${elapsedTime} minutes elapsed)\n`));
    
  } else if (command === 'next') {
    const nextPrompt = getNextPrompt(promptFile);
    if (!nextPrompt) {
      console.log(colors.warning('⚠️  No unsent prompts found'));
      return;
    }
    
    console.log(colors.primary(`🎯 Executing next prompt:`), colors.accent(nextPrompt.prompt.prompt));
    // Skip usage limit check for single 'next' execution (initial execution)
    await executePrompt(nextPrompt.prompt, nextPrompt.prompt.tmux_session, true, options.ignoreApproachingLimit || false, mode);
    updatePromptStatus(nextPrompt.index, true, Date.now(), promptFile);
    console.log(colors.success('✅ Prompt completed'));
    
  } else if (command === 'status') {
    console.log(colors.highlight('\n📊 PROMPT STATUS\n'));
    console.log(colors.info(`📄 Using prompt file: ${promptFile}\n`));
    const prompts = loadPrompts(promptFile);
    prompts.forEach((prompt, index) => {
      const status = prompt.sent === "true" ? colors.success("✅ SENT") : colors.warning("⏳ PENDING");
      const timestamp = prompt.sent_timestamp ? 
        colors.muted(new Date(prompt.sent_timestamp).toLocaleString()) : 
        colors.muted('N/A');
      console.log(`${colors.info(`${index + 1}.`)} ${status} ${colors.accent(prompt.prompt)} ${colors.muted(`(${timestamp})`)}`);
    });
    console.log('');
    
  } else if (command === 'reset') {
    const prompts = loadPrompts(promptFile);
    prompts.forEach((_, index) => {
      updatePromptStatus(index, false, null, promptFile);
    });
    console.log(colors.success('✅ All prompts reset to unsent status'));
    
  } else {
    // Execute specific prompt by index (legacy mode)
    const promptIndex = parseInt(command);
    if (isNaN(promptIndex)) {
      console.log(colors.error('❌ Invalid command. Use "help" to see available commands.'));
      return;
    }
    
    const { prompt, index } = getPromptByIndex(promptIndex, promptFile);
    
    console.log(colors.primary(`🎯 Executing prompt ${promptIndex}:`), colors.accent(prompt.prompt));
    // Skip usage limit check for single index execution (initial execution)
    await executePrompt(prompt, prompt.tmux_session, true, options.ignoreApproachingLimit || false, mode);
    updatePromptStatus(index, true, Date.now(), promptFile);
    console.log(colors.success('✅ Prompt completed'));
  }
}

main().catch(console.error);
