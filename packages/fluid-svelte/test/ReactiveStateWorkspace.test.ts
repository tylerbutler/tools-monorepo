import type { LatestRaw } from "@fluidframework/presence/alpha";
import { beforeEach, describe, expect, it } from "vitest";

import { ReactiveStateWorkspace } from "../src/lib/ReactiveStateWorkspace.svelte.js";
import {
	createMockAttendee,
	createMockLatest,
	type MockAttendee,
	type MockLatest,
} from "./mocks/presence.js";

interface TestCoordinate {
	x: number;
	y: number;
}

describe("ReactiveStateWorkspace", () => {
	let mockLatest: MockLatest<TestCoordinate>;
	let workspace: ReactiveStateWorkspace<TestCoordinate>;

	beforeEach(() => {
		mockLatest = createMockLatest<TestCoordinate>({ x: 0, y: 0 });
		workspace = new ReactiveStateWorkspace(
			mockLatest as unknown as LatestRaw<TestCoordinate>,
		);
	});

	it("should initialize with empty data", () => {
		expect(workspace.data.size).toBe(0);
		expect(workspace.unfilteredData.size).toBe(0);
	});

	it("should expose local via latest.local", () => {
		expect(workspace.local).toEqual({ x: 0, y: 0 });
	});

	it("should expose the underlying latest instance", () => {
		expect(workspace.latest).toBe(mockLatest);
	});

	describe("remoteUpdated events", () => {
		it("should add remote attendee data", () => {
			const attendee = createMockAttendee("remote-1");
			mockLatest.emitRemoteUpdated({
				attendee,
				value: { x: 10, y: 20 },
			});

			expect(workspace.data.size).toBe(1);
			expect(workspace.data.get(attendee as unknown as never)).toEqual({
				x: 10,
				y: 20,
			});
		});

		it("should update existing remote attendee data", () => {
			const attendee = createMockAttendee("remote-1");
			mockLatest.emitRemoteUpdated({
				attendee,
				value: { x: 10, y: 20 },
			});
			mockLatest.emitRemoteUpdated({
				attendee,
				value: { x: 30, y: 40 },
			});

			expect(workspace.data.size).toBe(1);
			expect(workspace.data.get(attendee as unknown as never)).toEqual({
				x: 30,
				y: 40,
			});
		});

		it("should track multiple remote attendees", () => {
			const attendee1 = createMockAttendee("remote-1");
			const attendee2 = createMockAttendee("remote-2");

			mockLatest.emitRemoteUpdated({
				attendee: attendee1,
				value: { x: 10, y: 20 },
			});
			mockLatest.emitRemoteUpdated({
				attendee: attendee2,
				value: { x: 30, y: 40 },
			});

			expect(workspace.data.size).toBe(2);
			expect(workspace.data.get(attendee1 as unknown as never)).toEqual({
				x: 10,
				y: 20,
			});
			expect(workspace.data.get(attendee2 as unknown as never)).toEqual({
				x: 30,
				y: 40,
			});
		});

		it("should also appear in unfilteredData", () => {
			const attendee = createMockAttendee("remote-1");
			mockLatest.emitRemoteUpdated({
				attendee,
				value: { x: 10, y: 20 },
			});

			expect(workspace.unfilteredData.size).toBe(1);
			expect(
				workspace.unfilteredData.get(attendee as unknown as never),
			).toEqual({ x: 10, y: 20 });
		});
	});

	describe("localUpdated events", () => {
		it("should add local user data keyed by myself", () => {
			const myself = mockLatest.presence.attendees.getMyself();
			mockLatest.emitLocalUpdated({ value: { x: 5, y: 15 } });

			expect(workspace.data.size).toBe(1);
			expect(workspace.data.get(myself as unknown as never)).toEqual({
				x: 5,
				y: 15,
			});
		});

		it("should update local user data on subsequent events", () => {
			const myself = mockLatest.presence.attendees.getMyself();
			mockLatest.emitLocalUpdated({ value: { x: 5, y: 15 } });
			mockLatest.emitLocalUpdated({ value: { x: 25, y: 35 } });

			expect(workspace.data.size).toBe(1);
			expect(workspace.data.get(myself as unknown as never)).toEqual({
				x: 25,
				y: 35,
			});
		});
	});

	describe("attendeeDisconnected events", () => {
		it("should remove the attendee from reactive state", () => {
			const attendee = createMockAttendee("remote-1");
			mockLatest.emitRemoteUpdated({
				attendee,
				value: { x: 10, y: 20 },
			});
			expect(workspace.data.size).toBe(1);

			mockLatest.emitAttendeeDisconnected(attendee as unknown as never);
			expect(workspace.data.size).toBe(0);
			expect(workspace.unfilteredData.size).toBe(0);
		});

		it("should not affect other attendees", () => {
			const attendee1 = createMockAttendee("remote-1");
			const attendee2 = createMockAttendee("remote-2");

			mockLatest.emitRemoteUpdated({
				attendee: attendee1,
				value: { x: 10, y: 20 },
			});
			mockLatest.emitRemoteUpdated({
				attendee: attendee2,
				value: { x: 30, y: 40 },
			});
			expect(workspace.data.size).toBe(2);

			mockLatest.emitAttendeeDisconnected(attendee1 as unknown as never);
			expect(workspace.data.size).toBe(1);
			expect(workspace.data.get(attendee2 as unknown as never)).toEqual({
				x: 30,
				y: 40,
			});
		});

		it("should be a no-op for unknown attendees", () => {
			const attendee = createMockAttendee("remote-1");
			const unknown = createMockAttendee("unknown");

			mockLatest.emitRemoteUpdated({
				attendee,
				value: { x: 10, y: 20 },
			});

			mockLatest.emitAttendeeDisconnected(unknown as unknown as never);
			expect(workspace.data.size).toBe(1);
		});
	});

	describe("data filtering", () => {
		it("should exclude attendees with Disconnected status from data", () => {
			const connected = createMockAttendee("remote-1", "Connected");
			const disconnected = createMockAttendee("remote-2", "Disconnected");

			mockLatest.emitRemoteUpdated({
				attendee: connected,
				value: { x: 10, y: 20 },
			});
			mockLatest.emitRemoteUpdated({
				attendee: disconnected,
				value: { x: 30, y: 40 },
			});

			// data should filter out the disconnected attendee
			expect(workspace.data.size).toBe(1);
			expect(workspace.data.get(connected as unknown as never)).toEqual({
				x: 10,
				y: 20,
			});
			expect(workspace.data.has(disconnected as unknown as never)).toBe(false);
		});

		it("should include attendees with Disconnected status in unfilteredData", () => {
			const disconnected = createMockAttendee("remote-1", "Disconnected");

			mockLatest.emitRemoteUpdated({
				attendee: disconnected,
				value: { x: 10, y: 20 },
			});

			// unfilteredData should include all attendees regardless of status
			expect(workspace.unfilteredData.size).toBe(1);
			expect(
				workspace.unfilteredData.get(disconnected as unknown as never),
			).toEqual({ x: 10, y: 20 });
		});
	});

	describe("mixed local and remote updates", () => {
		it("should track both local and remote attendees", () => {
			const myself = mockLatest.presence.attendees.getMyself();
			const remote = createMockAttendee("remote-1");

			mockLatest.emitLocalUpdated({ value: { x: 1, y: 2 } });
			mockLatest.emitRemoteUpdated({
				attendee: remote,
				value: { x: 3, y: 4 },
			});

			expect(workspace.data.size).toBe(2);
			expect(workspace.data.get(myself as unknown as never)).toEqual({
				x: 1,
				y: 2,
			});
			expect(workspace.data.get(remote as unknown as never)).toEqual({
				x: 3,
				y: 4,
			});
		});
	});
});
