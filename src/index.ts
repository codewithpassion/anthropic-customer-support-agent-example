import dotenv from 'dotenv';
import readline from 'readline';
import ChatBot from './chatbot';
import type { ChatBotResponse, SessionState } from './chatbot';
import { TASK_SPECIFIC_INSTRUCTIONS } from './prompts';
import chalk from 'chalk'

dotenv.config();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});


async function runChatbot() {
	const sessionState: SessionState = {
		messages: [
			{ 'role': "user", "content": TASK_SPECIFIC_INSTRUCTIONS },
			{ 'role': "assistant", "content": "Understood" },
		],
	};

	const chatbot = new ChatBot(sessionState)

	await processBotResponse(chatbot.processUserInput('Hello!'));

	while (true) {
		const userInput = await askQuestion('You: ');
        if (userInput === 'exit' || userInput === 'quit') {
            break;
        }
		await processBotResponse(chatbot.processUserInput(userInput));
	}

	rl.close();
}

async function main() {
	try {
		await runChatbot();
		console.log('Chat completed.');
	} catch (error) {
		console.error('Error running Chat:', error);
	}
}


async function askQuestion(question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

async function processBotResponse(response: AsyncIterable<ChatBotResponse>) {
	for await (const message of response) {
		if (!message.thinking && message.text?.length) {
			console.log(chalk.bgBlueBright.black('🤖:', message.text));
		}
		if (message.done) {
			break;
		}
		if (message.thinking) {
			console.log(chalk.bgBlueBright.black('🤖💭 |thinking|'))
		}
	}
}


main();
