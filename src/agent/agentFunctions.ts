import { agentContext } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { func, funcClass } from '../functionDefinition/functionDecorators';

export const AGENT_COMPLETED_NAME = 'Agent.completed';

export const AGENT_REQUEST_FEEDBACK = 'Agent.requestFeedback';

export const REQUEST_FEEDBACK_PARAM_NAME = 'request';

/**
 * Functions for the agent to manage its memory and execution
 */
@funcClass(__filename)
export class Agent {
	/**
	 * Request feedback/interaction from a supervisor when a decision or approval needs to be made, or additional details are required, before proceeding with the plan.
	 * @param request {string} Notes on what additional information/decision is required.
	 */
	@func()
	async requestFeedback(request: string): Promise<void> {
		// arg name must match REQUEST_FEEDBACK_PARAM_NAME
		logger.info(`Feedback requested: ${request}`);
	}

	/**
	 * Notifies that the user request has completed and there is no more work to be done, or that no more useful progress can be made with the functions.
	 * @param note {string} A detailed description that answers/completes the user request.
	 */
	@func()
	async completed(note: string): Promise<void> {
		logger.info('Agent completed');
		logger.info(note);
	}

	/**
	 * Stores content to your working memory, and continues on with the plan. You can assume the memory element now contains this key and content.
	 * @param key {string} A descriptive identifier (alphanumeric and underscores allowed, under 30 characters) for the new memory contents explaining the source of the content. This must not exist in the current memory.
	 * @param content {string} The plain text contents to store in the working memory
	 */
	@func()
	async addNewMemory(key: string, content: string): Promise<void> {
		const memory = agentContext().memory;
		// if (memory.has(key)) throw new Error(`Memory key ${key} already exists. Did you mean to update or use a different key?`);
		memory[key] = content;
	}

	/**
	 * Updates existing content in your working memory, and continues on with the plan. You can assume the memory element now contains this key and content.
	 * Note this will over-write any existing memory content
	 * @param key {string} An existing key in the memory contents to update the contents of.
	 * @param content {string} The plain text content to store in the working memory under the key
	 */
	@func()
	async updateMemory(key: string, content: string): Promise<void> {
		const memory = agentContext().memory;
		// if (!memory.has(key)) throw new Error(`Memory key ${key} does not exist. Did you mean to create a new memory key or use a different existing key?`);
		memory[key] = content;
	}
}
