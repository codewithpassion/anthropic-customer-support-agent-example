import type { Tool } from '@anthropic-ai/sdk/resources/index.mjs';

const TOOLS: Tool[] = [
	{
		name: "get_quote",
		description: "Calculate the insurance quote based on user input. Returned value is per month premium.",
		input_schema: {
			type: "object",
			properties: {
				make: { "type": "string", "description": "The make of the vehicle." },
				model: { "type": "string", "description": "The model of the vehicle." },
				year: { "type": "integer", "description": "The year the vehicle was manufactured." },
				mileage: { "type": "integer", "description": "The mileage on the vehicle." },
				driver_age: { "type": "integer", "description": "The age of the primary driver." }
			},
			"required": ["make", "model", "year", "mileage", "driver_age"]
		}
	}
];

function get_quote(args: { make: string, model: string, year: number, milage: number, driver_age: number }): number {
	return args.driver_age * 10;
}

export { TOOLS, get_quote };