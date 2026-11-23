# `GET /v1/places`: contract, version 1

AI Travel Planner API · CSC13114 · 23KTPM1 · frozen for PA#2 on 24 Nov 2026

This file is the specification of one endpoint. The tests in `apps/api/test/contract/` check the
server against it. If the code and this file disagree, the code is wrong. If this file is wrong,
change it in its own commit that says why, in the same pull request as the matching test change.

`GET /v1/places` lists the checked places of Ho Chi Minh City, with filters, one page at a time.
The search page and manual mode use it. The agent does not call it over HTTP: its `search_places`
tool reads the same data inside the backend.

## 1. Conventions

- The endpoint lives under `/v1`. Responses are JSON in UTF-8.
- Money is an integer number of dong, in a field whose name ends in `Vnd`.
- An id is an opaque string of 1 to 64 characters from `a-z`, `0-9` and `-`. A client never builds
  or parses an id.
- City time is Asia/Ho_Chi_Minh, which is UTC+7 all year, with no daylight saving time. A clock
  time such as `"07:30"` is city time.
- A date is `YYYY-MM-DD`. An instant is an RFC 3339 date-time with an offset, for example
  `2026-11-28T14:00:00+07:00` or `2026-11-28T07:00:00Z`.
- Query parameter names are case-sensitive. A `+` in a query value must be sent as `%2B`, because
  a plain `+` in a query string means a space.
- A client ignores response fields that it does not know.

## 2. Errors

Every response under `/v1` with a 4xx or 5xx status is a problem details object (RFC 9457), with
`Content-Type: application/problem+json` and `Cache-Control: no-store`. This includes a request for
a `/v1` path that does not exist.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
Cache-Control: no-store

{
  "type": "https://ai-travel-planner.example/problems/validation",
  "title": "Invalid request",
  "status": 400,
  "detail": "2 query parameters are invalid.",
  "errors": [
    { "parameter": "distrct", "detail": "is not a parameter of this endpoint" },
    { "parameter": "limit", "detail": "must be an integer from 1 to 50" }
  ]
}
```

| Member   | Rule                                                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`   | `https://ai-travel-planner.example/problems/` followed by a slug from the table below. No other value. The URI is a name, not a link: a client does not fetch it                                               |
| `title`  | the title from the table below. It is always the same for one slug                                                                                                                                             |
| `status` | a number, equal to the HTTP status of the response                                                                                                                                                             |
| `detail` | one English sentence about this occurrence. Never a stack trace, a file path, a token, or a database message                                                                                                   |
| `errors` | only on `validation`, with at least one entry. One entry for each parameter that breaks a rule, in the order the parameters first appear in the URL. Each entry is `{ "parameter": <name>, "detail": <rule> }` |

| Slug                 | Status | Title              | When                                                                                                                                                                    | What the client does                                            |
| -------------------- | ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `validation`         | 400    | Invalid request    | a query parameter is unknown, repeated, empty, or breaks a rule of section 4.3                                                                                          | fix the request. The same request gives the same error again    |
| `invalid-cursor`     | 400    | Invalid cursor     | `cursor` cannot be read, was changed, is more than 24 hours old, or came with other filters than its first page (section 4.6)                                           | drop the cursor and load the first page again                   |
| `unauthenticated`    | 401    | Sign-in required   | the `Authorization` header is present but not valid, or a parameter that needs a signed-in caller comes without the header. The response has `WWW-Authenticate: Bearer` | sign in, then send the request again                            |
| `forbidden`          | 403    | Not allowed        | a `status` other than `checked` from a caller who is not an admin                                                                                                       | do not send it again                                            |
| `group-not-found`    | 404    | Group not found    | `groupId` names a group that does not exist, or a group that the caller is not a member of                                                                              | remove the group from the screen                                |
| `not-found`          | 404    | Not found          | no such path under `/v1`                                                                                                                                                | do not send it again                                            |
| `method-not-allowed` | 405    | Method not allowed | a method other than `GET` or `HEAD` on `/v1/places`. The response has `Allow: GET, HEAD`                                                                                | use `GET`                                                       |
| `internal`           | 500    | Internal error     | anything else. `detail` is always `Something went wrong on our side. Try again later.`                                                                                  | send it again later, at most 3 times, and wait longer each time |

Clients decide what to do from `type`, never from `title` or `detail`.

## 3. Resources

### Place

