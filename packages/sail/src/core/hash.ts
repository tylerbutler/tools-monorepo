// import { subtle } from "uncrypto";
// export const sha256 = (buffer: Buffer) => {
// 	return subtle.digest("SHA-256", buffer);
// 	// return crypto.createHash("sha256").update(buffer).digest("hex");
// };

import crypto from "node:crypto";

export const sha256 = (buffer: Buffer) => {
	return crypto.createHash("sha256").update(buffer).digest("hex");
};
