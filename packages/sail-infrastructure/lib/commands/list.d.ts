/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { Command } from "@oclif/core";
/**
 * This command is intended for testing and debugging use only.
 */
export declare class ListCommand extends Command {
    static description: string;
    static flags: {
        readonly path: import("@oclif/core/interfaces").OptionFlag<string, import("@oclif/core/interfaces").CustomOptions>;
        readonly full: import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private logFullReport;
    private logCompactReport;
    private logIndent;
}
//# sourceMappingURL=list.d.ts.map