```json
{
  "id": "cho-dem-vi-du",
  "name": "Chợ Đêm Ví Dụ",
  "type": "market",
  "district": "quan-1",
  "address": "12 Đường Ví Dụ, Phường Bến Thành, Quận 1",
  "location": { "lat": 10.772542, "lng": 106.698021 },
  "setting": "outdoor",
  "priceLevel": 2,
  "ticketPriceVnd": 0,
  "openingHours": {
    "mon": [],
    "tue": [{ "open": "17:00", "close": "23:00" }],
    "wed": [{ "open": "17:00", "close": "23:00" }],
    "thu": [{ "open": "17:00", "close": "23:00" }],
    "fri": [{ "open": "17:00", "close": "01:00" }],
    "sat": [
      { "open": "09:00", "close": "11:30" },
      { "open": "17:00", "close": "01:00" }
    ],
    "sun": [{ "open": "17:00", "close": "23:00" }]
  },
  "status": "checked",
  "photo": {
    "url": "https://upload.wikimedia.org/wikipedia/commons/0/00/Example.jpg",
    "credit": "Photo: Example Author, CC BY-SA 4.0, via Wikimedia Commons"
  },
  "source": { "name": "Phoned the place", "url": null, "checkedOn": "2026-11-20" },
  "me": { "wantToGo": true, "visited": false },
  "group": { "memberCount": 4, "wantToGoCount": 3, "visitedCount": 1 }
}
```

The values are an example, not checked data.

| Field                         | Type           | Rule                                                                                                                                                                                                                                    |
| ----------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | string         | an id (section 1). Unique. Never used again for another place                                                                                                                                                                           |
| `name`                        | string         | 1 to 120 characters, as the place writes it, with Vietnamese accents                                                                                                                                                                    |
| `type`                        | string         | one value of the type list below                                                                                                                                                                                                        |
| `district`                    | string         | one value of the district list below                                                                                                                                                                                                    |
| `address`                     | string         | 1 to 200 characters                                                                                                                                                                                                                     |
| `location`                    | object         | `lat` from 10.3 to 11.2 and `lng` from 106.3 to 107.1, as numbers in degrees (WGS 84)                                                                                                                                                   |
| `setting`                     | string         | `indoor` or `outdoor`. The schedule validator uses it for the rain rule                                                                                                                                                                 |
| `priceLevel`                  | integer        | 1 to 4: what one person usually spends there, entry included. 1 is under 50,000 VND, 2 is 50,000 to 149,999 VND, 3 is 150,000 to 399,999 VND, 4 is 400,000 VND or more                                                                  |
| `ticketPriceVnd`              | integer        | 0 or more. The entry ticket for one person. 0 means that entry is free. Food and drink prices are in the menu, which this endpoint does not return                                                                                      |
| `openingHours`                | object or null | the seven keys `mon` to `sun`. Each key holds 0 to 4 intervals in time order that do not overlap. `[]` means closed all day. If the hours are unknown, the value is `null` and `status` is `incomplete`                                 |
| `openingHours.<day>[i].open`  | string         | `HH:MM` from `00:00` to `23:59`. The place is open from this minute                                                                                                                                                                     |
| `openingHours.<day>[i].close` | string         | `HH:MM` from `00:00` to `24:00`. The place is closed from this minute. If `close` is not later than `open`, the interval ends on the next day: `fri` `17:00` to `01:00` ends on Saturday at 01:00                                       |
| `status`                      | string         | `checked`: the place has opening hours and at least one menu item, so it can be a stop in a schedule. `incomplete`: hours or menu are missing, so it can never be a stop                                                                |
| `photo`                       | object or null | `url` is an absolute `https` URL. `credit` names the author and the licence. The client shows `credit` next to the photo                                                                                                                |
| `source`                      | object         | `name` (1 to 120 characters) and `url` (an absolute URL, or `null`) tell where the data comes from. `checkedOn` is the date of the last check of the hours and prices by a person                                                       |
| `me`                          | object         | if the caller is signed in, this block is present, else it is absent. `wantToGo`: the place is on the caller's want-to-go list. `visited`: the caller has a check-in at the place                                                       |
| `group`                       | object         | if the request has `groupId`, this block is present, else it is absent. `memberCount` is the number of members, the caller included. `wantToGoCount` and `visitedCount` count members, from 0 to `memberCount`. It never names a member |

The type list: `food`, `cafe`, `bar`, `market`, `museum`, `landmark`, `park`, `entertainment`,
`shopping`.

The district list holds the 22 districts that Ho Chi Minh City had before 1 July 2025:

```text
quan-1  quan-3  quan-4  quan-5  quan-6  quan-7  quan-8  quan-10  quan-11  quan-12
binh-thanh  phu-nhuan  go-vap  tan-binh  tan-phu  binh-tan  thu-duc
binh-chanh  hoc-mon  cu-chi  nha-be  can-gio
```

