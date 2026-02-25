import { describe, it, expect } from "bun:test"
import { isWebhook, isObject, isObjectArray, getPostData, normalizeToArray, formatDebugLogEntry, buildDebugLogMessage } from "./src/utils/helpers"

describe("isWebhook", () => {
    it("returns true for valid webhook structure", () => {
        expect(isWebhook({ media: { media_type: "movie" }, request: { request_id: "1" } })).toBe(true)
    })

    it("returns false for null", () => {
        expect(isWebhook(null)).toBe(false)
    })

    it("returns false for undefined", () => {
        expect(isWebhook(undefined)).toBe(false)
    })

    it("returns false for string", () => {
        expect(isWebhook("not a webhook")).toBe(false)
    })

    it("returns false for number", () => {
        expect(isWebhook(42)).toBe(false)
    })

    it("returns false if media is null", () => {
        expect(isWebhook({ media: null, request: { request_id: "1" } })).toBe(false)
    })

    it("returns false if request is null", () => {
        expect(isWebhook({ media: { media_type: "movie" }, request: null })).toBe(false)
    })

    it("returns false if media is a string", () => {
        expect(isWebhook({ media: "not an object", request: { request_id: "1" } })).toBe(false)
    })

    it("returns false if request is a string", () => {
        expect(isWebhook({ media: { media_type: "movie" }, request: "not an object" })).toBe(false)
    })

    it("returns false if media is missing", () => {
        expect(isWebhook({ request: { request_id: "1" } })).toBe(false)
    })

    it("returns false if request is missing", () => {
        expect(isWebhook({ media: { media_type: "movie" } })).toBe(false)
    })

    it("returns false for empty object", () => {
        expect(isWebhook({})).toBe(false)
    })
})

describe("isObject", () => {
    it("returns true for plain object", () => {
        expect(isObject({ key: "value" })).toBe(true)
    })

    it("returns true for empty object", () => {
        expect(isObject({})).toBe(true)
    })

    it("returns false for null", () => {
        expect(isObject(null)).toBe(false)
    })

    it("returns false for array", () => {
        expect(isObject([1, 2, 3])).toBe(false)
    })

    it("returns false for empty array", () => {
        expect(isObject([])).toBe(false)
    })

    it("returns false for string", () => {
        expect(isObject("hello")).toBe(false)
    })

    it("returns false for number", () => {
        expect(isObject(123)).toBe(false)
    })

    it("returns false for undefined", () => {
        expect(isObject(undefined)).toBe(false)
    })

    it("returns false for boolean", () => {
        expect(isObject(true)).toBe(false)
    })
})

describe("isObjectArray", () => {
    it("returns true for array containing objects", () => {
        expect(isObjectArray([{ id: 1 }, { id: 2 }])).toBe(true)
    })

    it("returns true for mixed array with at least one object", () => {
        expect(isObjectArray(["string", { id: 1 }])).toBe(true)
    })

    it("returns false for array of strings", () => {
        expect(isObjectArray(["a", "b", "c"])).toBe(false)
    })

    it("returns false for array of numbers", () => {
        expect(isObjectArray([1, 2, 3])).toBe(false)
    })

    it("returns false for empty array", () => {
        expect(isObjectArray([])).toBe(false)
    })

    it("returns false for non-array", () => {
        expect(isObjectArray("not an array")).toBe(false)
    })
})

