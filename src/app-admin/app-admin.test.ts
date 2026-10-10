import { describe, expect, it } from "vitest";
import { parseAppAdminEmails } from "./app-admin";

describe("parseAppAdminEmails", () => {
  it("reads a comma-separated list, ignoring spaces and empty entries", () => {
    expect(parseAppAdminEmails(" admin@example.com, ,ola@example.com,")).toEqual([
      "admin@example.com",
      "ola@example.com",
    ]);
  });

  it("gives nobody the role when the variable is not set", () => {
    expect(parseAppAdminEmails(undefined)).toEqual([]);
  });
});