The city has no district level since that date. The list keeps the old names because people and the
class dataset still use them.

## 4. Endpoints

### 4.1 Who may call it

Everyone, signed in or not. The response depends on who calls.

| Caller                                | Sends                           | Can use                                                                                      | Response has        |
| ------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- | ------------------- |
| Anonymous                             | no `Authorization` header       | every parameter except `excludeVisited=true`, `groupId`, and a `status` other than `checked` | no `me` block       |
| Member, role `traveler` or `business` | `Authorization: Bearer <token>` | every parameter except a `status` other than `checked`                                       | `me` for the caller |
| Admin, role `admin`                   | `Authorization: Bearer <token>` | every parameter                                                                              | `me` for the caller |

The token is the session token that sign-in returns. Sign-in is not part of this contract.

Ownership rules:

1. No user owns a place. The places are the class dataset, and they are read-only through this
   endpoint.
2. The `me` block, and `excludeVisited` without `groupId`, use only the caller's own check-ins and
   want-to-go list. No parameter names another user. So a caller can never read another user's data
   here, and another user's check-ins never change the caller's response.
3. Only a member of a group can use its `groupId`. For anyone else, the group does not exist: the
   answer is `404 group-not-found`, with the same body as for an id that no group has. This rule is
   the same for admins.
4. The `group` block holds counts only. It never holds the names, ids or email addresses of members.
5. A signed-in response holds the caller's own data, so it carries `Cache-Control: private, no-store`.
   An anonymous response is the same for everyone, so it carries `Cache-Control: public, max-age=60`.
   Every `200` response carries `Vary: Authorization`.
6. A business account sees the same list as a traveler. Promotional posts never change which places
   are listed, or their order.

### 4.2 Request

```http
GET /v1/places?type=food,cafe&district=quan-1,quan-3&openAt=2026-11-28T14:00:00%2B07:00&limit=20 HTTP/1.1
Authorization: Bearer 3f6c9a0e5b7d41e2
```

The `Authorization` header is optional (section 4.1). The request has no body.

### 4.3 Query parameters

All parameters are optional.

| Parameter        | Value                                                                  | Default        |
| ---------------- | ---------------------------------------------------------------------- | -------------- |
| `type`           | a comma-separated list of different values from the type list          | every type     |
| `district`       | a comma-separated list of different values from the district list      | every district |
| `priceLevel`     | a comma-separated list of different integers from 1 to 4               | every level    |
| `q`              | text of 1 to 100 characters, after the spaces at both ends are removed | no text filter |
| `openAt`         | `now`, or an instant (section 1)                                       | no time filter |
| `excludeVisited` | `true` or `false`                                                      | `false`        |
| `groupId`        | an id (section 1)                                                      | no group       |
| `status`         | `checked`, `incomplete` or `all`                                       | `checked`      |
| `limit`          | an integer from 1 to 50, in digits, with no leading zero               | `20`           |
| `cursor`         | a `nextCursor` value from this endpoint, 1 to 1024 characters          | the first page |

A filter that the server cannot read is an error. The server never ignores it:

- A parameter that is not in the table is `400 validation`, for example `distrct=quan-1`. A
  misspelled filter must not return the unfiltered list, because the user then trusts a list that is
  not filtered.
- A parameter that appears twice is `400 validation`. Send one parameter with a list, such as
  `type=food,cafe`.
- An empty value, such as `type=` or `type=food,,cafe`, is `400 validation`.
- A value outside the rules is `400 validation`. A `limit` of `51` is an error, not 50. A district
  that is not in the list is an error, not an empty page.
- An `openAt` without an offset is `400 validation`, because the server cannot know its time zone.

Different parameters combine with AND. If a place has one of the values of a list, the list matches
the place.

### 4.4 Order of checks

The server makes these checks in this order. It stops at the first check that fails.

1. The path exists, else `404 not-found`. The method is `GET` or `HEAD`, else
   `405 method-not-allowed`.
2. If an `Authorization` header is present, it is `Bearer <token>` with a token that is known and
   not expired, else `401 unauthenticated`. A bad token is always an error, even in a request that
   needs no signed-in caller.
3. Every query parameter follows section 4.3, else `400 validation`, which lists every parameter
   that breaks a rule.
4. An anonymous caller does not send `excludeVisited=true`, `groupId`, or a `status` other than
   `checked`, else `401 unauthenticated`.
5. A caller who is not an admin does not send a `status` other than `checked`, else `403 forbidden`.
6. The caller is a member of the group in `groupId`, else `404 group-not-found`.
7. The `cursor` is valid (section 4.6), else `400 invalid-cursor`.
8. The answer is `200` with one page.

