namespace BaxOrders.IntegrationTests;

/// <summary>
/// A fact that runs only when a test SQL Server is configured, so the default test run needs no database.
/// </summary>
public sealed class SqlServerFactAttribute : FactAttribute
{
    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(SqlServerDatabaseFixture.ConnectionString))
        {
            Skip = $"Set {SqlServerDatabaseFixture.ConnectionStringVariable} to a SQL Server database whose name ends with _Test.";
        }
    }
}
