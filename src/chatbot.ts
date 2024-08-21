import { Anthropic } from '@anthropic-ai/sdk';
import type { MessageParam, TextBlock, ToolResultBlockParam, ToolUseBlock, ToolUseBlockParam } from '@anthropic-ai/sdk/resources/index.mjs';
import dotenv from 'dotenv';
import { IDENTITY } from './prompts';
import { TOOLS } from './tools';

dotenv.config();

const MODEL = 'claude-3-sonnet-20240229';

function get_quote(args: { make: string, model: string, year: number, milage: number, driver_age: number }): number {
	return args.driver_age * 10;
}

export interface SessionState {
	messages: MessageParam[];
}

export type ChatBotResponse = { text: string, thinking?: boolean, done?: boolean };

class ChatBot {
	private anthropic: Anthropic;
	private sessionState: SessionState;

	constructor(sessionState: SessionState) {
		this.anthropic = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		});
		this.sessionState = sessionState;
	}

	async generateMessage(
		messages: MessageParam[],
		maxTokens: number
	): Promise<Anthropic.Messages.Message> {
		try {
			const response = await this.anthropic.messages.create({
				model: MODEL,
				system: IDENTITY,
				max_tokens: maxTokens,
				messages: messages,
				tools: TOOLS,
			});
			return response;
		} catch (e) {
			throw new Error(`An error occurred: ${e}`);
		}
	}

	async *processUserInput(userInput: string): AsyncIterable<ChatBotResponse> {
		this.sessionState.messages.push({ role: "user", content: userInput });

		try {
			yield { text: 'Thinking...', thinking: true, done: false };
			const responseMessage = await this.generateMessage(
				this.sessionState.messages,
				2048
			);

			for (const message of responseMessage.content) {
				if (message.type === 'text') {
					yield *this.handleTextBlock(message);

				} else if (message.type === 'tool_use') {
					yield *this.handleToolUseBlock(message);
				} else {
					throw new Error("An error occurred: Unexpected response type");
				}
			}
			yield { text: '', done: true };

		} catch (error) {
			return `An error occurred: ${error}`;
		}
		return "An error occurred: No response";
	}

	private async *handleToolUseBlock(toolUse: ToolUseBlock) {
		yield { text: 'Thinking...', thinking: true, done: false };
		if (this.sessionState.messages[this.sessionState.messages.length - 1].role !== 'assistant') {
			// this shouldn't happen. Claude should always respond to the user before using a tool.
			this.sessionState.messages.push({ role: "assistant", content: [toolUse] });
		} else {
			(this.sessionState.messages[this.sessionState.messages.length - 1].content as ToolUseBlockParam[]).push(toolUse);
		}

		const result = this.handleToolUse(toolUse.name, toolUse.input);

		const toolResult : ToolResultBlockParam = { type: 'tool_result', tool_use_id: toolUse.id, content: result, is_error: false };
		this.sessionState.messages.push({
			role: "user",
			content: [toolResult],
		});

		const followUpResponse = await this.generateMessage(
			this.sessionState.messages,
			2048
		);

		const responseText = followUpResponse.content[0].type === 'text' ? followUpResponse.content[0].text : 'Error: Unexpected response type';
		this.sessionState.messages.push(
			{ role: "assistant", content: responseText }
		);
		yield { text: responseText, done: false };
	}

	private *handleTextBlock(message: TextBlock) {
		const responseText = message.text;
		this.sessionState.messages.push(
			{ role: "assistant", content: [message] }
		);
		yield { text: responseText, done: false };
	}

	private handleToolUse(funcName: string, funcParams: any): string {
		if (funcName === "get_quote") {
			const premium = get_quote(funcParams);
			return `Quote generated: $${premium.toFixed(2)} per month`;
		}
		throw new Error("An unexpected tool was used");
	}
}

export default ChatBot;