A `HEAD` request gets the same status and headers as a `GET` request, with no body.

### 4.5 How each filter matches

- `type`, `district`, `priceLevel`: the place has one of the listed values.
- `q`: the place's `name` contains the text. Case and Vietnamese accents do not matter, `đ` counts
  as `d`, and a run of spaces counts as one space. `pho` finds `Phở Hòa` and `PHỐ ĐI BỘ`.
- `openAt`: the place is open at that instant in city time, by its weekday hours. An overnight
  interval from the day before counts: with `fri` `17:00` to `01:00`, the place is open on Saturday
  at 00:30. In this version the hours do not change on public holidays. The agent checks holidays
  through `get_weather`. A place whose `openingHours` is `null` never matches.
- `openAt=now`: the server's clock at the time of the first page of the walk (section 4.6).
- `excludeVisited=true`: leaves out every place where the caller has a check-in. With `groupId`, it
  leaves out every place where any member of the group has a check-in.
- `status`: `checked` lists checked places only. `incomplete` lists incomplete places only. `all`
  lists both.

### 4.6 Response and paging

`200` with `Content-Type: application/json`:

```json
{
  "items": [{ "id": "cho-dem-vi-du", "name": "Chợ Đêm Ví Dụ", "…": "…" }],
  "nextCursor": "eyJ2IjoxLCJmIjoiNGQ2YTM5In0.Vq3k2YbH0m8sXcP1"
}
```

- `items` holds Places (section 3), from 0 to `limit` of them. An empty `items` with a `null`
  `nextCursor` means that no place matches.
- The order is by `name`, with case and accents removed as for `q`, then by `id`. Both are compared
  code point by code point. The order is the same on every page.
- If more places come after this page, `nextCursor` is a cursor. If no more places come,
  `nextCursor` is `null`. A client never gets a cursor that leads to an empty page.
- A walk is the first page and every page that follows it through `nextCursor`.
- A cursor is opaque and signed by the server. The client sends it back unchanged, with the same
  filters as the first page: the same `type`, `district`, `priceLevel`, `q`, `openAt`,
  `excludeVisited`, `groupId` and `status`. The order of values in a list does not matter. `q` is
  compared after the spaces at both ends are removed, with case and accents ignored. `limit` can
  change from page to page.
- A cursor is valid for 24 hours after the first page of its walk. After that, it is
  `invalid-cursor`, and the client starts again from the first page.
- With `openAt=now`, every page of one walk uses the instant of the first page. So a place does not
  drop out in the middle of a walk because it closed while the user scrolled.
- Pages do not move. A place that exists and does not change during the walk appears exactly once.
  A place that is added, changed or removed during the walk appears at most once. `excludeVisited`
  is applied again on each page, so a place where someone checks in during the walk can drop out of
  later pages.
- There is no total count.

The response headers `Cache-Control` and `Vary` follow section 4.1, rule 5.

### 4.7 Example

```http
GET /v1/places?type=market&openAt=2026-11-28T00:30:00%2B07:00&limit=1 HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: public, max-age=60
Vary: Authorization

{
  "items": [
    {
      "id": "cho-dem-vi-du",
      "name": "Chợ Đêm Ví Dụ",
      "type": "market",
      "…": "…",
      "status": "checked"
    }
  ],
  "nextCursor": null
}
```

28 Nov 2026 is a Saturday, and the place in section 3 is open until 01:00 from its Friday interval.
The caller is anonymous, so the place has no `me` block.

## 5. Versions and changes

- Within `/v1`, only additive changes are made: a new optional query parameter, a new response
  field, a new value in the type list or the district list, or a new problem type. A client shows an
  unknown `type` or `district` value as plain text.
- Any other change is a new version, `/v2`. Examples: a field is renamed or removed, a type or a
  unit changes, `setting` gets a new value, a rule gets stricter, a status code or a slug changes,
  the default `limit` or the order changes. `/v1` keeps working for at least 30 days after `/v2`
  ships. During that time, its responses carry the `Deprecation` header (RFC 9745) and the `Sunset`
  header (RFC 8594).
- The data changes without a new version. The product owners can publish a new dataset, and places
  can be added, changed or removed. An id is never used again for another place. A removed place is
  no longer listed.
- The type list and the district list follow the class dataset, which the product owners publish on
  27 Nov 2026. If the dataset uses other values, the lists change in their own commit, under the
  rules above.
- A pull request that changes this file also changes the contract tests, and says why. A contract
  test does not change without a change to this file, or a reason in the pull request.
