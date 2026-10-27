import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../../src/integrations/api/client.ts";
import {
  describeDraftFailure,
  describeSubmitError,
} from "../../src/lib/form-feedback.ts";

function failure(error) {
  return { ok: false, error, fields: {} };
}

test("required reasons map to Missing Information", () => {
  assert.equal(describeDraftFailure(failure("Title is required")).title, "Missing Information");
  assert.equal(
    describeDraftFailure(failure("A valid start time is required")).title,
    "Missing Information"
  );
});

test("a bad time range maps to Invalid Time Range and mentions 'after'", () => {
  const feedback = describeDraftFailure(failure("End time must be after start time"));
  assert.equal(feedback.title, "Invalid Time Range");
  assert.match(feedback.description, /after/);
});

test("other reasons show the reason text", () => {
  const feedback = describeDraftFailure(failure("Title must be 200 characters or fewer"));
  assert.equal(feedback.description, "Title must be 200 characters or fewer");
  assert.notEqual(feedback.title, "Missing Information");
});

test("describeSubmitError shows the server message for a 400 and the fallback otherwise", () => {
  const bad = new ApiError("Title is required", 400, {});
  assert.deepEqual(describeSubmitError(bad, "Failed to create meeting."), {
    title: "Error",
    description: "Title is required",
  });
  assert.deepEqual(describeSubmitError(new Error("x"), "Failed to create meeting."), {
    title: "Error",
    description: "Failed to create meeting.",
  });
  assert.equal(describeSubmitError(new ApiError("boom", 500, {}), "Fallback").description, "Fallback");
});
