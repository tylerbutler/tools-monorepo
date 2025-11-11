import { describe, expect, it } from "vitest";
import { FileSystemError } from "../../../../src/core/errors/FileSystemError.js";
import { ErrorCategory } from "../../../../src/core/errors/SailError.js";

describe("FileSystemError", () => {
	describe("Construction", () => {
		it("should create a FileSystemError with message and context", () => {
			const error = new FileSystemError("File error", {
				filePath: "/path/to/file",
			});

			expect(error).toBeInstanceOf(FileSystemError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("File error");
			expect(error.category).toBe(ErrorCategory.FileSystem);
			expect(error.context.filePath).toBe("/path/to/file");
			expect(error.name).toBe("FileSystemError");
		});

		it("should handle file system-specific options", () => {
			const error = new FileSystemError(
				"Error",
				{},
				{
					operation: "read",
					errno: -2,
				},
			);

			expect(error.operation).toBe("read");
			expect(error.errno).toBe(-2);
		});

		it("should handle empty context and options", () => {
			const error = new FileSystemError("Error");

			expect(error.context).toEqual({});
			expect(error.operation).toBeUndefined();
			expect(error.errno).toBeUndefined();
		});

		it("should accept all file system options", () => {
			const error = new FileSystemError(
				"Error",
				{},
				{
					operation: "write",
					errno: -13,
					userMessage: "User message",
					isRetryable: true,
				},
			);

			expect(error.operation).toBe("write");
			expect(error.errno).toBe(-13);
			expect(error.userMessage).toBe("User message");
			expect(error.isRetryable).toBe(true);
		});
	});

	describe("Static Factory Methods", () => {
		describe("fileNotFound", () => {
			it("should create error for missing file with operation", () => {
				const error = FileSystemError.fileNotFound("/path/to/file.ts", "read", {
					packageName: "my-package",
				});

				expect(error.message).toBe("File not found: /path/to/file.ts");
				expect(error.context.filePath).toBe("/path/to/file.ts");
				expect(error.context.packageName).toBe("my-package");
				expect(error.operation).toBe("read");
				expect(error.userMessage).toContain("/path/to/file.ts");
				expect(error.userMessage).toContain("was not found");
			});

			it("should create error for missing file without operation", () => {
				const error = FileSystemError.fileNotFound("/file.txt");

				expect(error.message).toBe("File not found: /file.txt");
				expect(error.context.filePath).toBe("/file.txt");
				expect(error.operation).toBeUndefined();
			});

			it("should handle empty context", () => {
				const error = FileSystemError.fileNotFound("/path");

				expect(error.context.filePath).toBe("/path");
			});
		});

		describe("permissionDenied", () => {
			it("should create error for permission denied with operation", () => {
				const error = FileSystemError.permissionDenied("/root/file", "write", {
					packageName: "pkg",
				});

				expect(error.message).toBe("Permission denied: /root/file");
				expect(error.context.filePath).toBe("/root/file");
				expect(error.context.packageName).toBe("pkg");
				expect(error.operation).toBe("write");
				expect(error.userMessage).toContain("/root/file");
				expect(error.userMessage).toContain("Permission denied");
			});

			it("should create error without operation", () => {
				const error = FileSystemError.permissionDenied("/path");

				expect(error.message).toContain("/path");
				expect(error.operation).toBeUndefined();
			});
		});

		describe("lockFileNotFound", () => {
			it("should create error for missing lock file", () => {
				const error = FileSystemError.lockFileNotFound("my-package", {
					filePath: "/path/to/package",
				});

				expect(error.message).toBe(
					"Lock file not found for package my-package",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.filePath).toBe("/path/to/package");
				expect(error.operation).toBe("lockfile");
				expect(error.userMessage).toContain("my-package");
				expect(error.userMessage).toContain("npm install");
			});

			it("should handle empty context", () => {
				const error = FileSystemError.lockFileNotFound("pkg");

				expect(error.context.packageName).toBe("pkg");
				expect(error.operation).toBe("lockfile");
			});
		});

		describe("directoryNotFound", () => {
			it("should create error for missing directory with operation", () => {
				const error = FileSystemError.directoryNotFound(
					"/path/to/dir",
					"scan",
					{ packageName: "pkg" },
				);

				expect(error.message).toBe("Directory not found: /path/to/dir");
				expect(error.context.filePath).toBe("/path/to/dir");
				expect(error.context.packageName).toBe("pkg");
				expect(error.operation).toBe("scan");
				expect(error.userMessage).toContain("/path/to/dir");
			});

			it("should create error without operation", () => {
				const error = FileSystemError.directoryNotFound("/dir");

				expect(error.message).toContain("/dir");
				expect(error.operation).toBeUndefined();
			});
		});

		describe("ioError", () => {
			it("should create error for I/O operation failure", () => {
				const originalError = new Error("ENOENT");
				const error = FileSystemError.ioError(
					"/file.txt",
					"read",
					originalError,
					{ packageName: "pkg" },
				);

				expect(error.message).toBe(
					"I/O error during read of /file.txt: ENOENT",
				);
				expect(error.context.filePath).toBe("/file.txt");
				expect(error.context.packageName).toBe("pkg");
				expect(error.operation).toBe("read");
				expect(error.isRetryable).toBe(true);
				expect(error.userMessage).toContain("read");
				expect(error.userMessage).toContain("/file.txt");
				expect(error.userMessage).toContain("try again");
			});

			it("should mark as retryable", () => {
				const originalError = new Error("Temporary failure");
				const error = FileSystemError.ioError("/path", "write", originalError);

				expect(error.isRetryable).toBe(true);
			});

			it("should handle empty context", () => {
				const originalError = new Error("Error");
				const error = FileSystemError.ioError("/path", "op", originalError);

				expect(error.context.filePath).toBe("/path");
			});
		});

		describe("deleteFailed", () => {
			it("should create error for delete failure with reason", () => {
				const error = FileSystemError.deleteFailed(
					"/file.txt",
					"File is in use",
					{ packageName: "pkg" },
				);

				expect(error.message).toBe(
					"Failed to delete /file.txt: File is in use",
				);
				expect(error.context.filePath).toBe("/file.txt");
				expect(error.context.packageName).toBe("pkg");
				expect(error.operation).toBe("delete");
				expect(error.isRetryable).toBe(true);
				expect(error.userMessage).toContain("/file.txt");
				expect(error.userMessage).toContain("File is in use");
			});

			it("should create error without reason", () => {
				const error = FileSystemError.deleteFailed("/file");

				expect(error.message).toBe("Failed to delete /file");
				expect(error.userMessage).not.toContain("Reason:");
				expect(error.userMessage).toContain(
					"Please check if the file is in use",
				);
			});

			it("should handle empty context", () => {
				const error = FileSystemError.deleteFailed("/path");

				expect(error.context.filePath).toBe("/path");
				expect(error.operation).toBe("delete");
				expect(error.isRetryable).toBe(true);
			});
		});
	});

	describe("toJSON", () => {
		it("should serialize FileSystemError to JSON with all fields", () => {
			const error = new FileSystemError(
				"Error",
				{ filePath: "/file", packageName: "pkg" },
				{
					operation: "write",
					errno: -13,
					userMessage: "User message",
					isRetryable: true,
				},
			);

			const json = error.toJSON();

			expect(json.name).toBe("FileSystemError");
			expect(json.message).toBe("Error");
			expect(json.category).toBe(ErrorCategory.FileSystem);
			expect(json.context.filePath).toBe("/file");
			expect(json.context.packageName).toBe("pkg");
			expect(json.operation).toBe("write");
			expect(json.errno).toBe(-13);
			expect(json.userMessage).toBe("User message");
			expect(json.isRetryable).toBe(true);
		});

		it("should include undefined file system fields", () => {
			const error = new FileSystemError("Error");
			const json = error.toJSON();

			expect(json.operation).toBeUndefined();
			expect(json.errno).toBeUndefined();
		});
	});

	describe("Error Properties", () => {
		it("should have correct category", () => {
			const error = new FileSystemError("Test");

			expect(error.category).toBe(ErrorCategory.FileSystem);
		});

		it("should preserve stack trace", () => {
			const error = new FileSystemError("Test error");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("FileSystemError");
		});

		it("should have correct error name", () => {
			const error = FileSystemError.fileNotFound("/path");

			expect(error.name).toBe("FileSystemError");
		});
	});

	describe("Error Inheritance", () => {
		it("should be catchable as Error", () => {
			const error = FileSystemError.fileNotFound("/path");

			expect(error instanceof Error).toBe(true);
			expect(error instanceof FileSystemError).toBe(true);
		});

		it("should inherit from SailError", () => {
			const error = new FileSystemError("Test");

			expect(error.getFormattedMessage).toBeDefined();
			expect(error.getUserMessage).toBeDefined();
			expect(error.toJSON).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("should handle absolute paths", () => {
			const error = FileSystemError.fileNotFound("/absolute/path/to/file");

			expect(error.context.filePath).toBe("/absolute/path/to/file");
		});

		it("should handle relative paths", () => {
			const error = FileSystemError.fileNotFound("./relative/path");

			expect(error.context.filePath).toBe("./relative/path");
		});

		it("should handle paths with spaces", () => {
			const error = FileSystemError.fileNotFound("/path with spaces/file.txt");

			expect(error.context.filePath).toBe("/path with spaces/file.txt");
		});

		it("should handle Windows-style paths", () => {
			const error = FileSystemError.fileNotFound("C:\\Windows\\file.txt");

			expect(error.context.filePath).toBe("C:\\Windows\\file.txt");
		});

		it("should handle empty paths", () => {
			const error = FileSystemError.fileNotFound("");

			expect(error.context.filePath).toBe("");
		});

		it("should handle errno values", () => {
			const error1 = new FileSystemError("Error", {}, { errno: -2 }); // ENOENT
			const error2 = new FileSystemError("Error", {}, { errno: -13 }); // EACCES

			expect(error1.errno).toBe(-2);
			expect(error2.errno).toBe(-13);
		});

		it("should handle zero errno", () => {
			const error = new FileSystemError("Error", {}, { errno: 0 });

			expect(error.errno).toBe(0);
		});
	});
});
