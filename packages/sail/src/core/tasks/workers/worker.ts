import { parentPort } from "node:worker_threads";

import { lint } from "./eslintWorker.js";
import { compile, fluidCompile } from "./tscWorker.js";

export interface WorkerMessage {
	workerName: string;
	command: string;
	cwd: string;
}

export interface WorkerExecResult {
	code: number;
	error?: Error; // unhandled exception, main thread should rerun it.
	memoryUsage?: NodeJS.MemoryUsage;
}

const workers: {
	[key: string]: (message: WorkerMessage) => Promise<WorkerExecResult>;
} = {
	tsc: compile,
	"fluid-tsc": fluidCompile,
	eslint: lint,
};

let collectMemoryUsage = false;

async function messageHandler(msg: WorkerMessage): Promise<WorkerExecResult> {
	let res: WorkerExecResult;
	try {
		const worker = workers[msg.workerName];
		if (worker) {
			// await here so that if the promise is rejected, the try/catch will catch it
			res = await worker(msg);
		} else {
			throw new Error(`Invalid workerName ${msg.workerName}`);
		}
	} catch (e: unknown) {
		// any unhandled exception thrown is going to rerun on main thread.
		const error = e as Error;
		res = {
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			code: -1,
		};
	}
	return collectMemoryUsage
		? { ...res, memoryUsage: process.memoryUsage() }
		: res;
}

if (parentPort) {
	parentPort.on("message", (message: WorkerMessage) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		messageHandler(message).then(parentPort?.postMessage.bind(parentPort));
	});
} else if (process.send) {
	collectMemoryUsage = process.argv.includes("--memoryUsage");
	process.on("message", (message: WorkerMessage) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		messageHandler(message).then(process.send?.bind(process));
	});
	process.on("uncaughtException", (_error) => {
		process.exit(-1);
	});
	process.on("unhandledRejection", (_reason) => {
		process.exit(-1);
	});
	process.on("beforeExit", () => {
		process.exit(-1);
	});
} else {
	throw new Error("Invalid worker invocation");
}
