import { expect, test } from "vitest";
import { parseRoute } from "./route";
import { parseRich } from "./rich";

const ids = ["0-1", "0-2"];

test("parseRoute", () => {
  expect(parseRoute("", ids)).toEqual({ name: "home" });
  expect(parseRoute("#/", ids)).toEqual({ name: "home" });
  expect(parseRoute("#/lesson/0-1", ids)).toEqual({ name: "lesson", id: "0-1" });
  expect(parseRoute("#/lesson/9-9", ids)).toEqual({ name: "home" });
  expect(parseRoute("#/glossary", ids)).toEqual({ name: "glossary" });
  expect(parseRoute("#/settings", ids)).toEqual({ name: "settings" });
  expect(parseRoute("#/parts", ids)).toEqual({ name: "parts" });
  expect(parseRoute("#/zzz", ids)).toEqual({ name: "home" });
});

test("parseRich", () => {
  expect(parseRich("[[current]]가 흐른다")).toEqual([{ term: "current" }, { text: "가 흐른다" }]);
  expect(parseRich("그냥 글")).toEqual([{ text: "그냥 글" }]);
  expect(parseRich("[[a]][[b]]")).toEqual([{ term: "a" }, { term: "b" }]);
  expect(parseRich("앞 [[a]] 뒤")).toEqual([{ text: "앞 " }, { term: "a" }, { text: " 뒤" }]);
  expect(parseRich("")).toEqual([]);
});
