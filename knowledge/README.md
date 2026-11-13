# DC Airbnb Chatbot — Knowledge Base

Documents for the "Questions?" assistant in the DC Host Calculator app, prepared for a retrieval (RAG) system.

- **`sources.csv`** lists every source with its full URL, format (HTML or PDF), authority, and whether to ingest it. Use it to fetch the full original documents for the RAG index.
- **The numbered `.md` files** are faithful summaries of each source with short `##` sections. Use them as a clean, pre-chunked starting point, or as a check on what the full documents say.

**Retrieved:** 2026-11-13 (file 12: 2026-11-10).

## Files

| # | File | Source | Authority |
|---|---|---|---|
| 01 | dlcp_operating_a_short_term_rental | DLCP web page | Official, most current DC rules and fee |
| 02 | dlcp_short_term_rental_guide_pdf | DLCP PDF guide | Official, older |
| 03 | dc_code_title30_chapter2_short_term_rentals | DC Code §§ 30-201.01–30-210.01 | Official statute |
| 04 | dlcp_vacation_rental_exemption | DLCP exemption form | Official |
| 05 | dlcp_2026_amendment_proposal | Mayor/DLCP, March 13, 2026 | Official, PROPOSED (not law) |
| 06 | dc_otr_transient_lodging_tax | DC Office of Tax and Revenue | Official |
| 07 | irs_topic_415_renting_residential_and_vacation_property | IRS | Official (federal) |
| 09 | airbnb_service_fees_for_hosts | Airbnb Help Center 384 | Platform policy |
| 10 | airbnb_aircover_for_hosts | Airbnb Help Center 3733 | Platform program |
| 11 | airbnb_dc_tax_collection | Airbnb Help Center 2300 | Platform guidance |
| 12 | airroi_dc_market_report | AirROI | Commercial estimates |
| 13 | dc_penalties_interest_and_liens | DC Code § 30-201.10, § 30-201.09; DC Dept. of Buildings | Official |

File 08 (Airbnb's DC local-rules article, Help Center 863) is **excluded on purpose**. It is outdated and everything useful in it is covered by official sources. The assistant must not use it.

## Settled answers (confirmed by the project team)
| Topic | Answer | Source |
|---|---|---|
| License fee | **$99 for two years** | DLCP current page (01) |
| Liability insurance | **At least $250,000** (platform or insurer) | DLCP (01) |
| Penalties | $500 first, $2,000 second, $6,000 + license revocation third; booking services $1,000 per violating transaction | DC Code § 30-201.10 (13) |
| Interest and liens on unpaid fines | Interest 1.5% per month starting 30 days after the fine; lien on the property; delinquent after 180 days | DC civil-fine law as published by DOB (13); confirm specifics with DLCP |
| Lodging tax | 15.95% through September 30, 2027, collected by Airbnb | OTR (06), Airbnb (11) |
| Agency | DLCP (formerly DCRA) | 01 |

## Which source wins when they disagree
1. DC rules: **01 (DLCP web page)** > 03 and 13 (statute) > 02 (older PDF).
2. Taxes: **06 (OTR)** for rates; 11 for how Airbnb collects; 07 for federal income tax.
3. Fees and protection: 09 and 10.
4. Market figures: 12 (estimates). The app's own listing data and calculations come first for any earnings estimate.
5. 05 is a proposal: always label it as not yet law.

## Notes for the RAG build
- Ingest the URLs marked `yes` in `sources.csv`. Add `04a` (the full 14 DCMR Chapter 99 regulations) if you want regulation-level detail; it is not summarized here.
- Store each chunk with its source URL, publisher, authority and retrieval date so answers can cite the source and say how current it is.
- File 11 was built from an auto-translated Airbnb page; ingest the English page instead.
- Not included on purpose: listing-level data (the app's JSON) and the app's calculations, which the assistant reaches through code, not documents.
