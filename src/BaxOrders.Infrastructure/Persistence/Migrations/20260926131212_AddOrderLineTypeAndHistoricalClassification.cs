using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderLineTypeAndHistoricalClassification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OrderLineType",
                table: "OrderRequestItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Unclassified");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_OrderRequestId_OrderLineType",
                table: "OrderRequestItems",
                columns: new[] { "OrderRequestId", "OrderLineType" });

            // ================================================================================================
            // Historical classification, from the corrected workbook the business confirmed as authoritative
            // ("Aylıq" sheet, 25.08.2026). Every line below only ever UPDATEs: no request and no item is
            // created, and no Original* provenance is touched. What the imported file said stays what it said.
            //
            // The workbook is the same 3618 historical lines re-exported with a classification column added.
            // Its row numbers run one behind the import's from row 3035 on, because it holds one August line
            // fewer. So a line is identified by the pair (item id, source row number), never by row number
            // alone: the two are never equal in this data, which makes the pair a two-key check. On any other
            // database the pairs match nothing and these statements do nothing.
            // ================================================================================================

            // ---- 1. September 2026 -----------------------------------------------------------------------
            //
            // The business states every September line is monthly material. That is taken by period, not from
            // the workbook, precisely because September is where the row numbers have drifted. The period is
            // unambiguous: 24 requests, 480 lines, and the workbook holds 480 September rows to match.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Monthly'
                FROM "OrderRequests" o
                WHERE o."Id" = i."OrderRequestId"
                  AND o."RequestPeriod" = DATE '2026-09-01';
                """);

            // ---- 2. January-August: the lines ordered on top of the monthly plan -------------------------
            //
            // 322 lines the workbook marks "Aylıqdan kənar". Listed one by one because the classification is
            // a statement about each line; there is no rule that produces it, and inventing one would be a
            // guess dressed up as logic.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'OutsideMonthly'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND (i."Id", r."RowNumber") IN (
                      (10, 81), (11, 82), (35, 64), (36, 65), (37, 66), (38, 67),
                      (39, 68), (40, 69), (41, 70), (42, 71), (43, 72), (80, 39),
                      (185, 240), (186, 241), (187, 242), (196, 118), (197, 119), (198, 120),
                      (199, 121), (200, 122), (201, 123), (202, 124), (203, 125), (204, 126),
                      (205, 127), (206, 128), (256, 162), (262, 474), (325, 571), (326, 572),
                      (390, 521), (391, 522), (392, 523), (393, 524), (394, 525), (475, 421),
                      (476, 422), (477, 423), (478, 424), (479, 425), (480, 426), (481, 427),
                      (482, 428), (483, 429), (484, 430), (485, 431), (486, 432), (487, 433),
                      (488, 434), (489, 435), (567, 336), (568, 337), (569, 338), (570, 339),
                      (571, 340), (572, 341), (573, 342), (574, 343), (575, 344), (576, 345),
                      (627, 617), (628, 618), (629, 619), (868, 807), (869, 808), (870, 809),
                      (871, 810), (872, 811), (873, 812), (874, 813), (875, 814), (876, 815),
                      (877, 816), (878, 817), (879, 818), (880, 819), (881, 820), (882, 821),
                      (883, 822), (1172, 1369), (1173, 1370), (1188, 1525), (1189, 1526), (1328, 1273),
                      (1329, 1274), (1330, 1275), (1331, 1276), (1332, 1277), (1333, 1278), (1334, 1279),
                      (1335, 1280), (1336, 1281), (1337, 1282), (1338, 1283), (1339, 1284), (1340, 1285),
                      (1341, 1286), (1342, 1287), (1343, 1288), (1418, 1181), (1419, 1182), (1420, 1183),
                      (1482, 1490), (1495, 1383), (1496, 1384), (1497, 1385), (1498, 1386), (1499, 1387),
                      (1500, 1388), (1501, 1389), (1550, 1445), (1551, 1446), (1552, 1447), (1645, 1822),
                      (1646, 1823), (1647, 1824), (1680, 1929), (1681, 1930), (1682, 1931), (1687, 1873),
                      (1688, 1874), (1689, 1875), (1754, 1867), (1755, 1868), (1756, 1869), (1834, 1772),
                      (1835, 1773), (1836, 1774), (1837, 1775), (1838, 1776), (1903, 1660), (1904, 1661),
                      (1905, 1662), (1906, 1663), (1907, 1664), (1908, 1665), (1933, 1690), (1934, 1691),
                      (1935, 1692), (1936, 1693), (1937, 1694), (1938, 1695), (1955, 2078), (2005, 2089),
                      (2006, 2090), (2027, 1895), (2028, 1896), (2029, 1897), (2030, 2107), (2040, 1949),
                      (2041, 1950), (2042, 1951), (2087, 2006), (2088, 2007), (2089, 2008), (2090, 2009),
                      (2109, 1969), (2110, 1970), (2128, 2343), (2129, 2344), (2130, 2345), (2397, 2303),
                      (2398, 2304), (2399, 2305), (2400, 2306), (2401, 2307), (2402, 2308), (2403, 2309),
                      (2404, 2310), (2405, 2311), (2406, 2312), (2409, 2315), (2410, 2316), (2411, 2317),
                      (2412, 2318), (2413, 2319), (2414, 2320), (2415, 2321), (2416, 2322), (2417, 2323),
                      (2418, 2324), (2419, 2325), (2420, 2326), (2421, 2327), (2422, 2328), (2423, 2329),
                      (2424, 2330), (2425, 2331), (2519, 2211), (2520, 2212), (2521, 2213), (2522, 2214),
                      (2523, 2215), (2524, 2216), (2525, 2217), (2526, 2218), (2527, 2219), (2528, 2220),
                      (2529, 2221), (2530, 2222), (2531, 2223), (2582, 2548), (2583, 2549), (2584, 2550),
                      (2585, 2551), (2586, 2552), (2587, 2553), (2588, 2554), (2589, 2555), (2590, 2556),
                      (2591, 2557), (2592, 2558), (2593, 2559), (2594, 2560), (2688, 2567), (2689, 2568),
                      (2690, 2569), (2691, 2570), (2703, 2643), (2704, 2712), (2795, 2347), (2796, 2348),
                      (2797, 2349), (2801, 3088), (2802, 3089), (2803, 3090), (2804, 3091), (2808, 2958),
                      (2809, 2959), (2810, 2960), (2811, 2961), (2815, 2931), (2816, 2932), (2817, 2933),
                      (2818, 2934), (2823, 3101), (2824, 3102), (2825, 3103), (2826, 3104), (2832, 2822),
                      (2833, 2823), (2834, 2824), (2835, 2825), (2840, 2805), (2841, 2806), (2842, 2807),
                      (2843, 2808), (2851, 2910), (2852, 2911), (2853, 2912), (2854, 2913), (2871, 3120),
                      (2872, 3121), (2873, 3122), (2874, 3123), (2918, 3078), (2919, 3079), (2920, 3080),
                      (2922, 3082), (2923, 3083), (2924, 3084), (2925, 3085), (2960, 3007), (2984, 3031),
                      (2985, 3032), (2986, 3033), (2987, 3034), (2993, 2872), (2994, 2873), (2995, 2874),
                      (2996, 2875), (3005, 2942), (3006, 2943), (3007, 2944), (3008, 2945), (3014, 2966),
                      (3015, 2967), (3016, 2968), (3017, 2969), (3022, 2829), (3023, 2830), (3024, 2831),
                      (3025, 2832), (3048, 2881), (3051, 2884), (3052, 2885), (3053, 2886), (3054, 2887),
                      (3055, 2888), (3056, 2889), (3057, 2890), (3058, 2891), (3059, 2892), (3066, 2951),
                      (3067, 2952), (3068, 2953), (3069, 2954), (3076, 2814), (3077, 2815), (3078, 2816),
                      (3079, 2817), (3081, 3124), (3085, 2924), (3086, 2925), (3087, 2926), (3088, 2927),
                      (3090, 2971), (3091, 2972), (3092, 2973), (3093, 2974), (3108, 2847), (3109, 2848),
                      (3110, 2849), (3111, 2850), (3128, 2866), (3129, 2867), (3130, 2868), (3131, 2869),
                      (3134, 3093), (3135, 3094), (3136, 3095), (3137, 3096)
                  );
                """);

            // ---- 3. January-August: the rest of the monthly plan ------------------------------------------
            //
            // Everything else in those months is monthly material - except the 51 lines below, which the
            // workbook renamed the product on ("Cod şotka" to "Cod fırça", "Laqonda daşı dəmir üçün" to
            // "Laqonda daşı metal üçün", and so on). A renamed line cannot be matched to its source row with
            // confidence, so it is left Unclassified rather than counted into a figure on a guess. Whether
            // those renames are corrections at all is still with the business.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Monthly'
                FROM "OrderRequests" o, "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE o."Id" = i."OrderRequestId"
                  AND m."OrderRequestItemId" = i."Id"
                  AND o."RequestPeriod" < DATE '2026-09-01'
                  AND i."OrderLineType" = 'Unclassified'
                  AND (i."Id", r."RowNumber") NOT IN (
                      (97, 247), (117, 172), (142, 197), (236, 142), (275, 448), (373, 504),
                      (422, 368), (425, 371), (533, 302), (594, 584), (821, 760), (1007, 1060),
                      (1091, 999), (1122, 1539), (1136, 1300), (1249, 1194), (1256, 1201), (1257, 1202),
                      (1286, 1231), (1288, 1233), (1378, 1141), (1463, 1503), (1464, 1504), (1465, 1505),
                      (1547, 1442), (1557, 1452), (1558, 1453), (1658, 1907), (1737, 1850), (1792, 1730),
                      (1896, 1653), (1988, 2035), (2344, 2250), (2345, 2251), (2346, 2252), (2407, 2313),
                      (2408, 2314), (2509, 2201), (2855, 3136), (2862, 3111), (2863, 3112), (2875, 3129),
                      (2885, 3045), (2907, 3067), (2908, 3068), (2926, 3130), (2988, 3035), (3018, 3134),
                      (3042, 2920), (3070, 3137), (3132, 3139)
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The classification lives only in this column, so dropping it takes the backfill with it.
            migrationBuilder.DropIndex(
                name: "IX_OrderRequestItems_OrderRequestId_OrderLineType",
                table: "OrderRequestItems");

            migrationBuilder.DropColumn(
                name: "OrderLineType",
                table: "OrderRequestItems");
        }
    }
}
