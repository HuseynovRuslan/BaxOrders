-- Reference data for the order workbook template: the catalogue as the objects are allowed to name it.
--
-- Only active records are exported. A retired product must not appear in a dropdown, or someone would order
-- against it again; what a retired name used to mean is carried by "ProductAliases" instead, for the import
-- to resolve when an older workbook arrives.
--
-- Run inside the database container and copy the files out:
--   docker exec -u postgres baxorders-db-1 psql -q -d baxorders -f export-reference.sql
--
-- One row per orderable variant. The workbook offers these as a single choice, so what a person picks
-- settles the product, the size, its unit, the model code and the order unit at once and none of them can
-- be typed. A variant whose product is retired is left out: nothing retired may be ordered again, and what
-- a retired name used to mean is carried by "ProductAliases" for the import to resolve when an older
-- workbook arrives.
--
-- Units come out by both code and name: the short code reads well inside the choice («115 MM»), the full
-- name goes into the «Vahid» and «Ö/v» columns the import reads. A variant may carry a descriptor instead of
-- a unit («16 lik», «28 diş»); that word belongs in the same «Vahid» column, which is where the import reads
-- a non-unit word as a descriptor.
\copy (select p."Name" as product, coalesce(v."SpecificationValue",'') as spec, coalesce(su."Code",'') as spec_unit_code, coalesce(su."Name",'') as spec_unit_name, coalesce(v."SpecificationDescriptor",'') as descriptor, coalesce(v."ModelCode",'') as model, coalesce(ou."Name",'') as order_unit from "ProductVariants" v join "Products" p on p."Id" = v."ProductId" left join "UnitsOfMeasure" su on su."Id" = v."SpecificationUnitId" left join "UnitsOfMeasure" ou on ou."Id" = v."OrderUnitId" where v."IsActive" and p."IsActive" order by p."Name", v."SpecificationValue" nulls first, v."ModelCode" nulls first) to '/tmp/ref-variant.csv' with (format csv, header true)

\copy (select "Name" from "Locations" where "IsActive" order by "Name") to '/tmp/ref-loc.csv' with (format csv, header true)
\copy (select "Name" from "Suppliers" where "IsActive" order by "Name") to '/tmp/ref-sup.csv' with (format csv, header true)
\copy (select "Name" from "ResponsiblePeople" where "IsActive" order by "Name") to '/tmp/ref-resp.csv' with (format csv, header true)