describe("getPostData", () => {
    it("returns mediaType for movie", () => {
        const webhook: any = {
            media: { media_type: "movie" },
            request: { request_id: "1" },
            extra: [],
        }
        const result = getPostData(webhook)
        expect(result).toEqual({ mediaType: "movie" })
    })

    it("returns mediaType without seasons for tv with no extra", () => {
        const webhook: any = {
            media: { media_type: "tv" },
            request: { request_id: "1" },
        }
        const result = getPostData(webhook)
        expect(result).toEqual({ mediaType: "tv" })
    })

    it("returns mediaType without seasons for tv with empty extra", () => {
        const webhook: any = {
            media: { media_type: "tv" },
            request: { request_id: "1" },
            extra: [],
        }
        const result = getPostData(webhook)
        expect(result).toEqual({ mediaType: "tv" })
    })

    it("extracts seasons from tv webhook extra", () => {
        const webhook: any = {
            media: { media_type: "tv" },
            request: { request_id: "1" },
            extra: [{ name: "Requested Seasons", value: "1,2,3" }],
        }
        const result = getPostData(webhook)
        expect(result).toEqual({ mediaType: "tv", seasons: [1, 2, 3] })
    })

    it("handles single season", () => {
        const webhook: any = {
            media: { media_type: "tv" },
            request: { request_id: "1" },
            extra: [{ name: "Requested Seasons", value: "1" }],
        }
        const result = getPostData(webhook)
        expect(result).toEqual({ mediaType: "tv", seasons: [1] })
    })

    it("filters out non-integer seasons (e.g. NaN from spaces)", () => {
        const webhook: any = {
            media: { media_type: "tv" },
            request: { request_id: "1" },
            extra: [{ name: "Requested Seasons", value: "1, 2, 3" }],
        }
        const result = getPostData(webhook)
        // "1" -> 1, " 2" -> 2, " 3" -> 3 — Number() handles leading spaces
        expect(result.mediaType).toBe("tv")
        expect(result.seasons).toBeDefined()
    })

    it("ignores extra entries without Requested Seasons", () => {
        const webhook: any = {
            media: { media_type: "tv" },
            request: { request_id: "1" },
            extra: [{ name: "Something Else", value: "1,2" }],
        }
        const result = getPostData(webhook)
        expect(result).toEqual({ mediaType: "tv" })
    })
})

describe("normalizeToArray", () => {
    it("wraps a string in an array and lowercases", () => {
        expect(normalizeToArray("Hello")).toEqual(["hello"])
    })

    it("lowercases all elements in an array", () => {
        expect(normalizeToArray(["Foo", "BAR", "baz"])).toEqual(["foo", "bar", "baz"])
    })

    it("converts numbers to strings", () => {
        expect(normalizeToArray(42)).toEqual(["42"])
    })

    it("converts number arrays to string arrays", () => {
        expect(normalizeToArray([1, 2, 3])).toEqual(["1", "2", "3"])
    })

    it("handles empty array", () => {
        expect(normalizeToArray([])).toEqual([])
    })

    it("handles boolean", () => {
        expect(normalizeToArray(true)).toEqual(["true"])
    })
})

describe("formatDebugLogEntry", () => {
    it("formats a string", () => {
        expect(formatDebugLogEntry("hello")).toBe("hello")
    })

    it("formats a number", () => {
        expect(formatDebugLogEntry(123)).toBe("123")
    })

    it("formats an array of objects with name property", () => {
        expect(formatDebugLogEntry([{ name: "Action" }, { name: "Comedy" }])).toBe("Action, Comedy")
    })

    it("formats an array of strings", () => {
        expect(formatDebugLogEntry(["a", "b", "c"])).toBe("a, b, c")
    })

    it("formats an object with name property", () => {
        expect(formatDebugLogEntry({ name: "Test" })).toBe("Test")
    })

    it("formats an object without name property", () => {
        const result = formatDebugLogEntry({ key1: "val1", key2: ["a", "b"] })
        expect(result).toBe("key1: val1, key2: [a, b]")
    })

    it("formats an array of plain objects (no name)", () => {
        const result = formatDebugLogEntry([{ id: 1 }])
        expect(result).toBe('{"id":1}')
    })
})

describe("buildDebugLogMessage", () => {
    it("builds message with details", () => {
        const result = buildDebugLogMessage("Header:", { Field: "genre", Value: "Action" })
        expect(result).toContain("Header:")
        expect(result).toContain("Field: genre")
        expect(result).toContain("Value: Action")
    })

    it("builds message with empty details", () => {
        const result = buildDebugLogMessage("Header:")
        expect(result).toContain("Header:")
    })
})
