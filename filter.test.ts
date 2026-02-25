import { describe, it, expect } from "bun:test"
import { matchValue, matchKeywords, matchContentRatings, findInstances } from "./src/services/filter"

// ============================================================
// matchValue — direct unit tests
// ============================================================

describe("matchValue", () => {
    describe("include mode (required=false)", () => {
        it("matches substring in a string", () => {
            expect(matchValue("act", "Action", false)).toBe(true)
        })

        it("is case-insensitive", () => {
            expect(matchValue("ACTION", "action", false)).toBe(true)
        })

        it("returns false when no substring match", () => {
            expect(matchValue("horror", "Action", false)).toBe(false)
        })

        it("matches in nested objects", () => {
            expect(matchValue("Action", { genres: [{ name: "Action" }] }, false)).toBe(true)
        })

        it("matches in arrays", () => {
            expect(matchValue("Action", ["Comedy", "Action"], false)).toBe(true)
        })

        it("matches any of multiple filter values", () => {
            expect(matchValue(["horror", "action"], "Action", false)).toBe(true)
        })

        it("returns false when none of multiple filter values match", () => {
            expect(matchValue(["horror", "romance"], "Action", false)).toBe(false)
        })

        it("handles numbers in data", () => {
            expect(matchValue("16", 16, false)).toBe(true)
        })

        it("handles booleans in data", () => {
            expect(matchValue("true", true, false)).toBe(true)
        })
    })

    describe("require mode (required=true)", () => {
        it("matches exact string", () => {
            expect(matchValue("action", "Action", true)).toBe(true)
        })

        it("requires ALL values to be present", () => {
            expect(matchValue(["action", "comedy"], ["Action", "Comedy"], true)).toBe(true)
        })

        it("fails when not all required values are found", () => {
            expect(matchValue(["action", "comedy"], ["Action"], true)).toBe(false)
        })

        it("matches exact values in nested objects", () => {
            expect(matchValue("action", { genres: [{ name: "Action" }] }, true)).toBe(true)
        })

        it("does NOT do substring matching", () => {
            // "act" is not an exact match for "action"
            expect(matchValue("act", "Action", true)).toBe(false)
        })
    })
})

// ============================================================
// matchKeywords — direct unit tests
// ============================================================

describe("matchKeywords", () => {
    const keywords = [
        { name: "epic" },
        { name: "gladiator" },
        { name: "roman empire" },
        { name: "sequel" },
    ]

    describe("simple string/array condition (include shorthand)", () => {
        it("matches simple string by substring", () => {
            expect(matchKeywords(keywords, "epic")).toBe(true)
        })

        it("matches partial substring", () => {
            expect(matchKeywords(keywords, "roman")).toBe(true)
        })

        it("returns false when keyword not found", () => {
            expect(matchKeywords(keywords, "horror")).toBe(false)
        })

        it("matches any from array", () => {
            expect(matchKeywords(keywords, ["horror", "epic"])).toBe(true)
        })

        it("returns false when no array element matches", () => {
            expect(matchKeywords(keywords, ["horror", "zombie"])).toBe(false)
        })
    })

    describe("require condition", () => {
        it("passes when single required keyword present", () => {
            expect(matchKeywords(keywords, { require: "epic" })).toBe(true)
        })

        it("passes when ALL required keywords present", () => {
            expect(matchKeywords(keywords, { require: ["epic", "gladiator"] })).toBe(true)
        })

        it("fails when NOT all required keywords present", () => {
            expect(matchKeywords(keywords, { require: ["epic", "horror"] })).toBe(false)
        })

        it("fails when none of the required keywords present", () => {
            expect(matchKeywords(keywords, { require: ["horror", "zombie"] })).toBe(false)
        })
    })

    describe("include condition", () => {
        it("matches substring include", () => {
            expect(matchKeywords(keywords, { include: "epic" })).toBe(true)
        })

        it("matches partial substring include", () => {
            expect(matchKeywords(keywords, { include: "glad" })).toBe(true)
        })

        it("matches any from include array", () => {
            expect(matchKeywords(keywords, { include: ["horror", "epic"] })).toBe(true)
        })

        it("fails when no include match", () => {
            expect(matchKeywords(keywords, { include: "horror" })).toBe(false)
        })
    })

    describe("exclude condition", () => {
        it("fails when excluded keyword found", () => {
            expect(matchKeywords(keywords, { exclude: "epic" })).toBe(false)
        })

        it("passes when excluded keyword not found", () => {
            expect(matchKeywords(keywords, { exclude: "horror" })).toBe(true)
        })

        it("fails when any excluded keyword matches", () => {
            expect(matchKeywords(keywords, { exclude: ["horror", "epic"] })).toBe(false)
        })

        it("passes when no excluded keywords match", () => {
            expect(matchKeywords(keywords, { exclude: ["horror", "zombie"] })).toBe(true)
        })
    })

    describe("combined conditions", () => {
        it("passes with include + exclude when both satisfied", () => {
            expect(matchKeywords(keywords, { include: "epic", exclude: "horror" })).toBe(true)
        })

        it("fails with include + exclude when exclude matches", () => {
            expect(matchKeywords(keywords, { include: "epic", exclude: "sequel" })).toBe(false)
        })

        it("passes with require + include + exclude", () => {
            expect(matchKeywords(keywords, { require: "epic", include: "glad", exclude: "horror" })).toBe(true)
        })

        it("fails with require + include when require not met", () => {
            expect(matchKeywords(keywords, { require: ["epic", "horror"], include: "glad" })).toBe(false)
        })
    })

    describe("empty keywords", () => {
        it("returns false for simple condition with empty keywords", () => {
            expect(matchKeywords([], "epic")).toBe(false)
        })

        it("returns false for include condition with empty keywords", () => {
            expect(matchKeywords([], { include: "epic" })).toBe(false)
        })

        it("returns true for exclude condition with empty keywords", () => {
            // No keywords means no excluded keyword can be found
            expect(matchKeywords([], { exclude: "epic" })).toBe(true)
        })
    })
})

