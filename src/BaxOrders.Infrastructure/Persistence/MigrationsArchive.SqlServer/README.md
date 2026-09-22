# SQL Server migration history (archived, not compiled)

These are the eleven migrations that built the SQL Server database through Tasks 1–9B, kept for archaeology:
they are the record of how each column and constraint came to exist, and the commit that introduced each one
explains why.

They are **excluded from compilation** (see the `Compile Remove` in the project file) and EF Core never sees
them. Applying them to PostgreSQL would fail — they carry SQL Server types and annotations (`rowversion`,
`nvarchar`, `datetime2`, `NEXT VALUE FOR`) — and rewriting them to pretend they were always PostgreSQL would
be a lie about what happened.

PostgreSQL starts from one baseline migration, `InitialPostgres`, generated from the accepted model as it
stood at the end of Task 9B. Task 9C moved the Development data across with a one-time transfer; see
`tools/BaxOrders.DataTransfer`.
