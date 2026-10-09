-- Reference data for the order workbook template: the catalogue as the objects are allowed to name it.
--
-- Only active records are exported. A retired product must not appear in a dropdown, or someone would order
-- against it again; what a retired name used to mean is carried by "ProductAliases" instead, for the import
-- to resolve when an older workbook arrives.
--
-- Run inside the database container and copy the files out:
--   docker exec -u postgres baxorders-db-1 psql -q -d baxorders -f export-reference.sql
--
-- The product list carries its category path so the template can fill «Ana/Orta/Alt kateqoriya» itself and
-- nobody has to type a category. The path is read upwards from the product's own category: a product filed
-- three levels deep yields all three, one filed at the root yields only «Ana kateqoriya».
\copy (with tree as (select c."Id", c."Name", c."ParentId" from "Categories" c), path as (select p."Id" as pid, p."Name" as product, c3."Name" as lvl3, c2."Name" as lvl2, c1."Name" as lvl1 from "Products" p left join tree c3 on c3."Id" = p."CategoryId" left join tree c2 on c2."Id" = c3."ParentId" left join tree c1 on c1."Id" = c2."ParentId" where p."IsActive") select product, coalesce(case when lvl1 is not null then lvl1 when lvl2 is not null then lvl2 else lvl3 end,'') as ana, coalesce(case when lvl1 is not null then lvl2 when lvl2 is not null then lvl3 else '' end,'') as orta, coalesce(case when lvl1 is not null then lvl3 else '' end,'') as alt from path order by product) to '/tmp/ref-prod.csv' with (format csv, header true)

\copy (select "Name" from "Locations" where "IsActive" order by "Name") to '/tmp/ref-loc.csv' with (format csv, header true)
\copy (select "Name" from "Suppliers" where "IsActive" order by "Name") to '/tmp/ref-sup.csv' with (format csv, header true)
\copy (select "Name" from "ResponsiblePeople" where "IsActive" order by "Name") to '/tmp/ref-resp.csv' with (format csv, header true)

-- Units are offered by their full name. The import matches a unit by its code, its name, its symbol or any
-- registered alias, so «Kiloqram» resolves exactly as «kq» does, and reads unambiguously in a dropdown.
\copy (select "Name" from "UnitsOfMeasure" where "IsActive" order by "Name") to '/tmp/ref-unit.csv' with (format csv, header true)