// ============================================================
// matchContentRatings — direct unit tests
// ============================================================

describe("matchContentRatings", () => {
    const ratings = {
        results: [
            { iso_3166_1: "US", rating: "TV-14" },
            { iso_3166_1: "DE", rating: "16" },
            { iso_3166_1: "GB", rating: "15" },
        ],
    }

    it("matches simple string condition", () => {
        expect(matchContentRatings(ratings as any, "16")).toBe(true)
    })

    it("matches substring condition", () => {
        expect(matchContentRatings(ratings as any, "tv-14")).toBe(true)
    })

    it("returns false when no rating matches", () => {
        expect(matchContentRatings(ratings as any, "R")).toBe(false)
    })

    it("matches require condition", () => {
        expect(matchContentRatings(ratings as any, { require: "16" })).toBe(true)
    })

    it("fails require when ALL not present", () => {
        expect(matchContentRatings(ratings as any, { require: ["16", "R"] })).toBe(false)
    })

    it("passes require when ALL present", () => {
        expect(matchContentRatings(ratings as any, { require: ["16", "15"] })).toBe(true)
    })

    it("matches include condition", () => {
        expect(matchContentRatings(ratings as any, { include: "14" })).toBe(true)
    })

    it("fails exclude when excluded rating found", () => {
        expect(matchContentRatings(ratings as any, { exclude: "16" })).toBe(false)
    })

    it("passes exclude when no excluded rating found", () => {
        expect(matchContentRatings(ratings as any, { exclude: "R" })).toBe(true)
    })

    it("returns false for null contentRatings", () => {
        expect(matchContentRatings(null as any, "16")).toBe(false)
    })

    it("returns false for undefined contentRatings", () => {
        expect(matchContentRatings(undefined as any, "16")).toBe(false)
    })

    it("returns false for empty results array", () => {
        expect(matchContentRatings({ results: [] } as any, "16")).toBe(false)
    })
})

// ============================================================
// findInstances — additional edge case tests
// ============================================================

// Reusable webhook/data fixtures
const movieWebhook: any = {
    notification_type: "MEDIA_PENDING",
    media: { media_type: "movie", tmdbId: "1", status: "PENDING", status4k: "UNKNOWN" },
    request: { request_id: "1", requestedBy_email: "user@test.com", requestedBy_username: "testuser" },
    extra: [],
}

const tvWebhook: any = {
    notification_type: "MEDIA_PENDING",
    media: { media_type: "tv", tmdbId: "2", status: "PENDING", status4k: "UNKNOWN" },
    request: { request_id: "2", requestedBy_email: "user@test.com", requestedBy_username: "testuser" },
    extra: [{ name: "Requested Seasons", value: "1,2,3" }],
}

