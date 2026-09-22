namespace BaxOrders.IntegrationTests;

/// <summary>
/// All SQL Server tests share one throw-away database and run serially: the fixture drops and recreates the
/// database, which must not happen concurrently from several test classes.
/// </summary>
[CollectionDefinition(Name)]
public sealed class SqlServerCollection : ICollectionFixture<SqlServerDatabaseFixture>
{
    public const string Name = "SqlServer";
}
