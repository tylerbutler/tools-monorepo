import type { IClient } from "@fluidframework/driver-definitions";
import { describe, expect, it } from "vitest";

import { createLeveeAudienceMember } from "../src/audience.js";
import type { LeveeUser } from "../src/interfaces.js";

describe("createLeveeAudienceMember", () => {
	it("creates a LeveeMember from a valid IClient with LeveeUser", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				id: "user123",
				name: "Test User",
			} as LeveeUser,
			scopes: [],
		};

		const member = createLeveeAudienceMember(mockClient);

		expect(member).toEqual({
			id: "user123",
			name: "Test User",
			connections: [],
		});
	});

	it("creates a LeveeMember with empty connections array", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				id: "user456",
				name: "Another User",
			} as LeveeUser,
			scopes: [],
		};

		const member = createLeveeAudienceMember(mockClient);

		expect(member.connections).toEqual([]);
		expect(Array.isArray(member.connections)).toBe(true);
	});

	it("preserves user id and name exactly", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				id: "special-user-id-123",
				name: "User With Special Name!@#",
			} as LeveeUser,
			scopes: [],
		};

		const member = createLeveeAudienceMember(mockClient);

		expect(member.id).toBe("special-user-id-123");
		expect(member.name).toBe("User With Special Name!@#");
	});

	it("throws error when user is undefined", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: undefined as unknown as LeveeUser,
			scopes: [],
		};

		expect(() => createLeveeAudienceMember(mockClient)).toThrow(
			'Specified user was not of type "LeveeUser"',
		);
	});

	it("throws error when user.id is missing", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				name: "User Without ID",
			} as unknown as LeveeUser,
			scopes: [],
		};

		expect(() => createLeveeAudienceMember(mockClient)).toThrow(
			'Specified user was not of type "LeveeUser"',
		);
	});

	it("throws error when user.name is missing", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				id: "user-without-name",
			} as unknown as LeveeUser,
			scopes: [],
		};

		expect(() => createLeveeAudienceMember(mockClient)).toThrow(
			'Specified user was not of type "LeveeUser"',
		);
	});

	it("throws error when user.id is not a string", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				id: 123,
				name: "User",
			} as unknown as LeveeUser,
			scopes: [],
		};

		expect(() => createLeveeAudienceMember(mockClient)).toThrow(
			'Specified user was not of type "LeveeUser"',
		);
	});

	it("throws error when user.name is not a string", () => {
		const mockClient: IClient = {
			mode: "write",
			details: { capabilities: { interactive: true } },
			permission: [],
			user: {
				id: "user789",
				name: 456,
			} as unknown as LeveeUser,
			scopes: [],
		};

		expect(() => createLeveeAudienceMember(mockClient)).toThrow(
			'Specified user was not of type "LeveeUser"',
		);
	});
});