const movieData: any = {
    originalTitle: "Test Movie",
    originalLanguage: "en",
    genres: [{ id: 28, name: "Action" }, { id: 35, name: "Comedy" }],
    keywords: [{ name: "epic" }, { name: "adventure" }],
    contentRatings: { results: [{ rating: "16" }] },
}

const tvData: any = {
    originalName: "Test Show",
    originalLanguage: "ja",
    genres: [{ id: 16, name: "Animation" }],
    keywords: [{ name: "anime" }, { name: "magic" }],
    contentRatings: { results: [{ rating: "TV-14" }] },
}

describe("findInstances - additional edge cases", () => {
    describe("is_4k filter logic", () => {
        it("is_4k=false matches non-4k pending request", () => {
            const webhook: any = { ...movieWebhook, media: { ...movieWebhook.media, status: "PENDING", status4k: "UNKNOWN" } }
            const filters: any = [{ media_type: "movie", is_4k: false, apply: "non-4k" }]
            expect(findInstances(webhook, movieData, filters)).toBe("non-4k")
        })

        it("is_4k=true matches 4k pending request", () => {
            const webhook: any = { ...movieWebhook, media: { ...movieWebhook.media, status: "UNKNOWN", status4k: "PENDING" } }
            const filters: any = [{ media_type: "movie", is_4k: true, apply: "4k-instance" }]
            expect(findInstances(webhook, movieData, filters)).toBe("4k-instance")
        })

        it("is_4k=false does NOT match when both statuses are PENDING", () => {
            const webhook: any = { ...movieWebhook, media: { ...movieWebhook.media, status: "PENDING", status4k: "PENDING" } }
            const filters: any = [{ media_type: "movie", is_4k: false, apply: "non-4k" }]
            expect(findInstances(webhook, movieData, filters)).toBe(null)
        })

        it("is_4k=true does NOT match when both statuses are PENDING", () => {
            const webhook: any = { ...movieWebhook, media: { ...movieWebhook.media, status: "PENDING", status4k: "PENDING" } }
            const filters: any = [{ media_type: "movie", is_4k: true, apply: "4k-instance" }]
            expect(findInstances(webhook, movieData, filters)).toBe(null)
        })

        it("is_4k=undefined matches regardless of status", () => {
            const webhook: any = { ...movieWebhook, media: { ...movieWebhook.media, status: "PENDING", status4k: "PENDING" } }
            const filters: any = [{ media_type: "movie", apply: "any-instance" }]
            expect(findInstances(webhook, movieData, filters)).toBe("any-instance")
        })
    })

    describe("max_seasons filter", () => {
        it("passes when requested seasons within limit", () => {
            const webhook: any = { ...tvWebhook, extra: [{ name: "Requested Seasons", value: "1,2" }] }
            const filters: any = [{ media_type: "tv", conditions: { max_seasons: 3 }, apply: "tv-instance" }]
            expect(findInstances(webhook, tvData, filters)).toBe("tv-instance")
        })

        it("fails when requested seasons exceed limit", () => {
            const webhook: any = { ...tvWebhook, extra: [{ name: "Requested Seasons", value: "1,2,3,4" }] }
            const filters: any = [{ media_type: "tv", conditions: { max_seasons: 2 }, apply: "tv-instance" }]
            expect(findInstances(webhook, tvData, filters)).toBe(null)
        })

        it("passes when requested seasons equal limit (not exceeded)", () => {
            const webhook: any = { ...tvWebhook, extra: [{ name: "Requested Seasons", value: "1,2" }] }
            const filters: any = [{ media_type: "tv", conditions: { max_seasons: 2 }, apply: "tv-instance" }]
            expect(findInstances(webhook, tvData, filters)).toBe("tv-instance")
        })

        it("fails when webhook has no extra field", () => {
            const webhook: any = { ...tvWebhook, extra: undefined }
            const filters: any = [{ media_type: "tv", conditions: { max_seasons: 5 }, apply: "tv-instance" }]
            expect(findInstances(webhook, tvData, filters)).toBe(null)
        })

        it("handles max_seasons as string", () => {
            const webhook: any = { ...tvWebhook, extra: [{ name: "Requested Seasons", value: "1,2,3,4" }] }
            const filters: any = [{ media_type: "tv", conditions: { max_seasons: "2" }, apply: "tv-instance" }]
            expect(findInstances(webhook, tvData, filters)).toBe(null)
        })
    })

    describe("catch-all filters (no conditions)", () => {
        it("matches filter with no conditions", () => {
            const filters: any = [{ media_type: "movie", apply: "catch-all" }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("catch-all")
        })

        it("matches filter with empty conditions object", () => {
            const filters: any = [{ media_type: "movie", conditions: {}, apply: "catch-all" }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("catch-all")
        })
    })

    describe("filter ordering (first match wins)", () => {
        it("returns the first matching filter", () => {
            const filters: any = [
                { media_type: "movie", conditions: { originalLanguage: "en" }, apply: "first" },
                { media_type: "movie", conditions: { originalLanguage: "en" }, apply: "second" },
            ]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("first")
        })

        it("skips non-matching filter and returns next match", () => {
            const filters: any = [
                { media_type: "movie", conditions: { originalLanguage: "fr" }, apply: "french" },
                { media_type: "movie", conditions: { originalLanguage: "en" }, apply: "english" },
            ]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("english")
        })
    })

    describe("apply returns array of instances", () => {
        it("returns array when filter apply is an array", () => {
            const filters: any = [{ media_type: "movie", apply: ["inst1", "inst2"] }]
            const result = findInstances(movieWebhook, movieData, filters)
            expect(result).toEqual(["inst1", "inst2"])
        })
    })

    describe("media type mismatch", () => {
        it("returns null when no filter matches media type", () => {
            const filters: any = [{ media_type: "tv", apply: "tv-only" }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe(null)
        })
    })

    describe("empty filters", () => {
        it("returns null with empty filters array", () => {
            expect(findInstances(movieWebhook, movieData, [])).toBe(null)
        })
    })

    describe("condition referencing webhook.request fields", () => {
        it("matches requestedBy_username from webhook request", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { requestedBy_username: "testuser" },
                apply: "user-match",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("user-match")
        })

        it("fails when requestedBy_username does not match", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { requestedBy_username: "otheruser" },
                apply: "user-match",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe(null)
        })

        it("falls back to webhook.request when key not in data", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { requestedBy_email: "user@test.com" },
                apply: "email-match",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("email-match")
        })
    })

    describe("condition referencing non-existent key", () => {
        it("returns null when condition key not in data or webhook", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { nonExistentField: "value" },
                apply: "should-not-match",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe(null)
        })
    })

    describe("content ratings via findInstances", () => {
        it("matches content rating with include", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { contentRatings: { include: "16" } },
                apply: "rating-match",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("rating-match")
        })

        it("fails when data has no contentRatings", () => {
            const dataNoRatings: any = { ...movieData, contentRatings: undefined }
            const filters: any = [{
                media_type: "movie",
                conditions: { contentRatings: "16" },
                apply: "rating-match",
            }]
            expect(findInstances(movieWebhook, dataNoRatings, filters)).toBe(null)
        })
    })

    describe("keywords via findInstances when data has no keywords", () => {
        it("fails when data has no keywords", () => {
            const dataNoKeywords: any = { ...movieData, keywords: undefined }
            const filters: any = [{
                media_type: "movie",
                conditions: { keywords: "epic" },
                apply: "keyword-match",
            }]
            expect(findInstances(movieWebhook, dataNoKeywords, filters)).toBe(null)
        })
    })

    describe("generic field with require/include/exclude objects", () => {
        it("matches genre with require (exact match)", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { genres: { require: "Action" } },
                apply: "genre-require",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("genre-require")
        })

        it("fails genre require when value not present", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { genres: { require: "Horror" } },
                apply: "genre-require",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe(null)
        })

        it("matches genre with exclude (passes when not excluded)", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { genres: { exclude: "Horror" } },
                apply: "genre-exclude",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe("genre-exclude")
        })

        it("fails genre exclude when excluded value present", () => {
            const filters: any = [{
                media_type: "movie",
                conditions: { genres: { exclude: "Action" } },
                apply: "genre-exclude",
            }]
            expect(findInstances(movieWebhook, movieData, filters)).toBe(null)
        })
    })
})
