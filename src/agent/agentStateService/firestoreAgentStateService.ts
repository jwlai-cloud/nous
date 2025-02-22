import { DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { AgentContext, AgentRunningState, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { span } from '#o11y/trace';
import { envVar } from '#utils/env-var';
import { AgentStateService } from './agentStateService';

/**
 * Google Firestore implementation of AgentStateService
 */
export class FirestoreAgentStateService implements AgentStateService {
	db: Firestore;

	constructor() {
		this.db = new Firestore({
			projectId: process.env.FIRESTORE_EMULATOR_HOST ? undefined : envVar('GCLOUD_PROJECT'),
			databaseId: process.env.FIRESTORE_DATABASE,
			ignoreUndefinedProperties: true,
		});
	}

	@span()
	async save(state: AgentContext): Promise<void> {
		const serialized = serializeContext(state);
		serialized.lastUpdate = Date.now();
		const docRef = this.db.doc(`AgentContext/${state.agentId}`);
		try {
			await docRef.set(serialized);
		} catch (error) {
			logger.error(error, 'Error saving agent state');
			throw error;
		}
	}

	async updateState(ctx: AgentContext, state: AgentRunningState): Promise<void> {
		ctx.state = state;
		await this.save(ctx);
	}

	@span({ agentId: 0 })
	async load(agentId: string): Promise<AgentContext | null> {
		const docRef = this.db.doc(`AgentContext/${agentId}`);
		const docSnap: DocumentSnapshot = await docRef.get();
		if (!docSnap.exists) {
			return null;
		}
		const data = docSnap.data();
		return deserializeAgentContext({
			...data,
			agentId,
		});
	}

	@span()
	async list(): Promise<AgentContext[]> {
		const querySnapshot = await this.db.collection('AgentContext').orderBy('lastUpdate', 'desc').get();
		return await this.deserializeQuery(querySnapshot);
	}

	@span()
	async listRunning(): Promise<AgentContext[]> {
		// Needs an index TODO https://cloud.google.com/firestore/docs/query-data/multiple-range-fields
		const querySnapshot = await this.db.collection('AgentContext').where('state', '!=', 'completed').orderBy('lastUpdate', 'desc').get();
		return await this.deserializeQuery(querySnapshot);
	}

	private async deserializeQuery(querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>) {
		const contexts: AgentContext[] = [];
		for (const doc of querySnapshot.docs) {
			const data = doc.data();
			contexts.push(
				await deserializeAgentContext({
					...data,
					agentId: doc.id,
				}),
			);
		}
		return contexts;
	}

	async clear(): Promise<void> {
		const querySnapshot = await this.db.collection('AgentContext').get();
		for (const doc of querySnapshot.docs) {
			await doc.ref.delete();
		}
	}

	async delete(ids: string[]): Promise<void> {
		const batch = this.db.batch();
		for (const id of ids) {
			const docRef = this.db.doc(`AgentContext/${id}`);
			batch.delete(docRef);
		}
		// TODO delete LlmCalls and FunctionCache entries for the agent
		await batch.commit();
	}
}
