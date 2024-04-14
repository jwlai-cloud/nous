import Pino from 'pino';
const logLevel = process.env.LOG_LEVEL || 'INFO';
// Review config at https://github.com/simenandre/pino-cloud-logging/blob/main/src/main.ts

// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const PinoLevelToSeverityLookup: any = {
	trace: 'DEBUG', // TODO should have a lint rule to dis-allow trace
	debug: 'DEBUG',
	info: 'INFO',
	INFO: 'INFO',
	warn: 'WARNING',
	error: 'ERROR',
	fatal: 'CRITICAL',
};

const reportErrors = process.env.REPORT_ERROR_LOGS?.toLowerCase() === 'true';

/**
 * Pino logger configured for a Google Cloud environment.
 *
 */
export const logger: Pino.Logger = Pino({
	level: logLevel,
	messageKey: 'message',
	timestamp: false, // Provided by GCP log agents
	formatters: {
		level(label: string, number: number) {
			// const severity = PinoLevelToSeverityLookup[label] || PinoLevelToSeverityLookup.info;
			// const level = number;
			// return {
			//   severity: PinoLevelToSeverityLookup[label] || PinoLevelToSeverityLookup.info,
			//   level: number,
			// };

			// const pinoLevel = label as Level;
			const severity = PinoLevelToSeverityLookup[label] ?? 'INFO';
			if (reportErrors && (label === 'error' || label === 'fatal')) {
				return {
					severity,
					'@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
				};
			}
			return { severity, level: number };
		},
		log(object: any) {
			const logObject = object as { err?: Error };
			const stackTrace = logObject.err?.stack;
			const stackProp: any = stackTrace ? { stack_trace: stackTrace } : {};

			return { ...object, ...stackProp };
		},
	},
});